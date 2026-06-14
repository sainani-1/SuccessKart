import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100_000) {
        req.destroy();
        reject(new Error('Request body is too large.'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    const { messages, userId } = await readBody(req);

    if (!userId) {
      return json(res, 400, { error: 'userId is required' });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return json(res, 400, { error: 'messages array is required' });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return json(res, 500, {
        error: 'Server configuration error',
        detail: !SUPABASE_URL ? 'SUPABASE_URL not set' : 'SUPABASE_SERVICE_ROLE_KEY not set',
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['ai_grok_api_key', 'ai_rate_limit_per_minute', 'ai_rate_limit_per_day']);

    if (settingsError) {
      return json(res, 500, { error: 'Failed to read settings', detail: settingsError.message, code: settingsError.code });
    }

    let apiKey = '';
    let rateLimit = 10;
    let dailyLimit = 100;

    for (const row of settingsData || []) {
      if (row.key === 'ai_grok_api_key') apiKey = row.value;
      if (row.key === 'ai_rate_limit_per_minute') rateLimit = parseInt(row.value, 10) || 10;
      if (row.key === 'ai_rate_limit_per_day') dailyLimit = parseInt(row.value, 10) || 100;
    }

    if (!apiKey) {
      return json(res, 503, {
        error: 'AI service not configured. Please contact admin.',
        detail: settingsData && settingsData.length > 0
          ? 'API key setting found but empty'
          : 'No AI settings found in database. Did you run the SQL migration?',
      });
    }

    const { data: rateData, error: rateError } = await supabase
      .from('ai_rate_limits')
      .select('request_count, window_start, daily_count, daily_date')
      .eq('user_id', userId)
      .maybeSingle();

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    let requestCount = 0;
    let windowStart = now;
    let dailyCount = 0;

    if (rateData && !rateError) {
      const windowStartDate = new Date(rateData.window_start);
      const secondsElapsed = (now - windowStartDate) / 1000;

      if (secondsElapsed < 60) {
        if (rateData.request_count >= rateLimit) {
          const retryAfter = Math.ceil(60 - secondsElapsed);
          res.setHeader('Retry-After', String(retryAfter));
          return json(res, 429, {
            error: `Rate limit exceeded. You can send ${rateLimit} requests per minute. Please try again after ${retryAfter} seconds.`,
            retryAfter,
          });
        }
        requestCount = rateData.request_count + 1;
        windowStart = windowStartDate;
      } else {
        requestCount = 1;
        windowStart = now;
      }

      dailyCount = rateData.daily_date === today ? (rateData.daily_count || 0) + 1 : 1;
      if (dailyCount > dailyLimit) {
        return json(res, 429, {
          error: `Daily limit exceeded. You can send ${dailyLimit} requests per day.`,
        });
      }
    } else {
      requestCount = 1;
      windowStart = now;
      dailyCount = 1;
    }

    await supabase.from('ai_rate_limits').upsert(
      {
        user_id: userId,
        request_count: requestCount,
        window_start: windowStart.toISOString(),
        daily_count: dailyCount,
        daily_date: today,
      },
      { onConflict: 'user_id' }
    );

    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        stream: false,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return json(res, 502, { error: `AI service error: ${aiResponse.status}`, detail: errorText });
    }

    const aiData = await aiResponse.json();
    const replyText = aiData?.choices?.[0]?.message?.content || '';

    return json(res, 200, { reply: replyText, remaining: rateLimit - requestCount, dailyRemaining: dailyLimit - dailyCount });
  } catch (error) {
    return json(res, 500, { error: 'Internal server error', details: error.message });
  }
}
