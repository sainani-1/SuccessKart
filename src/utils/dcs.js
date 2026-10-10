import { supabase } from '../supabaseClient';
import { executeJudge0Code } from './judge0';
import { FALLBACK_POOL, buildPoolQuestion, TOTAL_TEST_COUNT, VISIBLE_TEST_COUNT, HIDDEN_TEST_COUNT } from './dcsPool';

export const BADGE_THRESHOLDS = [10, 25, 50, 100, 150, 300, 600, 900];
export const ULTIMATE_BADGE_DAYS = 900;

export const BADGE_LABELS = {
  10: '10 Day Streak',
  25: '25 Day Streak',
  50: '50 Day Streak',
  100: '100 Day Streak',
  150: '150 Day Streak',
  300: '300 Day Streak',
  600: '600 Day Streak',
  900: 'Ultimate Streak',
};

export const DCS_DIFFICULTIES = [
  { key: 'easy', label: 'Easy', count: 4, points: 10 },
  { key: 'medium', label: 'Medium', count: 3, points: 20 },
  { key: 'hard', label: 'Hard', count: 3, points: 40 },
];

export const CONTEST_STATUSES = ['scheduled', 'generating', 'ready', 'live', 'ended'];

export const todayKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const keyToDate = (key) => {
  const [y, m, d] = String(key || '').split('-').map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
};

export const diffDays = (fromKey, toKey) =>
  Math.round((keyToDate(toKey) - keyToDate(fromKey)) / 86400000);

export const badgesForStreak = (streak = 0) =>
  BADGE_THRESHOLDS.filter((threshold) => Number(streak || 0) >= threshold);

export const normalizeAnswer = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

export const pointsForDifficulty = (difficulty) =>
  DCS_DIFFICULTIES.find((d) => d.key === difficulty)?.points || 10;

export const scoreAnswers = (questions = [], answers = {}) =>
  questions.reduce((total, question) => {
    const given = answers?.[question.id];
    if (given === undefined || given === null || String(given).trim() === '') return total;
    if (normalizeAnswer(given) === normalizeAnswer(question.expected_answer)) {
      return total + pointsForDifficulty(question.difficulty);
    }
    return total;
  }, 0);

// Score for code submissions: a question only earns points when its submitted
// solution passed every visible and hidden test case.
export const scoreFromJudgeResults = (questions = [], testResults = []) => {
  const passed = new Set(
    (testResults || [])
      .filter((result) => result && result.accepted)
      .map((result) => String(result.questionId))
  );
  return questions.reduce(
    (total, question) => (passed.has(String(question.id)) ? total + pointsForDifficulty(question.difficulty) : total),
    0
  );
};

