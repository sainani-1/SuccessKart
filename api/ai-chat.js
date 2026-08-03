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

const EDUCATIONAL_KEYWORDS = [
  'study', 'learn', 'education', 'course', 'class', 'lesson', 'tutorial',
  'homework', 'assignment', 'exam', 'test', 'quiz', 'practice', 'teacher',
  'student', 'school', 'college', 'university', 'math', 'science', 'physics',
  'chemistry', 'biology', 'history', 'geography', 'english', 'grammar',
  'vocabulary', 'reading', 'writing', 'programming', 'coding', 'algorithm',
  'data structure', 'machine learning', 'artificial intelligence', 'career',
  'job', 'interview', 'resume', 'skill', 'knowledge', 'explain', 'concept',
  'formula', 'equation', 'theory', 'principle', 'solve', 'calculate',
  'compute', 'derive', 'prove', 'define', 'describe', 'summarize',
  'what is', 'how to', 'why is', 'difference between', 'meaning of',
  'help', 'doubt', 'question', 'answer', 'understand', 'example',
  'physics', 'chemistry', 'biology', 'mathematics', 'computer',
  'engineering', 'medicine', 'law', 'economics', 'commerce',
  'accounting', 'finance', 'marketing', 'management', 'research',
  'thesis', 'paper', 'article', 'book', 'reference', 'citation',
  'bibliography', 'essay', 'report', 'presentation', 'project',
  'internship', 'apprenticeship', 'scholarship', 'fellowship',
  'certificate', 'diploma', 'degree', 'academic', 'curriculum',
  'syllabus', 'lecture', 'seminar', 'workshop', 'training',
  'development', 'growth', 'improvement', 'progress', 'goal',
  'career support', 'guidance', 'mentorship', 'counseling',
  'aptitude', 'reasoning', 'verbal', 'quantitative', 'logical',
  'coding', 'debug', 'compile', 'syntax', 'function', 'variable',
  'loop', 'array', 'object', 'class', 'inheritance', 'polymorphism',
  'encapsulation', 'abstraction', 'database', 'sql', 'query',
  'server', 'client', 'api', 'rest', 'graphql', 'frontend',
  'backend', 'full stack', 'web', 'mobile', 'app', 'software',
  'hardware', 'network', 'security', 'cloud', 'devops', 'agile',
  'scrum', 'git', 'linux', 'command', 'terminal', 'shell',
  'python', 'javascript', 'java', 'c++', 'c#', 'ruby', 'php',
  'swift', 'kotlin', 'go', 'rust', 'typescript', 'html', 'css',
  'react', 'angular', 'vue', 'node', 'django', 'flask', 'spring',
  'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'firebase',
  'tensorflow', 'pytorch', 'nlp', 'computer vision', 'deep learning',
  'data science', 'analytics', 'statistics', 'probability',
  'linear algebra', 'calculus', 'discrete math', 'geometry',
  'algebra', 'trigonometry', 'arithmetic', 'fraction', 'decimal',
  'percentage', 'ratio', 'proportion', 'exponent', 'logarithm',
  'integration', 'differentiation', 'matrix', 'vector', 'set',
  'function', 'graph', 'equation', 'inequality', 'polynomial',
  'quadratic', 'linear', 'differential', 'integral', 'limit',
  'sequence', 'series', 'permutation', 'combination', 'probability',
  'statistics', 'mean', 'median', 'mode', 'variance', 'standard deviation',
  'correlation', 'regression', 'hypothesis', 'distribution',
  'sucesskart', 'sai nani', 'sainani',
  'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon',
  'good evening', 'how are you', 'thanks', 'thank you', 'welcome',
  'please', 'sorry', 'excuse', 'yes', 'no', 'ok', 'okay', 'sure',
  'fine', 'well', 'nice', 'great', 'awesome', 'cool', 'amazing',
  'wonderful', 'fantastic', 'excellent', 'good', 'bad', 'can you',
  'could you', 'would you', 'will you', 'do you', 'are you',
  'i have', 'i am', 'i want', 'i need', 'i would', 'i will',
  'tell me', 'show me', 'give me', 'help me'
];

