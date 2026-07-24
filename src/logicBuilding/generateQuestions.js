import { getGroqApiKey } from '../utils/ahi';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 2000;

const DIFFICULTY_CONFIG = {
  basic: {
    label: 'Basic',
    color: '#22c55e',
    description: 'Simple problems involving basic data types, arithmetic, conditionals, and simple loops.',
    timeLimit: '1 sec',
    memoryLimit: '256 MB',
  },
  intermediate: {
    label: 'Intermediate',
    color: '#f59e0b',
    description: 'Moderate problems requiring arrays, strings, basic data structures, and sorting.',
    timeLimit: '1 sec',
    memoryLimit: '256 MB',
  },
  advanced: {
    label: 'Advanced',
    color: '#ef4444',
    description: 'Complex problems involving graphs, dynamic programming, trees, and advanced algorithms.',
    timeLimit: '2 sec',
    memoryLimit: '512 MB',
  },
  expert: {
    label: 'Expert',
    color: '#7c3aed',
    description: 'Expert-level problems requiring advanced mathematical reasoning, complex data structures, and optimization.',
    timeLimit: '3 sec',
    memoryLimit: '1 GB',
  },
};

const FALLBACK_QUESTIONS = {
  basic: [
    {
      title: 'Sum of Digits',
      description: 'Problem Statement:\nGiven a positive integer N, find the sum of its digits.\n\nInput Format:\nA single integer N (1 <= N <= 10^4).\n\nOutput Format:\nPrint the sum of digits of N.\n\nConstraints:\n1 <= N <= 10000\n\nExample 1:\nInput: 123\nOutput: 6\n\nExplanation: 1 + 2 + 3 = 6\n\nExample 2:\nInput: 999\nOutput: 27\n\nExplanation: 9 + 9 + 9 = 27',
      testCases: [
        { input: '123', output: '6', hidden: false },
        { input: '999', output: '27', hidden: false },
        { input: '1', output: '1', hidden: true },
        { input: '10000', output: '1', hidden: true },
      ],
    },
    {
      title: 'Even or Odd',
      description: 'Problem Statement:\nGiven an integer N, determine whether it is even or odd.\n\nInput Format:\nA single integer N.\n\nOutput Format:\nPrint "Even" if N is even, "Odd" if N is odd.\n\nConstraints:\n-10^4 <= N <= 10^4\n\nExample 1:\nInput: 4\nOutput: Even\n\nExplanation: 4 is divisible by 2.\n\nExample 2:\nInput: 7\nOutput: Odd\n\nExplanation: 7 is not divisible by 2.',
      testCases: [
        { input: '4', output: 'Even', hidden: false },
        { input: '7', output: 'Odd', hidden: false },
        { input: '0', output: 'Even', hidden: true },
        { input: '-3', output: 'Odd', hidden: true },
      ],
    },
    {
      title: 'Find Maximum',
      description: 'Problem Statement:\nGiven three integers A, B, and C, find the maximum among them.\n\nInput Format:\nThree space-separated integers A, B, C.\n\nOutput Format:\nPrint the maximum value.\n\nConstraints:\n-10^3 <= A, B, C <= 10^3\n\nExample 1:\nInput: 5 10 3\nOutput: 10\n\nExample 2:\nInput: -1 -5 -2\nOutput: -1',
      testCases: [
        { input: '5 10 3', output: '10', hidden: false },
        { input: '-1 -5 -2', output: '-1', hidden: false },
        { input: '7 7 7', output: '7', hidden: true },
        { input: '-100 0 50', output: '50', hidden: true },
      ],
    },
    {
      title: 'Count Vowels',
      description: 'Problem Statement:\nGiven a string S, count the number of vowels (a, e, i, o, u) in it. The comparison should be case-insensitive.\n\nInput Format:\nA single string S.\n\nOutput Format:\nPrint the count of vowels.\n\nConstraints:\n1 <= length of S <= 1000\n\nExample 1:\nInput: Hello World\nOutput: 3\n\nExplanation: e, o, o are the vowels.\n\nExample 2:\nInput: AEIOU\nOutput: 5',
      testCases: [
        { input: 'Hello World', output: '3', hidden: false },
        { input: 'AEIOU', output: '5', hidden: false },
        { input: 'bcdfg', output: '0', hidden: true },
        { input: 'aeiouAEIOU', output: '10', hidden: true },
      ],
    },
  ],
  intermediate: [
    {
      title: 'Two Sum',
      description: 'Problem Statement:\nGiven an array of integers nums and an integer target, return the indices of the two numbers that add up to target. Return the indices in 0-based indexing.\n\nInput Format:\nFirst line: N (size of array) and target.\nSecond line: N space-separated integers.\n\nOutput Format:\nPrint two space-separated indices.\n\nConstraints:\n2 <= N <= 10^4\n-10^9 <= nums[i] <= 10^9\n\nExample 1:\nInput: 4 9\n2 7 11 15\nOutput: 0 1\n\nExplanation: 2 + 7 = 9, indices 0 and 1.\n\nExample 2:\nInput: 3 6\n3 2 4\nOutput: 1 2',
      testCases: [
        { input: '4 9\n2 7 11 15', output: '0 1', hidden: false },
        { input: '3 6\n3 2 4', output: '1 2', hidden: false },
        { input: '2 4\n2 2', output: '0 1', hidden: true },
        { input: '5 8\n1 3 5 7 9', output: '1 3', hidden: true },
      ],
    },
    {
      title: 'Reverse a String',
      description: 'Problem Statement:\nGiven a string S, reverse it and print the result.\n\nInput Format:\nA single string S.\n\nOutput Format:\nPrint the reversed string.\n\nConstraints:\n1 <= length of S <= 10^4\n\nExample 1:\nInput: hello\nOutput: olleh\n\nExample 2:\nInput: SuccessKart\nOutput: traKssuccesS',
      testCases: [
        { input: 'hello', output: 'olleh', hidden: false },
        { input: 'SuccessKart', output: 'traKssuccesS', hidden: false },
        { input: 'a', output: 'a', hidden: true },
        { input: 'racecar', output: 'racecar', hidden: true },
      ],
    },
    {
      title: 'Binary Search',
      description: 'Problem Statement:\nGiven a sorted array of N distinct integers and a target value T, find the index of T in the array using binary search. If T is not found, print -1.\n\nInput Format:\nFirst line: N and T.\nSecond line: N sorted space-separated integers.\n\nOutput Format:\nPrint the index of T or -1.\n\nConstraints:\n1 <= N <= 10^5\n-10^6 <= arr[i] <= 10^6\n\nExample 1:\nInput: 5 7\n1 3 5 7 9\nOutput: 3\n\nExample 2:\nInput: 5 4\n1 3 5 7 9\nOutput: -1',
      testCases: [
        { input: '5 7\n1 3 5 7 9', output: '3', hidden: false },
        { input: '5 4\n1 3 5 7 9', output: '-1', hidden: false },
        { input: '1 1\n1', output: '0', hidden: true },
        { input: '6 10\n1 2 3 4 5 10', output: '5', hidden: true },
      ],
    },
    {
      title: 'Longest Consecutive Sequence',
      description: 'Problem Statement:\nGiven an unsorted array of integers, find the length of the longest consecutive elements sequence.\n\nInput Format:\nFirst line: N.\nSecond line: N space-separated integers.\n\nOutput Format:\nPrint the length of the longest consecutive sequence.\n\nConstraints:\n1 <= N <= 10^5\n\nExample 1:\nInput: 6\n100 4 200 1 3 2\nOutput: 4\n\nExplanation: The longest consecutive sequence is [1, 2, 3, 4].\n\nExample 2:\nInput: 3\n0 3 7\nOutput: 1',
      testCases: [
        { input: '6\n100 4 200 1 3 2', output: '4', hidden: false },
        { input: '3\n0 3 7', output: '1', hidden: false },
        { input: '5\n9 1 4 7 3', output: '4', hidden: true },
        { input: '1\n1', output: '1', hidden: true },
      ],
    },
  ],
  advanced: [
    {
      title: 'Coin Change',
      description: 'Problem Statement:\nGiven a set of coin denominations and a target amount, find the minimum number of coins needed to make the amount. If it is not possible to make the amount using the given coins, print -1.\n\nInput Format:\nFirst line: N (number of coin types) and amount.\nSecond line: N space-separated coin denominations.\n\nOutput Format:\nPrint the minimum number of coins or -1.\n\nConstraints:\n1 <= N <= 100\n1 <= coins[i] <= 10^4\n0 <= amount <= 10^4\n\nExample 1:\nInput: 3 11\n1 2 5\nOutput: 3\n\nExplanation: 5 + 5 + 1 = 11 using 3 coins.\n\nExample 2:\nInput: 2 3\n2\nOutput: -1',
      testCases: [
        { input: '3 11\n1 2 5', output: '3', hidden: false },
        { input: '2 3\n2', output: '-1', hidden: false },
        { input: '1 0\n1', output: '0', hidden: true },
        { input: '3 30\n1 5 10', output: '3', hidden: true },
      ],
    },
    {
      title: 'Detect Cycle in Directed Graph',
      description: 'Problem Statement:\nGiven a directed graph with N vertices and M edges, determine if the graph contains a cycle.\n\nInput Format:\nFirst line: N (vertices) and M (edges).\nNext M lines: U V (directed edge from U to V).\n\nOutput Format:\nPrint "YES" if cycle exists, "NO" otherwise.\n\nConstraints:\n1 <= N <= 10^4\n0 <= M <= 10^4\n\nExample 1:\nInput: 4 4\n1 2\n2 3\n3 1\n3 4\nOutput: YES\n\nExample 2:\nInput: 4 3\n1 2\n2 3\n3 4\nOutput: NO',
      testCases: [
        { input: '4 4\n1 2\n2 3\n3 1\n3 4', output: 'YES', hidden: false },
        { input: '4 3\n1 2\n2 3\n3 4', output: 'NO', hidden: false },
        { input: '1 0', output: 'NO', hidden: true },
        { input: '3 3\n1 2\n2 3\n3 1', output: 'YES', hidden: true },
      ],
    },
    {
      title: 'Longest Increasing Subsequence',
      description: 'Problem Statement:\nGiven an integer array nums, return the length of the longest strictly increasing subsequence.\n\nInput Format:\nFirst line: N.\nSecond line: N space-separated integers.\n\nOutput Format:\nPrint the length of LIS.\n\nConstraints:\n1 <= N <= 2500\n\nExample 1:\nInput: 4\n10 9 2 5\nOutput: 2\n\nExplanation: LIS is [2, 5].\n\nExample 2:\nInput: 6\n0 1 0 3 2 3\nOutput: 4',
      testCases: [
        { input: '4\n10 9 2 5', output: '2', hidden: false },
        { input: '6\n0 1 0 3 2 3', output: '4', hidden: false },
        { input: '1\n5', output: '1', hidden: true },
        { input: '5\n1 3 6 7 9', output: '5', hidden: true },
      ],
    },
    {
      title: 'Kth Largest Element',
      description: 'Problem Statement:\nGiven an unsorted array, find the kth largest element. Note that it is the kth largest element in sorted order, not the kth distinct element.\n\nInput Format:\nFirst line: N and K.\nSecond line: N space-separated integers.\n\nOutput Format:\nPrint the kth largest element.\n\nConstraints:\n1 <= K <= N <= 10^5\n\nExample 1:\nInput: 6 2\n3 2 1 5 6 4\nOutput: 5\n\nExample 2:\nInput: 6 3\n3 2 1 5 6 4\nOutput: 4',
      testCases: [
        { input: '6 2\n3 2 1 5 6 4', output: '5', hidden: false },
        { input: '6 3\n3 2 1 5 6 4', output: '4', hidden: false },
        { input: '1 1\n1', output: '1', hidden: true },
        { input: '5 1\n3 3 3 3 3', output: '3', hidden: true },
      ],
    },
  ],
  expert: [
    {
      title: 'Minimum Window Substring',
      description: 'Problem Statement:\nGiven strings S and T, find the minimum window substring of S that contains all characters of T. If no such window exists, return an empty string.\n\nInput Format:\nFirst line: string S.\nSecond line: string T.\n\nOutput Format:\nPrint the minimum window substring.\n\nConstraints:\n1 <= |S|, |T| <= 10^5\n\nExample 1:\nInput: ADOBECODEBANC\nABC\nOutput: BANC\n\nExample 2:\nInput: a\na\nOutput: a',
      testCases: [
        { input: 'ADOBECODEBANC\nABC', output: 'BANC', hidden: false },
        { input: 'a\na', output: 'a', hidden: false },
        { input: 'a\naa', output: '', hidden: true },
        { input: 'abcabc\nabc', output: 'abc', hidden: true },
      ],
    },
    {
      title: 'Median of Two Sorted Arrays',
      description: 'Problem Statement:\nGiven two sorted arrays, find the median of the two sorted arrays. The overall run time complexity should be O(log(m+n)).\n\nInput Format:\nFirst line: N1 (size of first array).\nSecond line: N1 sorted integers.\nThird line: N2 (size of second array).\nFourth line: N2 sorted integers.\n\nOutput Format:\nPrint the median as a decimal number.\n\nConstraints:\n0 <= N1, N2 <= 10^6\n\nExample 1:\nInput: 2\n1 3\n1\n2\nOutput: 2.0\n\nExample 2:\nInput: 1\n2\n0\nOutput: 2.0',
      testCases: [
        { input: '2\n1 3\n1\n2', output: '2.0', hidden: false },
        { input: '1\n2\n0\n', output: '2.0', hidden: false },
        { input: '2\n1 2\n2\n3 4', output: '2.5', hidden: true },
        { input: '0\n\n1\n1', output: '1.0', hidden: true },
      ],
    },
    {
      title: 'Word Ladder',
      description: 'Problem Statement:\nGiven beginWord, endWord, and a dictionary, find the length of the shortest transformation sequence from beginWord to endWord such that only one letter can be changed at a time and each transformed word must exist in the dictionary. Return 0 if no such sequence exists.\n\nInput Format:\nFirst line: beginWord.\nSecond line: endWord.\nThird line: N (dictionary size).\nNext N lines: dictionary words.\n\nOutput Format:\nPrint the length of shortest transformation or 0.\n\nConstraints:\n1 <= beginWord.length <= 10\n\nExample 1:\nInput: hit\ncog\n6\nhot\ndog\ndot\ncog\nlot\nlog\nOutput: 5\n\nExample 2:\nInput: hit\ncog\n1\ncot\nOutput: 0',
      testCases: [
        { input: 'hit\ncog\n6\nhot\ndog\ndot\ncog\nlot\nlog', output: '5', hidden: false },
        { input: 'hit\ncog\n1\ncot', output: '0', hidden: false },
        { input: 'hot\ndog\n2\nhot\ndog', output: '2', hidden: true },
        { input: 'a\nc\n1\nb', output: '3', hidden: true },
      ],
    },
    {
      title: 'Trapping Rain Water',
      description: 'Problem Statement:\nGiven N non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\nInput Format:\nFirst line: N.\nSecond line: N space-separated integers (heights).\n\nOutput Format:\nPrint the total units of water trapped.\n\nConstraints:\n1 <= N <= 2 * 10^4\n0 <= height[i] <= 10^4\n\nExample 1:\nInput: 6\n0 1 0 2 1 0 1 3 2 1 2 1\nOutput: 6\n\nExample 2:\nInput: 3\n4 2 0\nOutput: 4',
      testCases: [
        { input: '12\n0 1 0 2 1 0 1 3 2 1 2 1', output: '6', hidden: false },
        { input: '3\n4 2 0', output: '4', hidden: false },
        { input: '1\n1', output: '0', hidden: true },
        { input: '5\n2 0 2 0 2', output: '4', hidden: true },
      ],
    },
  ],
};

