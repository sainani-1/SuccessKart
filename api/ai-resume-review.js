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

const buildResumePrompt = (resumeText, resume, studentNote) => {
  const messages = [
    {
      role: 'system',
      content: `You are an expert resume reviewer and career coach. Analyze the following resume and provide constructive, actionable feedback.

Return your analysis as valid JSON with this exact structure:
{
  "score": <number 0-100>,
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": ["<improvement 1>", "<improvement 2>", ...],
  "detailedFeedback": "<A detailed paragraph of 3-5 sentences with specific actionable advice>"
}

Be honest and critical but encouraging. Score based on: clarity, completeness, impact, formatting, and relevance to the target role.`,
    },
    {
      role: 'user',
      content: resumeText || (resume ? JSON.stringify(resume, null, 2) : 'No resume data provided.'),
    },
  ];

  if (studentNote) {
    messages.push({
      role: 'user',
      content: `The student added this note: "${studentNote}". Please address their specific concerns in your feedback.`,
    });
  }

  return messages;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    const { resumeText, resume, userId, studentNote } = await readBody(req);

    if (!userId) {
      return json(res, 400, { error: 'userId is required' });
    }

    if (!resumeText && (!resume || typeof resume !== 'object')) {
      return json(res, 400, { error: 'resume data is required' });
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

    const messages = buildResumePrompt(resumeText, resume, studentNote);

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
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return json(res, 502, { error: `AI service error: ${aiResponse.status}`, detail: errorText });
    }

    const aiData = await aiResponse.json();
    const replyText = aiData?.choices?.[0]?.message?.content || '';

    let reviewData;
    try {
      const jsonMatch = replyText.match(/\{[\s\S]*\}/);
      reviewData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      // fallback: use raw text
    }

    if (!reviewData || typeof reviewData.score !== 'number') {
      reviewData = {
        score: null,
        strengths: [],
        improvements: [],
        detailedFeedback: replyText,
      };
    }

    return json(res, 200, {
      feedback: reviewData.detailedFeedback || replyText,
      score: reviewData.score,
      strengths: reviewData.strengths || [],
      improvements: reviewData.improvements || [],
      remaining: rateLimit - requestCount,
      dailyRemaining: dailyLimit - dailyCount,
    });
  } catch (error) {
    return json(res, 500, { error: 'Internal server error', details: error.message });
  }
}