export const fetchStreak = async (userId) => {
  if (!userId) return null;
  const { data } = await supabase
    .from('dcs_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return null;
  const yesterday = todayKey(new Date(Date.now() - 86400000));
  if (data.last_activity_date && data.last_activity_date < yesterday && Number(data.current_streak || 0) > 0) {
    const reset = { ...data, current_streak: 0, badges: [], updated_at: new Date().toISOString() };
    await supabase.from('dcs_streaks').upsert(reset, { onConflict: 'user_id' });
    return reset;
  }
  return data;
};

export const bumpStreakForAttempt = async (userId, activityKey = todayKey()) => {
  if (!userId) return null;
  const current = await fetchStreak(userId);
  const lastKey = current?.last_activity_date || null;

  if (lastKey === activityKey) return current;

  const consecutive = lastKey && diffDays(lastKey, activityKey) === 1;
  const nextCurrent = consecutive ? Number(current.current_streak || 0) + 1 : 1;
  const nextLongest = Math.max(Number(current?.longest_streak || 0), nextCurrent);
  const next = {
    user_id: userId,
    current_streak: nextCurrent,
    longest_streak: nextLongest,
    last_activity_date: activityKey,
    badges: badgesForStreak(nextCurrent),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('dcs_streaks').upsert(next, { onConflict: 'user_id' });
  if (error) return current;
  return next;
};

const fetchQuestionsForContest = async (contestId) => {
  const { data } = await supabase
    .from('dcs_questions')
    .select('id, contest_id, difficulty, position, title, description, sample_input, sample_output, expected_answer, constraints, source, test_cases, input_format, output_format, starter_code, topics, hints, examples, companies')
    .eq('contest_id', contestId)
    .order('position', { ascending: true });
  return data || [];
};

export const fetchPublicQuestions = async (contestId) => {
  const questions = await fetchQuestionsForContest(contestId);
  return questions.map(({ expected_answer, test_cases, ...question }) => ({
    ...question,
    test_cases: (Array.isArray(test_cases) ? test_cases : []).map((test) => (
      test?.hidden
        ? { hidden: true }
        : { input: test.input || '', output: test.output || '', hidden: false }
    )),
  }));
};

// Some older question rows were written with contest noise baked into the
// title, for example "Sum of Digits · Daily 735". The suffix is stripped for
// display everywhere, while the stored value is only cleaned up by the admin.
export const cleanProblemTitle = (title) =>
  String(title || '')
    .replace(/\s*(?:·|–|—|:-|:|-{2,})\s*Daily\s*\d*\s*$/i, '')
    .trim();

// The curated question pool lives in ./dcsPool. Every entry builds its own
// visible and hidden test cases so the sample always matches the expected output.

const extractJsonArray = (text) => {
  if (!text) return null;
  let cleaned = String(text).trim();
  cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

// Filler phrases the model produces when it does not really understand the
// problem it just wrote. A question containing any of them is discarded.
const FILLER_PATTERNS = [
  /submit only the final answer/i,
  /deterministic output for the supplied example/i,
  /supplied example/i,
  /compute the correct/i,
  /correct deterministic output/i,
];

// True when a statement was generated without really understanding the
// problem (the model wrote placeholder expectations). Used by generation
// validation and by the admin repair pass that rebuilds such questions.
export const hasFillerContent = (text) =>
  FILLER_PATTERNS.some((pattern) => pattern.test(String(text || '')));

const asStringArray = (value) =>
  Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];

// Structural validation of one AI generated question. Returns a clean question
// row or null when the model produced something unusable.
const normalizeGeneratedQuestion = (item) => {
  if (!item || typeof item !== 'object') return null;

  const title = String(item.title || '').trim();
  const description = String(item.description || '').trim();
  const constraints = String(item.constraints || '').trim();
  if (title.length < 3 || title.length > 120) return null;
  if (description.length < 60) return null;
  if (FILLER_PATTERNS.some((pattern) => pattern.test(description))) return null;
  if (!constraints) return null;

  const examples = (Array.isArray(item.examples) ? item.examples : [])
    .map((example) => ({
      input: String(example?.input ?? '').trim(),
      output: String(example?.output ?? '').trim(),
      explanation: String(example?.explanation ?? '').trim(),
    }))
    .filter((example) => example.output);
  if (!examples.length) return null;

  const sampleInput = item.sample_input !== undefined ? String(item.sample_input).trim() : examples[0].input;
  const sampleOutput = item.sample_output !== undefined ? String(item.sample_output).trim() : examples[0].output;
  if (!sampleOutput) return null;
  if (sampleInput !== examples[0].input || sampleOutput !== examples[0].output) return null;

  const topics = asStringArray(item.topics);
  if (!topics.length) return null;

  const tests = (Array.isArray(item.tests) ? item.tests : []).map((test) => ({
    input: String(test?.input ?? '').trim(),
    output: String(test?.output ?? '').trim(),
  }));
  if (tests.length < TOTAL_TEST_COUNT) return null;
  if (tests.some((test) => !test.output)) return null;

  const distinctInputs = new Set(tests.filter((test) => test.input).map((test) => test.input));
  if (distinctInputs.size > 0 && distinctInputs.size < 10) return null;

  const referenceSolution = String(item.referenceSolution || '').trim();
  if (!referenceSolution) return null;

  // The sample is always the first test the student sees.
  const sampleCase = { input: sampleInput, output: sampleOutput };
  const otherCases = tests.filter((test) => test.input !== sampleCase.input || test.output !== sampleCase.output);
  const finalTests = [sampleCase, ...otherCases].slice(0, TOTAL_TEST_COUNT);
  if (finalTests.length < TOTAL_TEST_COUNT) return null;

  return {
    title,
    description,
    constraints,
    topics,
    hints: asStringArray(item.hints),
    companies: asStringArray(item.companies),
    examples: examples.slice(0, 3),
    sample_input: sampleInput,
    sample_output: sampleOutput,
    expected_answer: sampleOutput,
    input_format: String(item.input_format || '').trim(),
    output_format: String(item.output_format || '').trim(),
    tests: finalTests,
    referenceSolution,
    source: 'ai',
  };
};

// Runs the generator's own reference solution against a sample of its test
// cases. Any mismatch means the model wrote inconsistent expectations. The
// cloud judge is tried first; when it is unavailable the browser backup runner
// validates the sample so question generation still produces correct data.
const validateWithJudge = async (question) => {
  const probes = [
    question.tests[0],
    question.tests[Math.floor(TOTAL_TEST_COUNT / 2)],
    question.tests[TOTAL_TEST_COUNT - 1],
  ].filter(Boolean);
  try {
    const { data, error } = await supabase.functions.invoke('dcs-judge', {
      body: { mode: 'validate', referenceSolution: question.referenceSolution, tests: probes },
    });
    if (error || data?.error) throw new Error('cloud validator unavailable');
    return Array.isArray(data?.mismatches) && data.mismatches.length === 0;
  } catch {
    try {
      for (const probe of probes) {
        const execution = await executeJudge0Code({
          language: 'python',
          sourceCode: question.referenceSolution,
          stdin: String(probe?.input ?? ''),
        });
        const actual = String(execution.stdout ?? '').trim();
        const expected = String(probe?.output ?? '').trim();
        if (execution.stderr || actual !== expected) return false;
      }
      return true;
    } catch {
      return false;
    }
  }
};

const generateWithAi = async (userId, difficulty, count) => {
  try {
    const response = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        messages: [
          {
            role: 'system',
            content:
              'You generate LeetCode style coding contest questions. Reply ONLY with a valid JSON array. No markdown, no commentary.',
          },
          {
            role: 'user',
            content: `Generate exactly ${count} ${difficulty} coding contest questions for a daily coding streak. Reply with ONLY a JSON array. Every item must contain these keys:
- "title": short problem title.
- "description": a complete LeetCode style statement: what to compute, then the input format, then the output format, then a short worked example. Never mention submitting answers, "final answer" or "deterministic output".
- "topics": 2 to 4 topic tags, for example ["Array","Hash Table"].
- "hints": 1 to 3 short progressive hints.
- "examples": 2 to 3 objects with "input", "output" and "explanation". examples[0] must be the sample.
- "constraints": one line of constraints.
- "companies": 0 to 3 company names, or an empty array.
- "sample_input": the exact standard input for examples[0].
- "sample_output": the exact standard output for examples[0].
- "expected_answer": same value as sample_output.
- "input_format" and "output_format": one line each.
- "referenceSolution": a complete Python program that reads standard input, solves the problem and writes the answer to standard output.
- "tests": exactly 41 objects with "input" and "output". They must be at least 10 different inputs (or all empty when the problem takes no input) and every "output" must be exactly what referenceSolution prints for that input. The first 6 tests are shown to students, the other 35 stay hidden.
The sample_output must be the TRUE mathematical answer for its sample_input — actually work out the answer for the specific numbers in the sample and put that result, never a placeholder. Every problem must be a real coding problem where a program computes the answer directly from the standard input. NEVER generate output-prediction puzzles such as "what does this code print" or "submit the final answer" style questions.
Keep every problem deterministic, efficiently solvable and small enough to run quickly.`,
          },
        ],
      }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    const items = extractJsonArray(data?.reply);
    if (!items?.length) return [];
    const normalized = items.slice(0, count).map(normalizeGeneratedQuestion).filter(Boolean);
    if (!normalized.length) return [];
    const checked = await Promise.all(
      normalized.map(async (question) => ((await validateWithJudge(question)) ? question : null))
    );
    return checked.filter(Boolean).map((question) => ({
      ...question,
      test_cases: question.tests.map((test, index) => ({ ...test, hidden: index >= VISIBLE_TEST_COUNT })),
    }));
  } catch {
    return [];
  }
};

// Picks questions from the curated pool. The pick is rotated deterministically
// by the contest's day number and skips titles that were already used in the
// recent contests, so consecutive days do not generate the same problems.
const generateFromPool = (difficulty, count, daySeed = 0, excludeTitles = null) => {
  const full = [...(FALLBACK_POOL[difficulty] || [])];
  if (!full.length || count <= 0) return [];
  const offset = ((daySeed % full.length) + full.length) % full.length;
  const rotated = [...full.slice(offset), ...full.slice(0, offset)];
  const excluded = excludeTitles && excludeTitles.size
    ? new Set(
        full
          .map((entry) => cleanProblemTitle(entry.title).toLowerCase())
          .filter((title) => excludeTitles.has(title))
      )
    : new Set();
  const fresh = rotated.filter((entry) => !excluded.has(cleanProblemTitle(entry.title).toLowerCase()));
  // When the recent-title exclusion leaves too few entries, fill the remaining
  // slots with the rest of the pool (rotation order) instead of random repeats.
  const candidates = fresh.length >= count ? fresh : [...fresh, ...rotated.filter((entry) => !fresh.includes(entry))];
  const picked = [];
  while (picked.length < count && candidates.length) {
    picked.push(buildPoolQuestion(candidates[picked.length]));
  }
  return picked;
};

// Titles used by the contests of the last `days` days (excluding the current
// one) so the generator can avoid repeating the same problems every day.
const fetchRecentTitles = async (contestId, days = 10) => {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const { data: recentContests } = await supabase
      .from('dcs_contests')
      .select('id')
      .gte('contest_date', since)
      .neq('id', contestId)
      .limit(30);
    const ids = (recentContests || []).map((contest) => contest.id);
    if (!ids.length) return new Set();
    const { data: recentQuestions } = await supabase
      .from('dcs_questions')
      .select('title')
      .in('contest_id', ids)
      .limit(400);
    return new Set(
      (recentQuestions || [])
        .map((question) => cleanProblemTitle(question.title).toLowerCase())
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
};

// Curated pool questions indexed by cleaned title so the repair pass can rebuild
// rows whose statement was written as filler (for example old "Sum of Digits"
// rows whose sample output was the placeholder 5152).
const POOL_BY_TITLE = new Map();
Object.values(FALLBACK_POOL).forEach((entries) =>
  (entries || []).forEach((entry) => {
    const key = cleanProblemTitle(entry.title).toLowerCase();
    if (key && !POOL_BY_TITLE.has(key)) POOL_BY_TITLE.set(key, entry);
  })
);

// Shared repair pass: rebuilds pool-matched filler questions from the curated
// pool, backfills missing test cases and cleans contest noise out of titles.
// Best-effort: throws are swallowed by the caller-facing helpers so students
// and the scheduler never fail because of a repair hiccup.
const repairQuestionRows = async (rows) => {
  let fixed = 0;
  let rebuilt = 0;
  const updatedById = new Map();
  for (const question of rows) {
    const cleanTitle = cleanProblemTitle(question.title);
    const patch = {};
    const hasRealTests = (Array.isArray(question.test_cases) ? question.test_cases : []).some(
      (test) => test && typeof test === 'object' && !Array.isArray(test) && !!String(test?.input || '').trim()
    );
    const sampleOutput = String(question.sample_output || '').trim();
    const filler = hasFillerContent(question.description);
    const poolEntry = POOL_BY_TITLE.get(cleanTitle.toLowerCase());

    if (poolEntry && (filler || !hasRealTests || !sampleOutput)) {
      const rebuiltQuestion = buildPoolQuestion(poolEntry);
      const { data, error } = await supabase
        .from('dcs_questions')
        .update({
          ...rebuiltQuestion,
          difficulty: question.difficulty,
          position: question.position,
          source: 'pool',
        })
        .eq('id', question.id)
        .select();
      if (error) throw error;
      rebuilt += 1;
      if (data?.[0]) updatedById.set(question.id, data[0]);
      continue;
    }

    if (!hasRealTests && sampleOutput) {
      const baseTest = {
        input: String(question.sample_input || '').trim(),
        output: sampleOutput,
      };
      patch.test_cases = [
        ...Array.from({ length: VISIBLE_TEST_COUNT }, () => ({ ...baseTest, hidden: false })),
        ...Array.from({ length: HIDDEN_TEST_COUNT }, () => ({ ...baseTest, hidden: true })),
      ];
      fixed += 1;
    }
    if (cleanTitle !== String(question.title || '').trim()) {
      patch.title = cleanTitle;
      fixed += 1;
    }
    if (Object.keys(patch).length) {
      const { data, error } = await supabase
        .from('dcs_questions')
        .update(patch)
        .eq('id', question.id)
        .select();
      if (error) throw error;
      if (data?.[0]) updatedById.set(question.id, data[0]);
    }
  }
  return { fixed, rebuilt, updatedById };
};

// Runs the repair pass on every question of a contest. Called automatically
// after generation and whenever the live contest is fetched, so broken data is
// fixed without the admin having to open the DCS admin page.
export const repairContestQuestions = async (contestId) => {
  if (!contestId) return { fixed: 0, rebuilt: 0 };
  try {
    const questions = await fetchQuestionsForContest(contestId);
    if (!questions.length) return { fixed: 0, rebuilt: 0 };
    return await repairQuestionRows(questions);
  } catch {
    return { fixed: 0, rebuilt: 0 };
  }
};

export const generateQuestionsForContest = async (contestId, userId) => {
  const { data: contestRow } = await supabase
    .from('dcs_contests')
    .select('contest_date')
    .eq('id', contestId)
    .maybeSingle();
  const daySeed = contestRow?.contest_date
    ? Math.floor(Date.parse(`${contestRow.contest_date}T00:00:00Z`) / 86400000)
    : Math.floor(Date.now() / 86400000);
  const recentTitles = await fetchRecentTitles(contestId);

  for (const level of DCS_DIFFICULTIES) {
    const { count } = await supabase
      .from('dcs_questions')
      .select('id', { count: 'exact', head: true })
      .eq('contest_id', contestId)
      .eq('difficulty', level.key);
    const remaining = level.count - Number(count || 0);
    if (remaining <= 0) continue;

    const aiQuestions = await generateWithAi(userId, level.key, remaining);
    const questions = [
      ...aiQuestions,
      ...generateFromPool(
        level.key,
        Math.max(0, remaining - aiQuestions.length),
        daySeed,
        recentTitles
      ),
    ];
    const basePosition = (Number(count || 0) || 0) + 1;
    const rows = questions
      .filter(Boolean)
      .map((question, index) => {
        const testCases =
          Array.isArray(question.test_cases) && question.test_cases.length >= TOTAL_TEST_COUNT
            ? question.test_cases.slice(0, TOTAL_TEST_COUNT)
            : [
                ...Array.from({ length: VISIBLE_TEST_COUNT }, () => ({
                  input: question.sample_input || '',
                  output: question.sample_output || '',
                  hidden: false,
                })),
                ...Array.from({ length: TOTAL_TEST_COUNT - VISIBLE_TEST_COUNT }, () => ({
                  input: question.sample_input || '',
                  output: question.sample_output || '',
                  hidden: true,
                })),
              ];
        return {
          contest_id: contestId,
          difficulty: level.key,
          position: basePosition + index,
          test_cases: testCases,
          topics: Array.isArray(question.topics) ? question.topics : [],
          hints: Array.isArray(question.hints) ? question.hints : [],
          examples: Array.isArray(question.examples) ? question.examples : [],
          companies: Array.isArray(question.companies) ? question.companies : [],
          title: question.title,
          description: question.description,
          sample_input: question.sample_input || '',
          sample_output: question.sample_output || '',
          expected_answer: question.expected_answer || '',
          constraints: question.constraints || '',
          input_format: question.input_format || '',
          output_format: question.output_format || '',
          source: question.source || 'ai',
        };
      });
    if (!rows.length) continue;
    const { error } = await supabase.from('dcs_questions').insert(rows);
    if (error) throw error;
  }
  await repairContestQuestions(contestId);
  return true;
};

const claimContestForGeneration = async (contestId) => {
  const { data, error } = await supabase
    .from('dcs_contests')
    .update({ status: 'generating', generation_status: 'running', updated_at: new Date().toISOString() })
    .eq('id', contestId)
    .eq('status', 'scheduled')
    .is('generation_status', null)
    .select('id');
  if (error || !data?.length) return false;
  return true;
};

export const runDcsScheduler = async ({ allowGenerate = true } = {}) => {
  const now = new Date();
  const nowIso = now.toISOString();
  const results = { generated: 0, wentLive: 0, ended: 0, ready: 0 };

  if (allowGenerate) {
    const { data: candidates } = await supabase
      .from('dcs_contests')
      .select('id, start_at, auto_mode, status, generation_status')
      .eq('status', 'scheduled')
      .eq('auto_mode', true)
      .lte('start_at', new Date(now.getTime() + 10 * 60000).toISOString());

    for (const contest of candidates || []) {
      if (contest.generation_status === 'running' || contest.generation_status === 'done') continue;
      const claimed = await claimContestForGeneration(contest.id);
      if (!claimed) continue;
      try {
        await generateQuestionsForContest(contest.id, null);
        await supabase
          .from('dcs_contests')
          .update({ status: 'ready', generation_status: 'done', updated_at: nowIso })
          .eq('id', contest.id)
          .eq('status', 'generating');
        results.generated += 1;
      } catch (err) {
        await supabase
          .from('dcs_contests')
          .update({ status: 'scheduled', generation_status: 'failed', generation_error: String(err?.message || err), updated_at: nowIso })
          .eq('id', contest.id)
          .eq('status', 'generating');
      }
    }
  }

  const { data: readyToStart } = await supabase
    .from('dcs_contests')
    .select('id, status, start_at')
    .in('status', ['ready', 'scheduled'])
    .lte('start_at', nowIso);

  for (const contest of readyToStart || []) {
    if (contest.status === 'scheduled') {
      const { count } = await supabase
        .from('dcs_questions')
        .select('id', { count: 'exact', head: true })
        .eq('contest_id', contest.id);
      if (!count) continue;
    }
    const { data } = await supabase
      .from('dcs_contests')
      .update({ status: 'live', updated_at: nowIso })
      .eq('id', contest.id)
      .in('status', ['ready', 'scheduled'])
      .select('id');
    if (data?.length) results.wentLive += 1;
  }

  const { data: toEnd } = await supabase
    .from('dcs_contests')
    .select('id, status, end_at')
    .eq('status', 'live')
    .lte('end_at', nowIso);

  for (const contest of toEnd || []) {
    const { data } = await supabase
      .from('dcs_contests')
      .update({ status: 'ended', updated_at: nowIso })
      .eq('id', contest.id)
      .eq('status', 'live')
      .select('id');
    if (data?.length) results.ended += 1;
  }

  const { data: readyCandidates } = await supabase
    .from('dcs_contests')
    .select('id, status, generation_status')
    .eq('status', 'scheduled')
    .eq('auto_mode', false)
    .lte('start_at', nowIso);

  for (const contest of readyCandidates || []) {
    const { count } = await supabase
      .from('dcs_questions')
      .select('id', { count: 'exact', head: true })
      .eq('contest_id', contest.id);
    if (!count) continue;
    const { data } = await supabase
      .from('dcs_contests')
      .update({ status: 'live', updated_at: nowIso })
      .eq('id', contest.id)
      .eq('status', 'scheduled')
      .select('id');
    if (data?.length) results.wentLive += 1;
  }

  return results;
};

export const fetchContestWithState = async (dateKeyValue = todayKey()) => {
  const { data: contest } = await supabase
    .from('dcs_contests')
    .select('*')
    .eq('contest_date', dateKeyValue)
    .maybeSingle();
  if (!contest) return { contest: null, questions: [] };
  const questions = await fetchPublicQuestions(contest.id);
  return { contest, questions };
};

export const fetchLiveContest = async () => {
  await runDcsScheduler({ allowGenerate: true });
  const state = await fetchContestWithState(todayKey());
  if (state?.contest?.id) {
    await repairContestQuestions(state.contest.id);
  }
  return state;
};

// The admin's enabled recurring schedule (daily start/end clock time). Used by
// the student countdown when today's contest row does not exist yet, so the
// page shows the exact time configured in DCS Setup instead of a guess.
export const fetchDailySchedule = async () => {
  try {
    const { data } = await supabase
      .from('dcs_recurring_schedules')
      .select('title, start_time, end_time')
      .eq('schedule_key', 'default')
      .eq('enabled', true)
      .maybeSingle();
    return data || null;
  } catch {
    return null;
  }
};

export const submitDcsAttempt = async ({ userId, contestId, questions = [], answers = {}, language = null, testResults = [], passedQuestions = 0, submissionStatus = 'draft' }) => {
  if (!userId || !contestId) throw new Error('Missing contest or user.');
  const score = scoreFromJudgeResults(questions, testResults);
  const cleanAnswers = {};
  questions.forEach((question) => {
    const value = answers?.[question.id];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      cleanAnswers[question.id] = String(value);
    }
  });

  const { error } = await supabase
    .from('dcs_attempts')
    .upsert(
      {
        contest_id: contestId,
        user_id: userId,
        answers: cleanAnswers,
        score,
        language,
        test_results: testResults,
        passed_questions: passedQuestions,
        submission_status: submissionStatus,
        plagiarism_status: submissionStatus === 'accepted' ? 'not_required' : 'pending_review',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'contest_id,user_id' }
    );
  if (error) throw error;

  const streak = await bumpStreakForAttempt(userId, todayKey());
  return { score, streak };
};

export const fetchMyAttempts = async (userId, limit = 30) => {
  if (!userId) return [];
  const { data } = await supabase
    .from('dcs_attempts')
    .select('id, contest_id, score, completed_at, updated_at, language, submission_status, test_results, passed_questions, plagiarism_status, dcs_contests(contest_date, title, status)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  return data || [];
};

// dcs_streaks.user_id points at auth.users, so PostgREST cannot embed profiles
// from it. Profiles are read separately and attached under the same `profiles`
// key the pages already expect. Teachers only receive their assigned students.
export const fetchAllStreaks = async ({ teacherId = null } = {}) => {
  const { data: rows } = await supabase
    .from('dcs_streaks')
    .select('*')
    .order('current_streak', { ascending: false });
  if (!rows?.length) return [];

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, full_name, email, username, role, assigned_teacher_id')
    .in('id', rows.map((row) => row.user_id));
  const byId = new Map((profileRows || []).map((profile) => [profile.id, profile]));

  return rows
    .map((row) => ({ ...row, profiles: byId.get(row.user_id) || null }))
    .filter((row) => (!teacherId ? true : row.profiles?.assigned_teacher_id === teacherId));
};

// Attempts for one contest, joined with the student profile. Same manual join
// as above, and teachers are limited to the students assigned to them.
export const fetchAttemptsForContest = async (contestId, { teacherId = null, limit = 50 } = {}) => {
  if (!contestId) return [];
  const { data } = await supabase
    .from('dcs_attempts')
    .select('id, contest_id, user_id, answers, score, language, test_results, passed_questions, submission_status, plagiarism_status, created_at, updated_at, completed_at')
    .eq('contest_id', contestId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (!data?.length) return [];

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, full_name, email, username, role, assigned_teacher_id')
    .in('id', data.map((row) => row.user_id));
  const byId = new Map((profileRows || []).map((profile) => [profile.id, profile]));

  return data
    .map((row) => ({ ...row, profiles: byId.get(row.user_id) || null }))
    .filter((row) => (!teacherId ? true : row.profiles?.assigned_teacher_id === teacherId));
};
