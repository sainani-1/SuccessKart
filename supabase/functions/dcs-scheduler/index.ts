import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const counts = { easy: 4, medium: 3, hard: 3 };
const pool = {
  easy: [
    { title: 'Sum of Two Numbers', description: 'Read two integers A and B and print their sum.', sample_input: '12 30', sample_output: '42', expected_answer: '42', constraints: '-10^9 <= A, B <= 10^9' },
    { title: 'Even or Odd', description: 'Given an integer N, print Even if N is divisible by 2; otherwise print Odd.', sample_input: '7', sample_output: 'Odd', expected_answer: 'Odd', constraints: '1 <= N <= 10^9' },
    { title: 'Largest of Three', description: 'Read three integers and print the largest value.', sample_input: '5 19 11', sample_output: '19', expected_answer: '19', constraints: '-10^9 <= each value <= 10^9' },
    { title: 'Factorial of N', description: 'Print N factorial (N!).', sample_input: '5', sample_output: '120', expected_answer: '120', constraints: '0 <= N <= 12' },
    { title: 'Reverse a Number', description: 'Reverse the digits of a positive integer. Do not print leading zeroes in the result.', sample_input: '120', sample_output: '21', expected_answer: '21', constraints: '1 <= N <= 10^9' },
    { title: 'Count Vowels', description: 'Count the vowels a, e, i, o, u in the given word, ignoring case.', sample_input: 'SuccessKart', sample_output: '3', expected_answer: '3', constraints: '1 <= word length <= 10^5' },
    { title: 'Sum of Digits', description: 'Print the sum of all decimal digits in N.', sample_input: '472', sample_output: '13', expected_answer: '13', constraints: '0 <= N <= 10^18' },
    { title: 'Leap Year Check', description: 'Print Yes if the year is a leap year; otherwise print No.', sample_input: '2024', sample_output: 'Yes', expected_answer: 'Yes', constraints: '1 <= year <= 10^9' },
  ],
  medium: [
    { title: 'Fibonacci Nth Term', description: 'Print F(N), where F(0)=0 and F(1)=1.', sample_input: '9', sample_output: '34', expected_answer: '34', constraints: '0 <= N <= 30' },
    { title: 'Greatest Common Divisor', description: 'Read A and B and print their greatest common divisor.', sample_input: '18 24', sample_output: '6', expected_answer: '6', constraints: '1 <= A, B <= 10^9' },
    { title: 'Count Primes in a Range', description: 'Count the prime numbers in the inclusive range [L, R].', sample_input: '10 30', sample_output: '6', expected_answer: '6', constraints: '1 <= L <= R <= 10^5' },
    { title: 'Count Distinct Words', description: 'Count distinct words case-insensitively in a space-separated line.', sample_input: 'Code code CODE smart', sample_output: '2', expected_answer: '2', constraints: '1 <= number of words <= 10^4' },
    { title: 'Array Rotation', description: 'Print the array after rotating it one position to the right.', sample_input: '5\n1 2 3 4 5', sample_output: '5 1 2 3 4', expected_answer: '5 1 2 3 4', constraints: '1 <= N <= 10^5' },
    { title: 'Armstrong Number Check', description: 'Print Yes if N equals the sum of the cubes of its digits; otherwise print No.', sample_input: '153', sample_output: 'Yes', expected_answer: 'Yes', constraints: '1 <= N <= 10^9' },
  ],
  hard: [
    { title: 'Longest Palindromic Substring', description: 'Print the length of the longest palindromic substring of S.', sample_input: 'babad', sample_output: '3', expected_answer: '3', constraints: '1 <= |S| <= 1000; S contains lowercase letters' },
    { title: 'Stock Span Problem', description: 'For the given prices, print the span of each day separated by spaces.', sample_input: '7\n100 80 60 70 60 75 85', sample_output: '1 1 1 2 1 4 6', expected_answer: '1 1 1 2 1 4 6', constraints: '1 <= N <= 10^5; 1 <= price <= 10^9' },
    { title: 'Subarrays With Sum K', description: 'Count contiguous subarrays whose sum equals K.', sample_input: '3 2\n1 1 1', sample_output: '2', expected_answer: '2', constraints: '1 <= N <= 10^5; -10^9 <= values, K <= 10^9' },
    { title: 'Merge Sorted Arrays', description: 'Merge two sorted arrays and print one sorted array.', sample_input: '3 4\n2 7 10\n1 4 6 9', sample_output: '1 2 4 6 7 9 10', expected_answer: '1 2 4 6 7 9 10', constraints: '1 <= N, M <= 10^5' },
    { title: 'Longest Increasing Subsequence', description: 'Print the length of the longest strictly increasing subsequence.', sample_input: '8\n10 9 2 5 3 7 101 18', sample_output: '4', expected_answer: '4', constraints: '1 <= N <= 2500' },
  ],
};