const NON_EDUCATIONAL_PATTERNS = [
  /(?:how\s+to\s+)?(?:cheat|hack|crack|exploit|bypass|steal|fraud)/i,
  /(?:illegal|unethical|immoral|malicious|harmful|dangerous)/i,
  /(?:adult|porn|erotic|nsfw|sex\s*ual|nudity|explicit)/i,
  /(?:weapon|bomb|explosive|terrorist|attack)/i,
  /(?:drug|narcotic|cocaine|heroin|marijuana|weed|lsd)/i,
  /(?:gambling|betting|casino|lottery)/i,
  /(?:suicide|self[\s-]harm|self[\s-]hurt)/i,
  /(?:hate\s*speech|discriminat|racis|harassment|bully)/i,
  /(?:phishing|scam|spam|ransomware|malware|virus)/i,
  /(?:fake\s*(?:id|identity|document|certificate|degree))/i,
  /(?:plagiaris|copyright\s*infring)/i,
  /(?:password\s*(?:crack|steal|hack|find|recover(?!\s*(?:account|email))))/i,
  /(?:credit\s*card\s*(?:crack|hack|steal|generate|fake))/i,
  /(?:social\s*security\s*number|cvv|pin\s*number)/i,
  /(?:spoof|impersonat(?:e|ion|ing))/i,
  /(?:unauthorized\s*(?:access|entry|login))/i,
];

const SYSTEM_IDENTITY = `You are "SuccessKart AI" — an educational assistant BUILT BY THE SuccessKart TEAM AND TRAINED BY SAINANI. Your purpose is to help students learn by answering academic and career-related questions.

RULES:
1. When introducing yourself or answering "who are you", you MUST ALWAYS say you are "trained by Sainani" or "trained by Sai Nani". NEVER omit this.
2. If a user asks about who created you, tell them: "I am SuccessKart AI, built by the SuccessKart team and trained by Sainani."
3. If you are asked who you are, respond: "I am SuccessKart AI, an educational assistant created by the SuccessKart team and trained by Sainani."
4. Only answer education, learning, and career-related questions.
5. If a user asks anything harmful, unethical, or non-educational (like how to cheat, hack, or inappropriate content), politely decline and redirect to educational topics.
6. Keep responses clear, encouraging, and student-friendly.
7. Use simple language suitable for students.
8. Be concise but helpful.
9. Always maintain a positive and supportive tone.`;

const NISUSE_RESPONSE = "You are not authorized to use other content other than education related. This incident has been reported.";

function detectMisuse(messages) {
  const userMessages = messages
    .filter(m => m.role === 'user')
    .map(m => m.content);
  const combined = userMessages.join(' ');

  for (const pattern of NON_EDUCATIONAL_PATTERNS) {
    if (pattern.test(combined)) {
      return true;
    }
  }

  const wordCount = combined.split(/\s+/).length;
  const eduKeywordCount = EDUCATIONAL_KEYWORDS.reduce((cnt, kw) => {
    return cnt + (combined.toLowerCase().includes(kw) ? 1 : 0);
  }, 0);

  if (wordCount > 30 && eduKeywordCount === 0) {
    return true;
  }

  return false;
}

async function callGrok(messages, apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const isRateLimit = response.status === 429;
    return { ok: false, status: response.status, error: errorText, isRateLimit };
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return { ok: true, text };
}

async function callOpenRouter(messages, apiKey) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://successkart.vercel.app',
      'X-Title': 'SucessKart AI',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages,
      stream: false,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const isRateLimit = response.status === 429;
    return { ok: false, status: response.status, error: errorText, isRateLimit };
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return { ok: true, text };
}

async function callGemini(messages, apiKey) {
  const systemMsg = messages.find(m => m.role === 'system');
  const userMsgs = messages.filter(m => m.role !== 'system');

  const contents = userMsgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body = {
    contents,
    systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
    generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    const isRateLimit = response.status === 429;
    return { ok: false, status: response.status, error: errorText, isRateLimit };
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { ok: true, text };
}

async function callMistral(messages, apiKey) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const isRateLimit = response.status === 429;
    return { ok: false, status: response.status, error: errorText, isRateLimit };
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return { ok: true, text };
}

async function callCerebras(messages, apiKey) {
  const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-oss-120b',
      messages,
      max_completion_tokens: 1024,
      temperature: 0.7,
      top_p: 1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const isRateLimit = response.status === 429;
    return { ok: false, status: response.status, error: errorText, isRateLimit };
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return { ok: true, text };
}