const buildPrompt = (difficulty) => {
  const config = DIFFICULTY_CONFIG[difficulty];
  return `You are an expert competitive programming question setter similar to CodeChef.

Generate ONE coding problem at "${config.label}" difficulty level.

Return ONLY a valid JSON object (no markdown, no code fences, no extra text) with this exact structure:
{
  "title": "Problem title (short, descriptive, CodeChef-style)",
  "description": "Full problem description in CodeChef format. Include:\n- A clear problem statement\n- Input format description\n- Output format description\n- Constraints\n- At least 2 examples with Input and Output clearly labeled\n\nThe description should be educational and clear for students.",
  "testCases": [
    {
      "input": "test input as string",
      "output": "expected output as string",
      "hidden": false
    },
    {
      "input": "test input as string",
      "output": "expected output as string",
      "hidden": false
    },
    {
      "input": "test input as string",
      "output": "expected output as string",
      "hidden": true
    },
    {
      "input": "test input as string",
      "output": "expected output as string",
      "hidden": true
    }
  ]
}

Requirements:
- Generate exactly 4 test cases: 2 SHOWN (hidden=false) and 2 HIDDEN (hidden=true)
- The shown test cases should be simple examples from the description
- The hidden test cases should test edge cases and larger inputs
- All test cases must have correct expected outputs
- The problem must be solvable in Python, Java, C++, and C
- Do NOT include any markdown formatting, code fences, or text outside the JSON`;
};