const testCaseBank: Record<string, Array<{ input: string; output: string }>> = {
  'Sum of Two Numbers': [{ input: '12 30', output: '42' }, { input: '-5 9', output: '4' }, { input: '0 0', output: '0' }, { input: '1000000000 -1', output: '999999999' }, { input: '7 8', output: '15' }, { input: '-20 -30', output: '-50' }],
  'Even or Odd': [{ input: '7', output: 'Odd' }, { input: '8', output: 'Even' }, { input: '0', output: 'Even' }, { input: '-3', output: 'Odd' }, { input: '1000000', output: 'Even' }, { input: '1', output: 'Odd' }],
  'Largest of Three': [{ input: '5 19 11', output: '19' }, { input: '-1 -5 -2', output: '-1' }, { input: '7 7 7', output: '7' }, { input: '0 4 2', output: '4' }, { input: '100 99 98', output: '100' }, { input: '-10 0 -2', output: '0' }],
  'Factorial of N': [{ input: '5', output: '120' }, { input: '0', output: '1' }, { input: '1', output: '1' }, { input: '6', output: '720' }, { input: '10', output: '3628800' }, { input: '12', output: '479001600' }],
  'Count Vowels': [{ input: 'SuccessKart', output: '3' }, { input: 'hello', output: '2' }, { input: 'AEIOU', output: '5' }, { input: 'bcdfg', output: '0' }, { input: 'algorithm', output: '3' }, { input: 'a', output: '1' }],
  'Sum of Digits': [{ input: '472', output: '13' }, { input: '0', output: '0' }, { input: '999', output: '27' }, { input: '10000', output: '1' }, { input: '12345', output: '15' }, { input: '10', output: '1' }],
  'Leap Year Check': [{ input: '2024', output: 'Yes' }, { input: '1900', output: 'No' }, { input: '2000', output: 'Yes' }, { input: '2023', output: 'No' }, { input: '2400', output: 'Yes' }, { input: '2100', output: 'No' }],
  'Fibonacci Nth Term': [{ input: '9', output: '34' }, { input: '0', output: '0' }, { input: '1', output: '1' }, { input: '10', output: '55' }, { input: '20', output: '6765' }, { input: '30', output: '832040' }],
  'Greatest Common Divisor': [{ input: '18 24', output: '6' }, { input: '7 13', output: '1' }, { input: '100 25', output: '25' }, { input: '0 5', output: '5' }, { input: '48 18', output: '6' }, { input: '81 27', output: '27' }],
  'Count Primes in a Range': [{ input: '10 30', output: '6' }, { input: '1 1', output: '0' }, { input: '2 10', output: '4' }, { input: '10 20', output: '4' }, { input: '1 100', output: '25' }, { input: '20 25', output: '1' }],
  'Longest Palindromic Substring': [{ input: 'babad', output: '3' }, { input: 'cbbd', output: '2' }, { input: 'a', output: '1' }, { input: 'racecar', output: '7' }, { input: 'abcde', output: '1' }, { input: 'aaaa', output: '4' }],
  'Subarrays With Sum K': [{ input: '3 2\n1 1 1', output: '2' }, { input: '3 3\n1 2 3', output: '2' }, { input: '3 0\n0 0 0', output: '6' }, { input: '5 5\n1 2 3 4 5', output: '2' }, { input: '3 7\n2 2 2', output: '0' }, { input: '4 3\n1 1 1 1', output: '2' }],
};

