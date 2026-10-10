import { supabase } from '../supabaseClient';
import { executeJudge0Code } from './judge0';

const normalize = (value) => String(value ?? '').trim().replace(/\r\n/g, '\n').trim();

// supabase-js reports every non-2xx answer as the generic "Edge Function
// returned a non-2xx status code". The real reason lives in the response body,
// so it is read here and turned into something a student can act on.
const readResponseBody = async (response) => {
  if (!response) return null;
  try {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return null;
  }
};

const friendlyInvokeError = (status, body, fallback) => {
  const serverMessage =
    typeof body === 'string'
      ? body.trim()
      : body?.error || body?.msg || body?.message || body?.hint || '';
  if (status === 401 || status === 403) {
    return 'Your login session has expired. Sign out, sign in again and retry.';
  }
  if (status === 404) {
    return 'The code judge service is not deployed on this Supabase project yet.';
  }
  if (status === 429) {
    return 'The judge is busy right now. Wait a few seconds and run the code again.';
  }
  if (serverMessage) return serverMessage;
  if (status) return `Code judge failed with status ${status}.`;
  return fallback || 'Could not reach the code judge service.';
};

const testsFromQuestion = (question) =>
  (Array.isArray(question?.test_cases) ? question.test_cases : []).filter(
    (test) => test && !test.hidden
  );

// Old question rows only carry a sample (no test table). The sample is still a
// real visible test, so it is used when the question has no stored cases.
const visibleTestsOrSample = (question) => {
  const storedVisible = testsFromQuestion(question);
  if (storedVisible.length) return storedVisible;
  const sampleInput = String(question?.sample_input ?? '').trim();
  const sampleOutput = String(question?.sample_output ?? '').trim();
  if (sampleOutput) return [{ input: sampleInput, output: sampleOutput, hidden: false, fromSample: true }];
  return [];
};

// Hidden tests are never sent to the browser by the list/ problem queries, so
// they are loaded only when a full submission needs them.
const loadAllTests = async (questionId, question) => {
  const { data, error } = await supabase
    .from('dcs_questions')
    .select('test_cases')
    .eq('id', questionId)
    .maybeSingle();
  if (error || !data) throw new Error('Could not load the hidden test cases for this question.');
  const tests = Array.isArray(data.test_cases) ? data.test_cases : [];
  if (tests.length) return tests;
  const sampleInput = String(question?.sample_input ?? '').trim();
  const sampleOutput = String(question?.sample_output ?? '').trim();
  if (sampleOutput) {
    return [
      { input: sampleInput, output: sampleOutput, hidden: false },
      { input: sampleInput, output: sampleOutput, hidden: true },
    ];
  }
  throw new Error('This question does not have any test cases yet.');
};

const failureText = (execution) =>
  normalize(execution?.stderr || execution?.compileOutput || execution?.message || '');

const runTests = async ({ language, sourceCode, tests, hidden, stopOnFirstFailure }) => {
  const results = [];
  for (let index = 0; index < tests.length; index += 1) {
    const test = tests[index] || {};
    const execution = await executeJudge0Code({
      language,
      sourceCode,
      stdin: String(test.input ?? ''),
    });
    const runtimeError = failureText(execution);
    const passed = !runtimeError && normalize(execution.stdout) === normalize(test.output);
    results.push(
      hidden
        ? { index, hidden: true, passed, status: passed ? 'Accepted' : runtimeError ? 'Error' : 'Wrong Answer' }
        : {
            index,
            hidden: false,
            input: test.input || '',
            expectedOutput: test.output || '',
            actualOutput: execution.stdout || '',
            error: runtimeError,
            passed,
            status: passed ? 'Accepted' : runtimeError ? 'Error' : 'Wrong Answer',
          }
    );
    if (!passed && stopOnFirstFailure) break;
  }
  return results;
};

// Backup judge that runs entirely from the browser. Used whenever the cloud
// edge function is unavailable so Run / Submit keep working for students.
const runLocally = async ({ mode, question, language, sourceCode, customInput }) => {
  if (mode === 'custom') {
    const execution = await executeJudge0Code({
      language,
      sourceCode,
      stdin: String(customInput ?? ''),
    });
    return {
      ok: true,
      mode,
      questionId: question.id,
      stdout: execution.stdout || '',
      stderr: failureText(execution),
      status: execution.status || 'Completed',
    };
  }

  if (mode === 'run') {
    const visible = visibleTestsOrSample(question);
    if (!visible.length) throw new Error('This question does not have any visible tests yet.');
    const results = await runTests({ language, sourceCode, tests: visible, hidden: false });
    const visiblePassed = results.filter((item) => item.passed).length;
    return {
      ok: true,
      mode,
      questionId: question.id,
      accepted: visiblePassed === results.length,
      visiblePassed,
      visibleTotal: results.length,
      hiddenPassed: 0,
      hiddenTotal: 0,
      results,
      local: true,
    };
  }

  const allTests = await loadAllTests(question.id, question);
  const visibleTests = allTests.filter((test) => !test?.hidden);
  const hiddenTests = allTests.filter((test) => test?.hidden);
  if (!visibleTests.length) throw new Error('This question does not have any visible tests yet.');

  const visibleResults = await runTests({
    language,
    sourceCode,
    tests: visibleTests,
    hidden: false,
  });
  const allVisiblePassed = visibleResults.every((item) => item.passed);

  // Hidden tests only matter once the shown ones pass, and they stop at the
  // first failure so a wrong solution never costs 35 extra runs.
  const hiddenResults = allVisiblePassed
    ? await runTests({
        language,
        sourceCode,
        tests: hiddenTests,
        hidden: true,
        stopOnFirstFailure: true,
      })
    : [];

  const hiddenPassed = hiddenResults.filter((item) => item.passed).length;
  const accepted = allVisiblePassed && hiddenResults.length === hiddenTests.length && hiddenPassed === hiddenTests.length;

  return {
    ok: true,
    mode,
    questionId: question.id,
    accepted,
    visiblePassed: visibleResults.filter((item) => item.passed).length,
    visibleTotal: visibleResults.length,
    hiddenPassed,
    hiddenTotal: hiddenTests.length,
    hiddenSkipped: !allVisiblePassed,
    results: [...visibleResults, ...hiddenResults],
    local: true,
  };
};

// Runs one judge request. The cloud edge function is tried first; when it
// fails (missing secrets, not deployed, expired session, outage) the browser
// backup judge takes over so the student still gets an answer.
export const runDcsJudge = async ({ mode, contestId, question, language, sourceCode, customInput }) => {
  let cloudError = null;

  try {
    const { data, error, response } = await supabase.functions.invoke('dcs-judge', {
      body: {
        mode,
        contestId,
        questionId: question?.id,
        language,
        sourceCode,
        customInput,
      },
    });
    if (error) {
      const body = await readResponseBody(response);
      cloudError = friendlyInvokeError(response?.status, body, error.message);
    } else if (data?.error) {
      cloudError = String(data.error);
    } else if (data) {
      return { result: data, source: 'cloud' };
    } else {
      cloudError = 'The code judge returned an empty response.';
    }
  } catch (err) {
    cloudError = err?.message || 'Could not reach the code judge service.';
  }

  try {
    const result = await runLocally({ mode, question, language, sourceCode, customInput });
    return { result, source: 'backup', cloudError };
  } catch (backupError) {
    throw new Error(
      `${cloudError} Backup judge also failed: ${backupError?.message || backupError}`.trim()
    );
  }
};

export default runDcsJudge;
