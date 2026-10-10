import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const languageIds: Record<string, number> = {
  python: 71,
  javascript: 63,
  java: 62,
  c: 50,
  cpp: 54,
};

const VISIBLE_TESTS = 6;
const HIDDEN_TESTS = 35;
const MAX_CUSTOM_TESTS = 10;

const normalize = (value: unknown) => String(value ?? '').trim().replace(/\r\n/g, '\n').trim();

const judgeOne = async (language: string, sourceCode: string, stdin: string) => {
  const baseUrl = Deno.env.get('JUDGE0_URL');
  const apiKey = Deno.env.get('JUDGE0_API_KEY');
  const apiHost = Deno.env.get('JUDGE0_API_HOST');
  if (!baseUrl || !apiKey || !apiHost) throw new Error('DCS judge is not configured. Set JUDGE0_URL, JUDGE0_API_KEY, and JUDGE0_API_HOST secrets.');

  const headers = { 'Content-Type': 'application/json', 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': apiHost };
  const create = await fetch(`${baseUrl.replace(/\/+$/, '')}/submissions?base64_encoded=false&wait=false`, {
    method: 'POST', headers, body: JSON.stringify({ language_id: languageIds[language] || languageIds.python, source_code: sourceCode, stdin }),
  });
  if (!create.ok) throw new Error(await create.text());
  const submission = await create.json();
  const started = Date.now();
  while (Date.now() - started < 30000) {
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/submissions/${submission.token}?base64_encoded=false&fields=stdout,stderr,compile_output,message,status,time,memory`, { headers });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    if (result.status?.id && result.status.id <= 2) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      continue;
    }
    return { output: normalize(result.stdout), error: normalize([result.stderr, result.compile_output, result.message].filter(Boolean).join('\n')), status: result.status?.description || 'Completed' };
  }
  throw new Error('Code execution timed out.');
};

type Test = { input?: string; output?: string; hidden?: boolean };

const judgeTests = async (language: string, sourceCode: string, tests: Test[], hidden: boolean) => {
  const results = [];
  for (let index = 0; index < tests.length; index += 1) {
    const test = tests[index];
    const execution = await judgeOne(language, sourceCode, test.input || '');
    const passed = !execution.error && normalize(execution.output) === normalize(test.output);
    results.push(hidden
      ? { index, hidden: true, passed, status: passed ? 'Accepted' : execution.error ? 'Error' : 'Wrong Answer' }
      : { index, hidden: false, input: test.input || '', expectedOutput: test.output || '', actualOutput: execution.output, error: execution.error, passed, status: passed ? 'Accepted' : execution.error ? 'Error' : 'Wrong Answer' });
  }
  return results;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401, headers: cors });

    const body = await request.json();
    const mode = ['run', 'submit', 'custom', 'validate'].includes(body?.mode) ? body.mode : 'submit';
    const { contestId, questionId, language, sourceCode, customInput } = body;

    // Question generation asks the judge to verify the test cases it produced by
    // running the generator's own reference solution against them.
    if (mode === 'validate') {
      const referenceSolution = String(body.referenceSolution || '').trim();
      const cases: Test[] = Array.isArray(body.tests) ? body.tests.slice(0, MAX_CUSTOM_TESTS) : [];
      if (!referenceSolution || !cases.length) {
        return Response.json({ error: 'A reference solution and at least one test case are required.' }, { status: 400, headers: cors });
      }
      const mismatches = [];
      for (let index = 0; index < cases.length; index += 1) {
        const testCase = cases[index];
        const execution = await judgeOne('python', referenceSolution, String(testCase.input ?? ''));
        const matches = !execution.error && normalize(execution.output) === normalize(testCase.output);
        if (!matches) {
          mismatches.push({
            index,
            status: execution.error ? 'Runtime error' : 'Output mismatch',
            expected: normalize(testCase.output),
            actual: normalize(execution.output),
          });
        }
      }
      return Response.json({ ok: true, mode, checked: cases.length, mismatches }, { headers: cors });
    }

    if (!contestId || !questionId || !sourceCode) return Response.json({ error: 'Contest, question, and code are required.' }, { status: 400, headers: cors });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: question, error } = await admin.from('dcs_questions').select('id, contest_id, test_cases').eq('id', questionId).eq('contest_id', contestId).single();
    if (error || !question) return Response.json({ error: 'Question not found.' }, { status: 404, headers: cors });

    const tests: Test[] = Array.isArray(question.test_cases) ? question.test_cases : [];
    const visibleTests = tests.filter((test) => !test.hidden);
    const hiddenTests = tests.filter((test) => test.hidden);

    // Custom input: run the student's code once on their own input and hand back
    // the raw output. No test data is read or compared.
    if (mode === 'custom') {
      const execution = await judgeOne(language, sourceCode, String(customInput ?? ''));
      return Response.json({
        ok: true,
        mode,
        questionId,
        stdout: execution.output,
        stderr: execution.error,
        status: execution.status,
      }, { headers: cors });
    }

    // Run: only the visible tests are executed, hidden tests are never touched.
    if (mode === 'run') {
      if (!visibleTests.length) return Response.json({ error: 'This question does not have any visible tests yet.' }, { status: 422, headers: cors });
      const results = await judgeTests(language, sourceCode, visibleTests, false);
      const visiblePassed = results.filter((item) => item.passed).length;
      return Response.json({
        ok: true,
        mode,
        questionId,
        accepted: visiblePassed === results.length,
        visiblePassed,
        visibleTotal: results.length,
        hiddenPassed: 0,
        hiddenTotal: 0,
        results,
      }, { headers: cors });
    }

    // Submit: every visible and hidden test must run and pass.
    if (visibleTests.length < VISIBLE_TESTS || hiddenTests.length < HIDDEN_TESTS) {
      return Response.json({
        error: `This question is not ready for submission: it needs ${VISIBLE_TESTS} visible and ${HIDDEN_TESTS} hidden tests (found ${visibleTests.length} visible and ${hiddenTests.length} hidden).`,
      }, { status: 422, headers: cors });
    }

    const visibleResults = await judgeTests(language, sourceCode, visibleTests, false);
    const hiddenResults = await judgeTests(language, sourceCode, hiddenTests, true);
    const results = [...visibleResults, ...hiddenResults];
    const visiblePassed = visibleResults.filter((item) => item.passed).length;
    const hiddenPassed = hiddenResults.filter((item) => item.passed).length;

    return Response.json({
      ok: true,
      mode,
      questionId,
      accepted: results.every((item) => item.passed),
      visiblePassed,
      visibleTotal: visibleResults.length,
      hiddenPassed,
      hiddenTotal: hiddenResults.length,
      results,
    }, { headers: cors });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500, headers: cors });
  }
});