const AI_PROVIDERS = [
  { name: 'grok', keySetting: 'ai_grok_api_key', enabledSetting: 'ai_grok_enabled', call: callGrok },
  { name: 'openrouter', keySetting: 'ai_openrouter_api_key', enabledSetting: 'ai_openrouter_enabled', call: callOpenRouter },
  { name: 'gemini', keySetting: 'ai_gemini_api_key', enabledSetting: 'ai_gemini_enabled', call: callGemini },
  { name: 'cerebras', keySetting: 'ai_cerebras_api_key', enabledSetting: 'ai_cerebras_enabled', call: callCerebras },
  { name: 'mistral', keySetting: 'ai_mistral_api_key', enabledSetting: 'ai_mistral_enabled', call: callMistral },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    const { messages, userId, forceProvider } = await readBody(req);

    if (!userId) {
      return json(res, 400, { error: 'userId is required' });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return json(res, 400, { error: 'messages array is required' });
    }

    const isMisuse = detectMisuse(messages);

    if (isMisuse) {
      if (userId) {
        try {
          const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
          const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
          if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, avatar_url, full_name')
              .eq('id', userId)
              .maybeSingle();

            const lastUserMsg = messages.filter(m => m.role === 'user').pop();
            await supabase.from('ai_misuse_reports').insert({
              user_id: userId,
              email: profile?.email || 'unknown',
              profile_pic: profile?.avatar_url || null,
              full_name: profile?.full_name || null,
              message: lastUserMsg?.content || '',
              detected_at: new Date().toISOString(),
            });
          }
        } catch {
          // Log misuse silently
        }
      }

      return json(res, 200, {
        reply: NISUSE_RESPONSE,
        provider: 'filter',
        remaining: 999,
        dailyRemaining: 999,
        rateLimit: 999,
        dailyLimit: 999,
        isMisuse: true,
      });
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

    const SETTING_KEYS = [
      'ai_grok_api_key', 'ai_grok_enabled',
      'ai_openrouter_api_key', 'ai_openrouter_enabled',
      'ai_gemini_api_key', 'ai_gemini_enabled',
      'ai_cerebras_api_key', 'ai_cerebras_enabled',
      'ai_mistral_api_key', 'ai_mistral_enabled',
      'ai_rate_limit_per_minute', 'ai_rate_limit_per_day',
    ];

    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', SETTING_KEYS);

    if (settingsError) {
      return json(res, 500, {
        error: 'Failed to read settings',
        detail: settingsError.message,
        code: settingsError.code,
        hint: 'Ensure the settings table exists. Run the SQL migration in supabase/20260619_ai_misuse_reports.sql',
      });
    }

    const settingsMap = {};
    for (const row of settingsData || []) {
      settingsMap[row.key] = row.value;
    }

    let rateLimit = parseInt(settingsMap['ai_rate_limit_per_minute'], 10) || 10;
    let dailyLimit = parseInt(settingsMap['ai_rate_limit_per_day'], 10) || 100;

    const { data: overrideData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'user_ai_limits')
      .maybeSingle();

    if (overrideData?.value) {
      try {
        const overrides = JSON.parse(overrideData.value);
        const userOverride = overrides[userId];
        if (userOverride) {
          if (userOverride.minuteLimit) rateLimit = userOverride.minuteLimit;
          if (userOverride.dayLimit) dailyLimit = userOverride.dayLimit;
        }
      } catch {
        // ignore parse errors
      }
    }

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const today = formatter.format(now);
    let requestCount = 1;
    let dailyCount = 1;
    let windowStart = now;

    try {
      const { data: rateData } = await supabase
        .from('ai_rate_limits')
        .select('request_count, window_start, daily_count, daily_date')
        .eq('user_id', userId)
        .maybeSingle();

      if (rateData) {
        const windowStartDate = new Date(rateData.window_start);
        const secondsElapsed = (now - windowStartDate) / 1000;

        dailyCount = rateData.daily_date === today ? (rateData.daily_count || 0) + 1 : 1;
        if (dailyCount > dailyLimit) {
          const midnight = new Date(now);
          midnight.setHours(24, 0, 0, 0);
          const secondsUntilMidnight = Math.ceil((midnight - now) / 1000);
          return json(res, 429, {
            type: 'daily',
            error: 'Daily limit reached. Try again tomorrow.',
            retryAfter: secondsUntilMidnight,
          });
        }

        if (secondsElapsed < 60) {
          if (rateData.request_count >= rateLimit) {
            const retryAfter = Math.ceil(60 - secondsElapsed);
            res.setHeader('Retry-After', String(retryAfter));
            return json(res, 429, {
              type: 'minute',
              error: `Rate limit exceeded. You can send ${rateLimit} requests per minute. Please try again after ${retryAfter} seconds.`,
              retryAfter,
            });
          }
          requestCount = rateData.request_count + 1;
          windowStart = windowStartDate;
        }
      }
    } catch {
      // If ai_rate_limits table read fails, use defaults
    }

    try {
      const { error: upsertErr } = await supabase
        .from('ai_rate_limits')
        .upsert({
          user_id: userId,
          request_count: requestCount,
          window_start: windowStart.toISOString(),
          daily_count: dailyCount,
          daily_date: today,
        });
      if (upsertErr) {
        const { error: insertErr } = await supabase
          .from('ai_rate_limits')
          .insert({
            user_id: userId,
            request_count: requestCount,
            window_start: windowStart.toISOString(),
            daily_count: dailyCount,
            daily_date: today,
          });
        if (insertErr) {
          await supabase
            .from('ai_rate_limits')
            .update({
              request_count: requestCount,
              window_start: windowStart.toISOString(),
              daily_count: dailyCount,
              daily_date: today,
            })
            .eq('user_id', userId);
        }
      }
    } catch {
      // Rate limit tracking unavailable
    }

    const systemMessage = messages.find(m => m.role === 'system');
    const finalMessages = systemMessage
      ? messages
      : [{ role: 'system', content: SYSTEM_IDENTITY }, ...messages];

    const grokKey = settingsMap['ai_grok_api_key'] || '';
    const openrouterKey = settingsMap['ai_openrouter_api_key'] || '';
    const geminiKey = settingsMap['ai_gemini_api_key'] || '';
    const cerebrasKey = settingsMap['ai_cerebras_api_key'] || '';
    const mistralKey = settingsMap['ai_mistral_api_key'] || '';

    const grokEnabled = settingsMap['ai_grok_enabled'] !== 'false';
    const openrouterEnabled = settingsMap['ai_openrouter_enabled'] !== 'false';
    const geminiEnabled = settingsMap['ai_gemini_enabled'] !== 'false';
    const cerebrasEnabled = settingsMap['ai_cerebras_enabled'] !== 'false';
    const mistralEnabled = settingsMap['ai_mistral_enabled'] !== 'false';

    let lastError = null;
    let usedProvider = null;

    // If forceProvider is specified, try only that provider
    if (forceProvider) {
      const forcedProvider = AI_PROVIDERS.find(p => p.name === forceProvider);
      if (forcedProvider) {
        const apiKey = settingsMap[forcedProvider.keySetting] || '';
        const enabled = settingsMap[forcedProvider.enabledSetting] !== 'false';
        if (!apiKey) return json(res, 400, { error: `${forcedProvider.name} API key is not configured. Go to Multi AI Settings to add it.` });
        if (!enabled) return json(res, 400, { error: `${forcedProvider.name} is disabled. Enable it in Multi AI Settings.` });
        try {
          const result = await forcedProvider.call(finalMessages, apiKey);
          if (result.ok) {
            return json(res, 200, {
              reply: result.text,
              provider: forcedProvider.name,
              remaining: 999,
              dailyRemaining: 999,
              rateLimit,
              dailyLimit,
            });
          }
          return json(res, 502, { error: `${forcedProvider.name} error: ${result.status}`, detail: result.error });
        } catch (err) {
          return json(res, 502, { error: `${forcedProvider.name} failed: ${err.message}` });
        }
      }
      return json(res, 400, { error: `Unknown provider: ${forceProvider}` });
    }

    // Try providers in order: Grok -> OpenRouter -> Gemini -> Cerebras -> Mistral
    for (const provider of AI_PROVIDERS) {
      const apiKey = settingsMap[provider.keySetting] || '';
      const enabled = settingsMap[provider.enabledSetting] !== 'false';

      if (!apiKey || !enabled) {
        continue;
      }

      try {
        const result = await provider.call(finalMessages, apiKey);

        if (result.ok) {
          usedProvider = provider.name;
          return json(res, 200, {
            reply: result.text,
            provider: provider.name,
            remaining: rateLimit - requestCount,
            dailyRemaining: dailyLimit - dailyCount,
            rateLimit,
            dailyLimit,
          });
        }

        if (result.isRateLimit) {
          lastError = `${provider.name} rate limited`;
          continue;
        }

        lastError = `${provider.name} error: ${result.status} ${result.error}`;
      } catch (err) {
        lastError = `${provider.name} failed: ${err.message}`;
        continue;
      }
    }

    return json(res, 503, {
      error: 'All AI services are currently unavailable.',
      detail: lastError || 'No AI providers configured.',
    });
  } catch (error) {
    return json(res, 500, { error: 'Internal server error', details: error.message });
  }
}