function extractJson(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch {}
  const braceMatch = cleaned.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {}
  }
  const jsonPattern = /"title"\s*:\s*"[\s\S]*?"testCases"\s*:\s*\[[\s\S]*?\]/;
  const m = cleaned.match(jsonPattern);
  if (m) {
    try {
      const wrapped = `{${m[0]}}`;
      return JSON.parse(wrapped);
    } catch {}
  }
  return null;
}

async function callGroqWithModel(apiKey, messages, model) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API ${response.status}: ${errText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function validateQuestion(q) {
  if (!q || typeof q !== 'object') return false;
  if (!q.title || typeof q.title !== 'string' || q.title.trim().length < 2) return false;
  if (!q.description || typeof q.description !== 'string' || q.description.trim().length < 10) return false;
  if (!Array.isArray(q.testCases) || q.testCases.length < 2) return false;
  return q.testCases.every(tc =>
    tc && typeof tc.input === 'string' && typeof tc.output === 'string'
  );
}

function ensureFourTestCases(testCases) {
  let result = [...testCases];
  while (result.length < 4) {
    const idx = result.length;
    result.push({
      input: result[idx - 1]?.input || '0',
      output: result[idx - 1]?.output || '0',
      hidden: result.length >= 2,
    });
  }
  return result.slice(0, 4);
}

function buildFallbackQuestion(difficulty, index) {
  const pool = FALLBACK_QUESTIONS[difficulty] || FALLBACK_QUESTIONS.basic;
  const q = pool[index % pool.length];
  return {
    title: q.title,
    description: q.description,
    testCases: ensureFourTestCases(q.testCases),
    difficulty,
    language: 'python',
  };
}

export async function generateQuestionsForDifficulty(difficulty) {
  const apiKey = await getGroqApiKey();
  if (!apiKey) {
    throw new Error('AI API key not configured. Please set the Groq API key in Admin AI Settings.');
  }

  const messages = [
    { role: 'system', content: 'You are an expert competitive programming question setter. Return ONLY valid JSON with no markdown or code fences.' },
    { role: 'user', content: buildPrompt(difficulty) },
  ];

  let lastError = null;
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const raw = await callGroqWithModel(apiKey, messages, model);
        const parsed = extractJson(raw);
        if (parsed && validateQuestion(parsed)) {
          return {
            title: parsed.title,
            description: parsed.description,
            testCases: ensureFourTestCases(parsed.testCases.map(tc => ({
              input: String(tc.input ?? ''),
              output: String(tc.output ?? ''),
              hidden: Boolean(tc.hidden),
            }))),
            difficulty,
            language: 'python',
          };
        }
        lastError = new Error('AI returned invalid or incomplete JSON.');
      } catch (err) {
        lastError = err;
      }
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_BASE * attempt));
      }
    }
  }

  throw lastError || new Error('All AI models and retries failed.');
}

export async function generateAllQuestions(onProgress) {
  const difficulties = ['basic', 'basic', 'intermediate', 'intermediate', 'advanced', 'advanced', 'expert', 'expert'];
  const questions = [];
  let usedFallback = false;

  for (let i = 0; i < difficulties.length; i++) {
    const d = difficulties[i];
    if (onProgress) onProgress({ current: i + 1, total: difficulties.length, difficulty: d, usedFallback });
    try {
      const q = await generateQuestionsForDifficulty(d);
      questions.push(q);
    } catch {
      usedFallback = true;
      questions.push(buildFallbackQuestion(d, Math.floor(i / 2)));
    }
  }

  return questions;
}

export { DIFFICULTY_CONFIG, buildFallbackQuestion, FALLBACK_QUESTIONS };