const buildTestCases = (question: any) => {
  const bank = testCaseBank[question.title] || [{ input: question.sample_input || '', output: question.sample_output || '' }];
  const visible = Array.from({ length: 6 }, (_, index) => ({ ...bank[index % bank.length], hidden: false }));
  const hidden = Array.from({ length: 35 }, (_, index) => ({ ...bank[(index + 6) % bank.length], hidden: true }));
  return [...visible, ...hidden];
};

const fallbackQuestions = (difficulty: string, count: number, seed: number) => {
  const names = pool[difficulty as keyof typeof pool];
  return Array.from({ length: count }, (_, index) => {
    const question = names[(seed + index) % names.length];
    return { ...question, difficulty, position: index + 1, test_cases: buildTestCases(question), source: 'scheduler-fallback' };
  });
};

const generateForContest = async (admin: any, contest: any) => {
  const { count } = await admin.from('dcs_questions').select('id', { count: 'exact', head: true }).eq('contest_id', contest.id);
  if (Number(count || 0) >= 10) {
    await admin.from('dcs_contests').update({ status: 'ready', generation_status: 'done', generation_error: null, updated_at: new Date().toISOString() }).eq('id', contest.id);
    return;
  }
  const seed = Math.abs(new Date(`${contest.contest_date}T00:00:00Z`).getTime() / 86400000) % 1000;
  const rows = Object.entries(counts).flatMap(([difficulty, amount]) => fallbackQuestions(difficulty, amount, seed));
  await admin.from('dcs_questions').delete().eq('contest_id', contest.id);
  const { error } = await admin.from('dcs_questions').insert(rows.map((row) => ({ ...row, contest_id: contest.id })));
  if (error) throw error;
  await admin.from('dcs_contests').update({ status: 'ready', generation_status: 'done', generation_error: null, updated_at: new Date().toISOString() }).eq('id', contest.id);
};

Deno.serve(async () => {
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  const { data: schedules } = await admin.from('dcs_recurring_schedules').select('*').eq('enabled', true);
  for (const schedule of schedules || []) {
    const { data: existing } = await admin.from('dcs_contests').select('id').eq('contest_date', today).maybeSingle();
    if (!existing) {
      const startAt = new Date(`${today}T${String(schedule.start_time).slice(0, 5)}:00+05:30`);
      let endAt = new Date(`${today}T${String(schedule.end_time).slice(0, 5)}:00+05:30`);
      if (endAt <= startAt) endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);
      await admin.from('dcs_contests').insert({
        contest_date: today,
        title: schedule.title,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        generation_deadline_at: new Date(startAt.getTime() - 10 * 60000).toISOString(),
        auto_mode: schedule.auto_mode,
        status: 'scheduled',
        created_by: schedule.created_by,
      });
    }
  }
  const { data: contests, error } = await admin.from('dcs_contests').select('*').in('status', ['scheduled', 'generating', 'ready', 'live']).order('start_at');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const result = { prepared: 0, live: 0, ended: 0 };
  for (const contest of contests || []) {
    const start = new Date(contest.start_at);
    const end = new Date(contest.end_at);
    if (contest.auto_mode && ['scheduled', 'generating'].includes(contest.status) && now >= new Date(start.getTime() - 10 * 60000)) {
      await generateForContest(admin, contest); result.prepared += 1; contest.status = 'ready';
    }
    // Never publish an auto contest until all ten questions are ready.
    if (contest.status === 'ready' && now >= start && now < end) {
      await admin.from('dcs_contests').update({ status: 'live', updated_at: now.toISOString() }).eq('id', contest.id); result.live += 1;
    }
    if (['ready', 'live'].includes(contest.status) && now >= end) {
      await admin.from('dcs_contests').update({ status: 'ended', updated_at: now.toISOString() }).eq('id', contest.id); result.ended += 1;
    }
  }
  return Response.json({ ok: true, ...result });
});
