export const DIFFICULTY_LEVELS = [
  { id: 1, name: 'Very Easy', requiredScore: 0 },
  { id: 2, name: 'Easy', requiredScore: 100 },
  { id: 3, name: 'Basic', requiredScore: 250 },
  { id: 4, name: 'Beginner', requiredScore: 500 },
  { id: 5, name: 'Intermediate', requiredScore: 1000 },
  { id: 6, name: 'Advanced', requiredScore: 2000 },
  { id: 7, name: 'Expert', requiredScore: 3500 },
  { id: 8, name: 'Hard', requiredScore: 5000 },
  { id: 9, name: 'Very Hard', requiredScore: 7500 },
  { id: 10, name: 'Competitive Programming', requiredScore: 10000 },
];

export const DIFFICULTY_XP = {
  'Very Easy': { xp: 10, coins: 5 },
  'Easy': { xp: 20, coins: 10 },
  'Basic': { xp: 30, coins: 15 },
  'Beginner': { xp: 30, coins: 15 },
  'Intermediate': { xp: 40, coins: 20 },
  'Advanced': { xp: 55, coins: 25 },
  'Expert': { xp: 70, coins: 35 },
  'Hard': { xp: 85, coins: 40 },
  'Very Hard': { xp: 100, coins: 50 },
  'Competitive Programming': { xp: 120, coins: 60 },
};

export const CURRICULUM_XP = {
  beginner: { xp: 10, coins: 5, label: 'Beginner (Absolute Basics)' },
  easy: { xp: 20, coins: 10, label: 'Easy' },
  medium: { xp: 40, coins: 20, label: 'Medium' },
  hard: { xp: 70, coins: 35, label: 'Hard' },
  expert: { xp: 100, coins: 50, label: 'Expert' },
};

const BEGINNER_PROBLEMS = [
  {
    id: 1, title: 'Print Hello World', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['Variables'], xpReward: 10,
    description: 'Write a program to print "Hello World" to the console.',
    constraints: 'No input required.', inputFormat: 'No input.', outputFormat: 'Print "Hello World" without quotes.',
    examples: [{ input: '', output: 'Hello World', explanation: 'Simply print the string.' }],
    testCases: [
      { input: '', output: 'Hello World', hidden: false },
      { input: '', output: 'Hello World', hidden: true },
    ],
    hints: ['Use print() in Python, console.log() in JS, printf() in C, cout in C++, System.out.println() in Java.'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 2, title: 'Print a Number', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['Variables'], xpReward: 10,
    description: 'Read a single integer from input and print it back.',
    constraints: '-10^9 ≤ N ≤ 10^9', inputFormat: 'A single integer.', outputFormat: 'Print the integer.',
    examples: [{ input: '42', output: '42', explanation: 'Read 42 and print 42.' }],
    testCases: [
      { input: '42', output: '42', hidden: false },
      { input: '-7', output: '-7', hidden: false },
      { input: '999999', output: '999999', hidden: true },
    ],
    hints: ['Use int(input()) in Python, parseInt in JS, scanf in C, cin in C++, Scanner in Java.'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 3, title: 'Print Two Numbers', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['Variables'], xpReward: 10,
    description: 'Read two integers and print them separated by a space.',
    constraints: '-10^9 ≤ a, b ≤ 10^9', inputFormat: 'Two integers.', outputFormat: 'Print both integers separated by a space.',
    examples: [{ input: '5 3', output: '5 3', explanation: 'Read 5 and 3, print "5 3".' }],
    testCases: [
      { input: '5 3', output: '5 3', hidden: false },
      { input: '-1 4', output: '-1 4', hidden: false },
      { input: '100 -200', output: '100 -200', hidden: true },
    ],
    hints: ['Read both integers and print with a space between them.'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 4, title: 'Read One Integer', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['Variables'], xpReward: 10,
    description: 'Read an integer and print "You entered: X" where X is the number.',
    constraints: '-10^9 ≤ N ≤ 10^9', inputFormat: 'A single integer.', outputFormat: '"You entered: X"',
    examples: [{ input: '42', output: 'You entered: 42', explanation: 'Read 42 and print with message.' }],
    testCases: [
      { input: '42', output: 'You entered: 42', hidden: false },
      { input: '-7', output: 'You entered: -7', hidden: false },
      { input: '9999', output: 'You entered: 9999', hidden: true },
    ],
    hints: ['Use string formatting or concatenation.'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 5, title: 'Sum of Two Numbers', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['Operators'], xpReward: 10,
    description: 'Read two integers and print their sum.',
    constraints: '-10^9 ≤ a, b ≤ 10^9', inputFormat: 'Two integers.', outputFormat: 'Their sum.',
    examples: [{ input: '10 3', output: '13', explanation: '10 + 3 = 13' }],
    testCases: [
      { input: '10 3', output: '13', hidden: false },
      { input: '5 2', output: '7', hidden: false },
      { input: '100 200', output: '300', hidden: true },
    ],
    hints: ['Use the + operator.'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 7, title: 'Difference of Two Numbers', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['Operators'], xpReward: 10,
    description: 'Read two integers and print their difference (a - b).',
    constraints: '-10^9 ≤ a, b ≤ 10^9', inputFormat: 'Two integers.', outputFormat: 'Their difference.',
    examples: [{ input: '10 3', output: '7', explanation: '10 - 3 = 7' }],
    testCases: [
      { input: '10 3', output: '7', hidden: false },
      { input: '5 2', output: '3', hidden: false },
      { input: '100 200', output: '-100', hidden: true },
    ],
    hints: ['Use the - operator.'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 8, title: 'Product of Two Numbers', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['Operators'], xpReward: 10,
    description: 'Read two integers and print their product.',
    constraints: '-10^9 ≤ a, b ≤ 10^9', inputFormat: 'Two integers.', outputFormat: 'Their product.',
    examples: [{ input: '10 3', output: '30', explanation: '10 * 3 = 30' }],
    testCases: [
      { input: '10 3', output: '30', hidden: false },
      { input: '5 2', output: '10', hidden: false },
      { input: '100 200', output: '20000', hidden: true },
    ],
    hints: ['Use the * operator.'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 9, title: 'Division', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['Operators'], xpReward: 10,
    description: 'Read two integers and print their integer quotient.',
    constraints: '1 ≤ a, b ≤ 10^6', inputFormat: 'Two integers.', outputFormat: 'Integer quotient (a / b).',
    examples: [{ input: '10 3', output: '3', explanation: '10 / 3 = 3 (integer division)' }],
    testCases: [
      { input: '10 3', output: '3', hidden: false },
      { input: '5 2', output: '2', hidden: false },
      { input: '100 4', output: '25', hidden: true },
    ],
    hints: ['Use integer division (// in Python, / in C/Java for ints).'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 10, title: 'Modulo', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['Operators'], xpReward: 10,
    description: 'Read two integers and print the remainder when a is divided by b.',
    constraints: '1 ≤ a, b ≤ 10^9', inputFormat: 'Two integers.', outputFormat: 'a % b.',
    examples: [{ input: '17 5', output: '2', explanation: '17 % 5 = 2' }],
    testCases: [
      { input: '17 5', output: '2', hidden: false },
      { input: '100 7', output: '2', hidden: false },
      { input: '81 9', output: '0', hidden: true },
    ],
    hints: ['Use the % operator (modulo).'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 11, title: 'Swap Two Numbers', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['Variables'], xpReward: 10,
    description: 'Read two integers and swap their values.',
    constraints: '-10^9 ≤ a, b ≤ 10^9', inputFormat: 'Two integers.', outputFormat: 'Two integers after swapping.',
    examples: [{ input: '5 3', output: '3 5', explanation: 'Swap 5 and 3 to get 3 and 5.' }],
    testCases: [
      { input: '5 3', output: '3 5', hidden: false },
      { input: '-1 4', output: '4 -1', hidden: false },
      { input: '999 1', output: '1 999', hidden: true },
    ],
    hints: ['Use a temporary variable to swap, or use tuple unpacking in Python.'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 12, title: 'Area of Rectangle', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['Mathematics'], xpReward: 10,
    description: 'Read length and width of a rectangle and print its area.',
    constraints: '1 ≤ l, w ≤ 10^6', inputFormat: 'Two integers.', outputFormat: 'Area of rectangle.',
    examples: [{ input: '5 3', output: '15', explanation: '5 * 3 = 15' }],
    testCases: [
      { input: '5 3', output: '15', hidden: false },
      { input: '10 10', output: '100', hidden: false },
      { input: '7 2', output: '14', hidden: true },
    ],
    hints: ['Area = length * width.'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 13, title: 'Area of Circle', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['Mathematics'], xpReward: 10,
    description: 'Read radius of a circle and print its area. Use π = 3.14159.',
    constraints: '1 ≤ r ≤ 10^4', inputFormat: 'A single float.', outputFormat: 'Area rounded to 2 decimal places.',
    examples: [{ input: '5', output: '78.54', explanation: 'π * 5² = 78.54' }],
    testCases: [
      { input: '5', output: '78.54', hidden: false },
      { input: '7', output: '153.94', hidden: false },
      { input: '10', output: '314.16', hidden: true },
    ],
    hints: ['Area = π * r². Use 3.14159 for π. Use formatting for 2 decimal places.'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 14, title: 'Celsius to Fahrenheit', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['Mathematics'], xpReward: 10,
    description: 'Read temperature in Celsius and convert to Fahrenheit.',
    constraints: '-100 ≤ C ≤ 100', inputFormat: 'A single float.', outputFormat: 'Temperature in Fahrenheit (2 decimal places).',
    examples: [{ input: '0', output: '32.00', explanation: '0°C = 32°F' }],
    testCases: [
      { input: '0', output: '32.00', hidden: false },
      { input: '100', output: '212.00', hidden: false },
      { input: '-40', output: '-40.00', hidden: true },
    ],
    hints: ['F = (C * 9/5) + 32.'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 15, title: 'Even or Odd', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['If-Else'], xpReward: 10,
    description: 'Read an integer and print "Even" if it is even, "Odd" if it is odd.',
    constraints: '-10^9 ≤ N ≤ 10^9', inputFormat: 'A single integer.', outputFormat: '"Even" or "Odd".',
    examples: [{ input: '4', output: 'Even', explanation: '4 is even.' }],
    testCases: [
      { input: '4', output: 'Even', hidden: false },
      { input: '7', output: 'Odd', hidden: false },
      { input: '0', output: 'Even', hidden: true },
    ],
    hints: ['Use the % operator to check if N % 2 == 0.'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 16, title: 'Positive Negative or Zero', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['If-Else'], xpReward: 10,
    description: 'Read an integer and print "Positive", "Negative", or "Zero".',
    constraints: '-10^9 ≤ N ≤ 10^9', inputFormat: 'A single integer.', outputFormat: '"Positive", "Negative", or "Zero".',
    examples: [{ input: '5', output: 'Positive', explanation: '5 > 0' }],
    testCases: [
      { input: '5', output: 'Positive', hidden: false },
      { input: '-3', output: 'Negative', hidden: false },
      { input: '0', output: 'Zero', hidden: true },
    ],
    hints: ['Use if-else conditions to check.'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 17, title: 'Largest of Two Numbers', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['If-Else'], xpReward: 10,
    description: 'Read two integers and print the larger one.',
    constraints: '-10^9 ≤ a, b ≤ 10^9', inputFormat: 'Two integers.', outputFormat: 'The larger integer.',
    examples: [{ input: '5 3', output: '5', explanation: '5 is greater than 3.' }],
    testCases: [
      { input: '5 3', output: '5', hidden: false },
      { input: '10 10', output: '10', hidden: false },
      { input: '-1 -5', output: '-1', hidden: true },
    ],
    hints: ['Use comparison operators.'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 18, title: 'Largest of Three Numbers', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['If-Else'], xpReward: 10,
    description: 'Read three integers and print the largest.',
    constraints: '-10^9 ≤ a, b, c ≤ 10^9', inputFormat: 'Three integers.', outputFormat: 'The largest integer.',
    examples: [{ input: '3 7 5', output: '7', explanation: '7 is the largest.' }],
    testCases: [
      { input: '3 7 5', output: '7', hidden: false },
      { input: '10 10 10', output: '10', hidden: false },
      { input: '-1 -5 -2', output: '-1', hidden: true },
    ],
    hints: ['Compare each number with the others to find the maximum.'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 19, title: 'Simple Calculator', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['Operators'], xpReward: 10,
    description: 'Read two integers and an operator (+, -, *, /). Perform the operation and print the result.',
    constraints: '1 ≤ a, b ≤ 10^6', inputFormat: 'Two integers and an operator.', outputFormat: 'Result of the operation.',
    examples: [{ input: '10 3 +', output: '13', explanation: '10 + 3 = 13' }],
    testCases: [
      { input: '10 3 +', output: '13', hidden: false },
      { input: '5 2 *', output: '10', hidden: false },
      { input: '100 4 /', output: '25', hidden: true },
    ],
    hints: ['Use if-elif or switch to check the operator and perform the calculation.'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
  {
    id: 20, title: 'Basic Type Conversion', difficulty: 'Very Easy', difficultyLevel: 1,
    tags: ['Variables'], xpReward: 10,
    description: 'Read a float and print its integer part and the original float.',
    constraints: '-10^6 ≤ f ≤ 10^6', inputFormat: 'A floating point number.', outputFormat: '"Integer: X Float: Y"',
    examples: [{ input: '3.14', output: 'Integer: 3 Float: 3.14', explanation: 'Integer part of 3.14 is 3.' }],
    testCases: [
      { input: '3.14', output: 'Integer: 3 Float: 3.14', hidden: false },
      { input: '-2.5', output: 'Integer: -2 Float: -2.5', hidden: false },
      { input: '100.99', output: 'Integer: 100 Float: 100.99', hidden: true },
    ],
    hints: ['Use int() to convert float to integer (truncates towards zero).'],
    timeComplexity: 'O(1)', spaceComplexity: 'O(1)',
  },
];

const CURRICULUM = [
  {
    id: 'beginner',
    label: 'Beginner (Absolute Basics)',
    difficulty: 'Very Easy',
    xpReward: 10,
    coinReward: 5,
    topic: 'Basics',
    problemIds: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  },
  {
    id: 'easy',
    label: 'Easy',
    difficulty: 'Easy',
    xpReward: 20,
    coinReward: 10,
    topic: 'Core Programming',
    problemIds: [],
    subSections: [
      { topic: 'Variables', problems: [] },
      { topic: 'Operators', problems: [] },
      { topic: 'Bitwise Basics', problems: [] },
      { topic: 'Logical Operators', problems: [] },
      { topic: 'If-Else', problems: [] },
      { topic: 'Nested If', problems: [] },
      { topic: 'Loops', problems: [] },
      { topic: 'Patterns', problems: [] },
      { topic: 'Basic Arrays', problems: [] },
      { topic: 'Strings Basics', problems: [] },
    ],
  },
  {
    id: 'medium',
    label: 'Medium',
    difficulty: 'Intermediate',
    xpReward: 40,
    coinReward: 20,
    topic: 'Data Structures & Algorithms',
    problemIds: [],
    subSections: [
      { topic: 'Functions', problems: [] },
      { topic: 'Recursion', problems: [] },
      { topic: 'Searching', problems: [] },
      { topic: 'Sorting', problems: [] },
      { topic: 'Prefix Sum', problems: [] },
      { topic: 'Two Pointers', problems: [] },
      { topic: 'Sliding Window', problems: [] },
      { topic: 'Stack', problems: [] },
      { topic: 'Queue', problems: [] },
      { topic: 'Linked List', problems: [] },
      { topic: 'HashMap', problems: [] },
    ],
  },
  {
    id: 'hard',
    label: 'Hard',
    difficulty: 'Hard',
    xpReward: 70,
    coinReward: 35,
    topic: 'Advanced Concepts',
    problemIds: [],
    subSections: [
      { topic: 'Trees', problems: [] },
      { topic: 'BST', problems: [] },
      { topic: 'Heap', problems: [] },
      { topic: 'Graph Basics', problems: [] },
      { topic: 'DFS', problems: [] },
      { topic: 'BFS', problems: [] },
      { topic: 'Dynamic Programming Basics', problems: [] },
      { topic: 'Greedy', problems: [] },
      { topic: 'Binary Search on Answer', problems: [] },
    ],
  },
  {
    id: 'expert',
    label: 'Expert',
    difficulty: 'Expert',
    xpReward: 100,
    coinReward: 50,
    topic: 'Mastery',
    problemIds: [],
    subSections: [
      { topic: 'Advanced DP', problems: [] },
      { topic: 'Segment Trees', problems: [] },
      { topic: 'Fenwick Tree', problems: [] },
      { topic: 'Tries', problems: [] },
      { topic: 'Union Find', problems: [] },
      { topic: 'Shortest Path', problems: [] },
      { topic: 'Topological Sort', problems: [] },
      { topic: 'Backtracking', problems: [] },
      { topic: 'Advanced Graphs', problems: [] },
      { topic: 'Competitive Programming Challenges', problems: [] },
    ],
  },
];

// ─── SEEDED RNG ───
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngRange(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }

function _isPrime(n) { if (n < 2) return false; if (n < 4) return true; if (n % 2 === 0 || n % 3 === 0) return false; for (let i = 5; i * i <= n; i += 6) { if (n % i === 0 || n % (i + 2) === 0) return false; } return true; }
function _gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
function _lcm(a, b) { return Math.abs(a * b) / _gcd(a, b) || 1; }
function _digitSum(n) { n = Math.abs(n); let s = 0; while (n > 0) { s += n % 10; n = Math.floor(n / 10); } return s; }

// ─── MASSIVE PROBLEM GENERATOR ───
// Each operation + filter + inputType combination = one unique problem with a unique title.

const MOPS = [
  { n: 'Sum', f: a => a.reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Product', f: a => a.reduce((s, x) => s * x, 1), o: 'a single integer' },
  { n: 'Maximum', f: a => Math.max(...a), o: 'a single integer' },
  { n: 'Minimum', f: a => Math.min(...a), o: 'a single integer' },
  { n: 'Range', f: a => a.length > 1 ? Math.max(...a) - Math.min(...a) : 0, o: 'a single integer' },
  { n: 'Average', f: a => { const s = a.reduce((t, x) => t + x, 0); return Math.round((s / a.length) * 100) / 100; }, o: 'a decimal number' },
  { n: 'Count of Even Numbers', f: a => a.filter(x => x % 2 === 0).length, o: 'a single integer' },
  { n: 'Count of Odd Numbers', f: a => a.filter(x => x % 2 !== 0).length, o: 'a single integer' },
  { n: 'Count of Positive Numbers', f: a => a.filter(x => x > 0).length, o: 'a single integer' },
  { n: 'Count of Negative Numbers', f: a => a.filter(x => x < 0).length, o: 'a single integer' },
  { n: 'Count of Zeroes', f: a => a.filter(x => x === 0).length, o: 'a single integer' },
  { n: 'Sum of Squares', f: a => a.reduce((s, x) => s + x * x, 0), o: 'a single integer' },
  { n: 'Sum of Absolute Values', f: a => a.reduce((s, x) => s + Math.abs(x), 0), o: 'a single integer' },
  { n: 'XOR of All Elements', f: a => a.reduce((s, x) => s ^ x, 0), o: 'a single integer' },
  { n: 'Bitwise AND of All Elements', f: a => a.reduce((s, x) => s & x), o: 'a single integer' },
  { n: 'Bitwise OR of All Elements', f: a => a.reduce((s, x) => s | x, 0), o: 'a single integer' },
  { n: 'Second Largest', f: a => { const u = [...new Set(a)].sort((x, y) => y - x); return u.length >= 2 ? u[1] : u[0]; }, o: 'a single integer' },
  { n: 'Second Smallest', f: a => { const u = [...new Set(a)].sort((x, y) => x - y); return u.length >= 2 ? u[1] : u[0]; }, o: 'a single integer' },
  { n: 'Median', f: a => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }, o: 'a number' },
  { n: 'Sum of Digits', f: a => a.reduce((s, x) => s + _digitSum(Math.abs(x)), 0), o: 'a single integer' },
  { n: 'Count of Distinct Elements', f: a => new Set(a).size, o: 'a single integer' },
  { n: 'Maximum Adjacent Difference', f: a => { let m = 0; for (let i = 1; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - a[i - 1])); return m; }, o: 'a single integer' },
  { n: 'Count of Prime Numbers', f: a => a.filter(x => _isPrime(Math.abs(x))).length, o: 'a single integer' },
  { n: 'Sum of Prime Numbers', f: a => a.filter(x => _isPrime(Math.abs(x))).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Largest Even Number', f: a => { const e = a.filter(x => x % 2 === 0); return e.length ? Math.max(...e) : -1; }, o: 'a single integer' },
  { n: 'Largest Odd Number', f: a => { const o = a.filter(x => x % 2 !== 0); return o.length ? Math.max(...o) : -1; }, o: 'a single integer' },
  { n: 'Smallest Positive Number', f: a => { const p = a.filter(x => x > 0); return p.length ? Math.min(...p) : 0; }, o: 'a single integer' },
  { n: 'Smallest Even Number', f: a => { const e = a.filter(x => x % 2 === 0); return e.length ? Math.min(...e) : -1; }, o: 'a single integer' },
  { n: 'Count of Perfect Squares', f: a => a.filter(x => x > 0 && Math.sqrt(x) === Math.floor(Math.sqrt(x))).length, o: 'a single integer' },
  { n: 'Sum of Non-Zero Elements', f: a => a.filter(x => x !== 0).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'GCD of All Elements', f: a => a.reduce((g, x) => _gcd(g, Math.abs(x))), o: 'a single integer' },
  { n: 'Count of Numbers Divisible by 3', f: a => a.filter(x => x % 3 === 0).length, o: 'a single integer' },
  { n: 'Count of Numbers Divisible by 5', f: a => a.filter(x => x % 5 === 0).length, o: 'a single integer' },
  { n: 'Sum of Multiples of 3 or 5', f: a => a.filter(x => x % 3 === 0 || x % 5 === 0).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Single Digit Numbers', f: a => a.filter(x => Math.abs(x) <= 9).length, o: 'a single integer' },
  { n: 'Count of Double Digit Numbers', f: a => a.filter(x => Math.abs(x) >= 10 && Math.abs(x) <= 99).length, o: 'a single integer' },
  { n: 'Count of Triple Digit Numbers', f: a => a.filter(x => Math.abs(x) >= 100 && Math.abs(x) <= 999).length, o: 'a single integer' },
  { n: 'Sum of Numbers Greater Than 50', f: a => a.filter(x => x > 50).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Numbers Between 10 and 100', f: a => a.filter(x => x >= 10 && x <= 100).length, o: 'a single integer' },
  { n: 'Product of Even Numbers', f: a => { const e = a.filter(x => x % 2 === 0); return e.length ? e.reduce((s, x) => s * x, 1) : 0; }, o: 'a single integer' },
  { n: 'Product of Odd Numbers', f: a => { const o = a.filter(x => x % 2 !== 0); return o.length ? o.reduce((s, x) => s * x, 1) : 0; }, o: 'a single integer' },
  { n: 'Element with Maximum Digit Sum', f: a => a.length ? a.reduce((b, x) => _digitSum(Math.abs(x)) > _digitSum(Math.abs(b)) ? x : b) : 0, o: 'a single integer' },
  { n: 'Sum of Multiples of 7', f: a => a.filter(x => x % 7 === 0).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Numbers Divisible by 9', f: a => a.filter(x => x % 9 === 0).length, o: 'a single integer' },
  { n: 'Sum of Negative Numbers', f: a => a.filter(x => x < 0).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Maximum Absolute Value', f: a => a.length ? Math.max(...a.map(x => Math.abs(x))) : 0, o: 'a single integer' },
  { n: 'Minimum Absolute Value', f: a => a.length ? Math.min(...a.map(x => Math.abs(x))) : 0, o: 'a single integer' },
  { n: 'Sum of Multiples of 4', f: a => a.filter(x => x % 4 === 0).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Multiples of 6', f: a => a.filter(x => x % 6 === 0).length, o: 'a single integer' },
  { n: 'Sum of Numbers Less Than 0', f: a => a.filter(x => x < 0).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Largest Three Digit Number', f: a => { const t = a.filter(x => Math.abs(x) >= 100 && Math.abs(x) <= 999); return t.length ? Math.max(...t) : -1; }, o: 'a single integer' },
  { n: 'Count of Numbers Greater Than Average', f: a => { const avg = a.reduce((s, x) => s + x, 0) / a.length; return a.filter(x => x > avg).length; }, o: 'a single integer' },
  { n: 'Sum of Numbers Below Median', f: a => { const s = [...a].sort((x, y) => x - y); const med = s[s.length >> 1]; return s.filter(x => x < med).reduce((t, x) => t + x, 0); }, o: 'a single integer' },
  { n: 'Count of Palindromic Numbers', f: a => a.filter(x => { const s = Math.abs(x).toString(); return s === [...s].reverse().join(''); }).length, o: 'a single integer' },
  { n: 'Sum of Numbers With No Repeated Digits', f: a => a.filter(x => { const s = Math.abs(x).toString(); return new Set(s).size === s.length; }).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Armstrong Numbers', f: a => a.filter(x => { const d = Math.abs(x).toString().split('').map(Number); const p = d.length; return d.reduce((s, v) => s + Math.pow(v, p), 0) === Math.abs(x); }).length, o: 'a single integer' },
  { n: 'Sum of Factorials of Digits', f: a => a.map(x => { let f = 1; for (let i = 2; i <= Math.abs(x); i++) f *= i; return f; }).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Fibonacci Numbers', f: a => a.filter(x => { const n = Math.abs(x); if (n <= 1) return true; let a0 = 0, a1 = 1; while (a1 < n) { [a0, a1] = [a1, a0 + a1]; } return a1 === n; }).length, o: 'a single integer' },
  { n: 'Sum of Reversed Numbers', f: a => a.reduce((s, x) => { const r = parseInt(Math.abs(x).toString().split('').reverse().join('')) * Math.sign(x); return s + r; }, 0), o: 'a single integer' },
  { n: 'Count of Perfect Numbers', f: a => a.filter(x => { const n = Math.abs(x); if (n < 2) return false; let s = 1; for (let i = 2; i * i <= n; i++) { if (n % i === 0) { s += i; if (i !== n / i) s += n / i; } } return s === n && n > 1; }).length, o: 'a single integer' },
  { n: 'Sum of Harshad Numbers', f: a => a.filter(x => { const n = Math.abs(x); if (n === 0) return false; const ds = _digitSum(n); return ds > 0 && n % ds === 0; }).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Duck Numbers', f: a => a.filter(x => Math.abs(x).toString().includes('0')).length, o: 'a single integer' },
  { n: 'Sum of Spy Numbers', f: a => a.filter(x => { const d = Math.abs(x).toString().split('').map(Number); return d.reduce((p, v) => p * v, 1) === d.reduce((s, v) => s + v, 0); }).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Tech Numbers', f: a => a.filter(x => { const s = Math.abs(x).toString(); if (s.length !== 4) return false; const l = parseInt(s.slice(0, 2)), r = parseInt(s.slice(2)); return (l + r) * (l + r) === Math.abs(x); }).length, o: 'a single integer' },
  { n: 'Sum of Numbers With Even Digit Count', f: a => a.filter(x => Math.abs(x).toString().length % 2 === 0).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Numbers With All Same Digits', f: a => a.filter(x => new Set(Math.abs(x).toString()).size === 1).length, o: 'a single integer' },
  { n: 'Sum of Digits Product', f: a => a.reduce((s, x) => { let p = 1; Math.abs(x).toString().split('').forEach(d => p *= parseInt(d)); return s + p; }, 0), o: 'a single integer' },
  { n: 'Count of Numbers With Increasing Digits', f: a => a.filter(x => { const d = Math.abs(x).toString(); for (let i = 1; i < d.length; i++) if (d[i] <= d[i - 1]) return false; return true; }).length, o: 'a single integer' },
  { n: 'Sum of Numbers Divisible by Their Digit Sum', f: a => a.filter(x => { const n = Math.abs(x); const ds = _digitSum(n); return ds > 0 && n % ds === 0; }).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Numbers With Decreasing Digits', f: a => a.filter(x => { const d = Math.abs(x).toString(); for (let i = 1; i < d.length; i++) if (d[i] >= d[i - 1]) return false; return true; }).length, o: 'a single integer' },
  { n: 'Sum of Binary Representations as Integers', f: a => a.reduce((s, x) => s + parseInt(Math.abs(x).toString(2), 10), 0), o: 'a single integer' },
  { n: 'Count of Numbers With Prime Digit Sum', f: a => a.filter(x => _isPrime(_digitSum(Math.abs(x)))).length, o: 'a single integer' },
  { n: 'Sum of Numbers With Odd Digit Count', f: a => a.filter(x => Math.abs(x).toString().length % 2 === 1).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Largest Number With All Unique Digits', f: a => { const valid = a.filter(x => new Set(Math.abs(x).toString()).size === Math.abs(x).toString().length); return valid.length ? Math.max(...valid) : -1; }, o: 'a single integer' },
  { n: 'Sum of Lucas Numbers in Range', f: a => a.filter(x => { const n = Math.abs(x); if (n <= 1) return n === 1 || n === 2; let l0 = 2, l1 = 1; while (l1 < n) { [l0, l1] = [l1, l0 + l1]; } return l1 === n; }).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Abundant Numbers', f: a => a.filter(x => { const n = Math.abs(x); if (n < 2) return false; let s = 1; for (let i = 2; i * i <= n; i++) { if (n % i === 0) { s += i; if (i !== n / i) s += n / i; } } return s > n; }).length, o: 'a single integer' },
  { n: 'Sum of Deficient Numbers', f: a => a.filter(x => { const n = Math.abs(x); if (n < 2) return true; let s = 1; for (let i = 2; i * i <= n; i++) { if (n % i === 0) { s += i; if (i !== n / i) s += n / i; } } return s < n; }).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Happy Numbers', f: a => { const happy = (n) => { const seen = new Set(); while (n !== 1 && !seen.has(n)) { seen.add(n); n = n.toString().split('').reduce((s, d) => s + parseInt(d) ** 2, 0); } return n === 1; }; return a.filter(x => happy(Math.abs(x))).length; }, o: 'a single integer' },
  { n: 'Sum of Sad Numbers', f: a => { const happy = (n) => { const seen = new Set(); while (n !== 1 && !seen.has(n)) { seen.add(n); n = n.toString().split('').reduce((s, d) => s + parseInt(d) ** 2, 0); } return n === 1; }; return a.filter(x => !happy(Math.abs(x))).reduce((s, x) => s + x, 0); }, o: 'a single integer' },
  { n: 'Count of Pronic Numbers', f: a => a.filter(x => { const n = Math.abs(x); for (let i = 0; i * (i + 1) <= n; i++) { if (i * (i + 1) === n) return true; } return false; }).length, o: 'a single integer' },
  { n: 'Sum of Automorphic Numbers', f: a => a.filter(x => { const n = Math.abs(x); const sq = n * n; return sq.toString().endsWith(n.toString()); }).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Neon Numbers', f: a => a.filter(x => { const n = Math.abs(x); return n * n === _digitSum(n * n) * 1 ? n * n === _digitSum(n) * _digitSum(n) : false; }).length, o: 'a single integer' },
  { n: 'Sum of Peterson Numbers', f: a => a.filter(x => { const n = Math.abs(x); const d = n.toString().split('').map(Number); const f = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880]; const s = d.reduce((acc, digit, i) => acc + digit * (f[d.length - 1 - i] || 1), 0); return s === n; }).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Sum of Numbers With All Same Digits', f: a => a.filter(x => new Set(Math.abs(x).toString()).size === 1).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Numbers Divisible by Sum of Digits', f: a => a.filter(x => { const n = Math.abs(x); const ds = _digitSum(n); return ds > 0 && n % ds === 0; }).length, o: 'a single integer' },
  { n: 'Sum of Numbers Divisible by Product of Digits', f: a => a.filter(x => { const n = Math.abs(x); let p = 1; n.toString().split('').forEach(d => p *= parseInt(d)); return p > 0 && n % p === 0; }).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Numbers With at Least One Digit 5', f: a => a.filter(x => Math.abs(x).toString().includes('5')).length, o: 'a single integer' },
  { n: 'Sum of Numbers That Are Multiples of Their Reverse', f: a => a.filter(x => { const n = Math.abs(x); const r = parseInt(n.toString().split('').reverse().join('')); return r > 0 && n % r === 0; }).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Largest Factor of Elements Sum', f: a => { const s = Math.abs(a.reduce((t, x) => t + x, 0)); for (let i = s; i >= 1; i--) if (s % i === 0) return i; return 1; }, o: 'a single integer' },
  { n: 'Sum of Numbers Whose Square Ends With the Number', f: a => a.filter(x => { const n = Math.abs(x); return (n * n).toString().endsWith(n.toString()); }).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Numbers With Digits in Ascending Order', f: a => a.filter(x => { const d = Math.abs(x).toString(); for (let i = 1; i < d.length; i++) { if (d[i] < d[i - 1]) return false; } return true; }).length, o: 'a single integer' },
  { n: 'Sum of Numbers With Digits in Strictly Ascending Order', f: a => a.filter(x => { const d = Math.abs(x).toString(); for (let i = 1; i < d.length; i++) { if (d[i] <= d[i - 1]) return false; } return true; }).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Numbers With All Even Digits', f: a => a.filter(x => Math.abs(x).toString().split('').every(d => parseInt(d) % 2 === 0)).length, o: 'a single integer' },
  { n: 'Sum of Numbers With All Odd Digits', f: a => a.filter(x => Math.abs(x).toString().split('').every(d => parseInt(d) % 2 === 1)).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Numbers With Exactly Two Distinct Digits', f: a => a.filter(x => new Set(Math.abs(x).toString()).size === 2).length, o: 'a single integer' },
  { n: 'Sum of Numbers With Exactly Three Digits', f: a => a.filter(x => Math.abs(x) >= 100 && Math.abs(x) <= 999).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Numbers Whose Digit Product Is Even', f: a => a.filter(x => { let p = 1; Math.abs(x).toString().split('').forEach(d => p *= parseInt(d)); return p % 2 === 0; }).length, o: 'a single integer' },
  { n: 'Sum of Numbers Whose Digit Product Is Odd', f: a => a.filter(x => { let p = 1; Math.abs(x).toString().split('').forEach(d => p *= parseInt(d)); return p % 2 === 1; }).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Largest Element Divisible by 3', f: a => { const d = a.filter(x => x % 3 === 0); return d.length ? Math.max(...d) : -1; }, o: 'a single integer' },
  { n: 'Smallest Element Divisible by 5', f: a => { const d = a.filter(x => x % 5 === 0 && x !== 0); return d.length ? Math.min(...d) : -1; }, o: 'a single integer' },
  { n: 'Count of Numbers Between Two Given Elements', f: a => { if (a.length < 2) return 0; const lo = Math.min(...a), hi = Math.max(...a); return a.filter(x => x > lo && x < hi).length; }, o: 'a single integer' },
  { n: 'Sum of Numbers That Appear More Than Once', f: a => { const freq = {}; a.forEach(x => { freq[x] = (freq[x] || 0) + 1; }); return a.filter(x => freq[x] > 1).reduce((s, x) => s + x, 0); }, o: 'a single integer' },
  { n: 'Count of Numbers That Appear Exactly Once', f: a => { const freq = {}; a.forEach(x => { freq[x] = (freq[x] || 0) + 1; }); return a.filter(x => freq[x] === 1).length; }, o: 'a single integer' },
  { n: 'Sum of First and Last Elements', f: a => a.length ? a[0] + a[a.length - 1] : 0, o: 'a single integer' },
  { n: 'Difference Between Largest and Smallest Two Elements', f: a => { if (a.length < 2) return 0; const s = [...a].sort((x, y) => y - x); return s[0] - s[1]; }, o: 'a single integer' },
  { n: 'Sum of Elements at Even Indices', f: a => a.filter((_, i) => i % 2 === 0).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Sum of Elements at Odd Indices', f: a => a.filter((_, i) => i % 2 === 1).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Product of Elements at Even Indices', f: a => a.filter((_, i) => i % 2 === 0).reduce((s, x) => s * x, 1), o: 'a single integer' },
  { n: 'Maximum Difference Between Consecutive Elements', f: a => { let m = 0; for (let i = 1; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - a[i - 1])); return m; }, o: 'a single integer' },
  { n: 'Count of Local Maxima', f: a => a.filter((x, i) => (i === 0 || x > a[i - 1]) && (i === a.length - 1 || x > a[i + 1])).length, o: 'a single integer' },
  { n: 'Count of Local Minima', f: a => a.filter((x, i) => (i === 0 || x < a[i - 1]) && (i === a.length - 1 || x < a[i + 1])).length, o: 'a single integer' },
  { n: 'Sum of Differences Between Consecutive Elements', f: a => { let s = 0; for (let i = 1; i < a.length; i++) s += Math.abs(a[i] - a[i - 1]); return s; }, o: 'a single integer' },
  { n: 'Count of Number Pairs That Sum to Even', f: a => { let c = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if ((a[i] + a[j]) % 2 === 0) c++; return c; }, o: 'a single integer' },
  { n: 'Count of Number Pairs That Sum to Odd', f: a => { let c = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if ((a[i] + a[j]) % 2 === 1) c++; return c; }, o: 'a single integer' },
  { n: 'Sum of All Pairwise Differences', f: a => { let s = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) s += Math.abs(a[i] - a[j]); return s; }, o: 'a single integer' },
  { n: 'Count of Prime Pairs', f: a => { let c = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (_isPrime(a[i] + a[j])) c++; return c; }, o: 'a single integer' },
  { n: 'Sum of Maximum Pairwise Product', f: a => { if (a.length < 2) return 0; const s = [...a].sort((x, y) => y - x); return s[0] * s[1]; }, o: 'a single integer' },
  { n: 'Sum of Minimum Pairwise Product', f: a => { if (a.length < 2) return 0; const s = [...a].sort((x, y) => x - y); return s[0] * s[1]; }, o: 'a single integer' },
  { n: 'Count of Numbers Divisible by 11', f: a => a.filter(x => x % 11 === 0).length, o: 'a single integer' },
  { n: 'Sum of Numbers Divisible by 13', f: a => a.filter(x => x % 13 === 0).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Numbers Divisible by Both 3 and 5', f: a => a.filter(x => x % 15 === 0).length, o: 'a single integer' },
  { n: 'Sum of Numbers Divisible by Both 2 and 3', f: a => a.filter(x => x % 6 === 0).reduce((s, x) => s + x, 0), o: 'a single integer' },
  { n: 'Count of Numbers Greater Than All Others', f: a => { const mx = Math.max(...a); return a.filter(x => x === mx).length; }, o: 'a single integer' },
  { n: 'Sum of Numbers Less Than All Others', f: a => { const mn = Math.min(...a); return a.filter(x => x === mn).reduce((s, x) => s + x, 0); }, o: 'a single integer' },
  { n: 'Count of Numbers With Increasing Digit Sum', f: a => { let c = 0; for (let i = 1; i < a.length; i++) { if (_digitSum(Math.abs(a[i])) > _digitSum(Math.abs(a[i - 1]))) c++; } return c; }, o: 'a single integer' },
  { n: 'Sum of Numbers With Decreasing Digit Sum', f: a => { let s = 0; for (let i = 1; i < a.length; i++) { if (_digitSum(Math.abs(a[i])) < _digitSum(Math.abs(a[i - 1]))) s += a[i]; } return s; }, o: 'a single integer' },
];

const MFILTERS = [
  { n: 'All Elements', f: () => true, d: 'all' },
  { n: 'Even Numbers', f: x => x % 2 === 0, d: 'even' },
  { n: 'Odd Numbers', f: x => x % 2 !== 0, d: 'odd' },
  { n: 'Positive Numbers', f: x => x > 0, d: 'positive' },
  { n: 'Negative Numbers', f: x => x < 0, d: 'negative' },
  { n: 'Non-Zero Numbers', f: x => x !== 0, d: 'non-zero' },
  { n: 'Numbers Divisible by 3', f: x => x % 3 === 0, d: 'divisible by 3' },
  { n: 'Numbers Divisible by 5', f: x => x % 5 === 0, d: 'divisible by 5' },
  { n: 'Numbers Divisible by 7', f: x => x % 7 === 0, d: 'divisible by 7' },
  { n: 'Numbers Greater Than 50', f: x => x > 50, d: 'greater than 50' },
  { n: 'Numbers Less Than -50', f: x => x < -50, d: 'less than -50' },
  { n: 'Prime Numbers', f: x => _isPrime(Math.abs(x)), d: 'prime' },
  { n: 'Single Digit Numbers', f: x => Math.abs(x) >= 0 && Math.abs(x) <= 9, d: 'single digit' },
  { n: 'Double Digit Numbers', f: x => Math.abs(x) >= 10 && Math.abs(x) <= 99, d: 'double digit' },
  { n: 'Numbers Divisible by 4', f: x => x % 4 === 0, d: 'divisible by 4' },
  { n: 'Multiples of 6', f: x => x % 6 === 0, d: 'multiples of 6' },
  { n: 'Numbers Greater Than 0 and Less Than 100', f: x => x > 0 && x < 100, d: 'between 0 and 100' },
  { n: 'Numbers Greater Than -100 and Less Than 0', f: x => x > -100 && x < 0, d: 'between -100 and 0' },
  { n: 'Perfect Square Numbers', f: x => x > 0 && Math.sqrt(x) === Math.floor(Math.sqrt(x)), d: 'perfect squares' },
  { n: 'Numbers Greater Than 100', f: x => x > 100, d: 'greater than 100' },
  { n: 'Numbers Less Than 10', f: x => x < 10, d: 'less than 10' },
  { n: 'Numbers Greater Than or Equal to 50', f: x => x >= 50, d: 'at least 50' },
  { n: 'Numbers Less Than or Equal to -50', f: x => x <= -50, d: 'at most -50' },
  { n: 'Multiples of 8', f: x => x % 8 === 0, d: 'multiples of 8' },
  { n: 'Numbers Between 20 and 200', f: x => x > 20 && x < 200, d: 'between 20 and 200' },
  { n: 'Numbers Divisible by 11', f: x => x % 11 === 0, d: 'divisible by 11' },
  { n: 'Numbers Divisible by 13', f: x => x % 13 === 0, d: 'divisible by 13' },
  { n: 'Numbers Greater Than 200', f: x => x > 200, d: 'greater than 200' },
  { n: 'Numbers Less Than -200', f: x => x < -200, d: 'less than -200' },
  { n: 'Numbers Between -50 and 50', f: x => x > -50 && x < 50, d: 'between -50 and 50' },
  { n: 'Numbers Divisible by 6 and Greater Than 10', f: x => x % 6 === 0 && x > 10, d: 'divisible by 6 and greater than 10' },
  { n: 'Numbers With All Same Digits', f: x => new Set(Math.abs(x).toString()).size === 1, d: 'with all same digits' },
  { n: 'Numbers With at Least Two Digits', f: x => Math.abs(x) >= 10, d: 'with at least two digits' },
  { n: 'Numbers Divisible by 17', f: x => x % 17 === 0, d: 'divisible by 17' },
  { n: 'Numbers Between -1000 and 1000', f: x => x > -1000 && x < 1000, d: 'between -1000 and 1000' },
  { n: 'Numbers Greater Than or Equal to 0', f: x => x >= 0, d: 'non-negative' },
  { n: 'Numbers Less Than or Equal to 0', f: x => x <= 0, d: 'non-positive' },
  { n: 'Numbers Divisible by 12', f: x => x % 12 === 0, d: 'divisible by 12' },
];

const MINPUTS = [
  {
    n: 'Array of Integers',
    gen: (rng, sz) => {
      const arr = Array.from({ length: sz }, () => rngRange(rng, -100, 100));
      return { line: `${sz}\n${arr.join(' ')}`, arr };
    },
    fmt: 'Line 1: N. Line 2: N integers.',
    c: sz => `1 ≤ N ≤ ${sz}, |arr[i]| ≤ 100`,
    d: 'given array', szR: [5, 8, 10, 15, 20],
  },
  {
    n: 'Array of Positive Integers',
    gen: (rng, sz) => {
      const arr = Array.from({ length: sz }, () => rngRange(rng, 1, 500));
      return { line: `${sz}\n${arr.join(' ')}`, arr };
    },
    fmt: 'Line 1: N. Line 2: N positive integers.',
    c: sz => `1 ≤ N ≤ ${sz}, 1 ≤ arr[i] ≤ 500`,
    d: 'given array of positive integers', szR: [5, 8, 10, 15, 20],
  },
  {
    n: 'Array of Large Integers',
    gen: (rng, sz) => {
      const arr = Array.from({ length: sz }, () => rngRange(rng, -100000, 100000));
      return { line: `${sz}\n${arr.join(' ')}`, arr };
    },
    fmt: 'Line 1: N. Line 2: N integers.',
    c: sz => `1 ≤ N ≤ ${sz}, |arr[i]| ≤ 10^5`,
    d: 'given array', szR: [5, 8, 10, 15],
  },
  {
    n: 'Array of Small Integers',
    gen: (rng, sz) => {
      const arr = Array.from({ length: sz }, () => rngRange(rng, -10, 10));
      return { line: `${sz}\n${arr.join(' ')}`, arr };
    },
    fmt: 'Line 1: N. Line 2: N integers.',
    c: sz => `1 ≤ N ≤ ${sz}, |arr[i]| ≤ 10`,
    d: 'given array of small integers', szR: [8, 10, 15, 20, 30],
  },
  {
    n: 'Sorted Array of Integers',
    gen: (rng, sz) => {
      const arr = Array.from({ length: sz }, () => rngRange(rng, -50, 100)).sort((a, b) => a - b);
      return { line: `${sz}\n${arr.join(' ')}`, arr };
    },
    fmt: 'Line 1: N. Line 2: N sorted integers.',
    c: sz => `1 ≤ N ≤ ${sz}, sorted in non-decreasing order`,
    d: 'given sorted array', szR: [5, 10, 15, 20, 30],
  },
  {
    n: 'Array of Digits',
    gen: (rng, sz) => {
      const arr = Array.from({ length: sz }, () => rngRange(rng, 0, 9));
      return { line: `${sz}\n${arr.join(' ')}`, arr };
    },
    fmt: 'Line 1: N. Line 2: N single digits (0-9).',
    c: sz => `1 ≤ N ≤ ${sz}, 0 ≤ arr[i] ≤ 9`,
    d: 'given array of digits', szR: [10, 15, 20, 30, 50],
  },
  {
    n: 'Two Arrays of Integers',
    gen: (rng, sz) => {
      const n = Math.min(sz, 10);
      const a = Array.from({ length: n }, () => rngRange(rng, -50, 50));
      const b = Array.from({ length: n }, () => rngRange(rng, -50, 50));
      return { line: `${n}\n${a.join(' ')}\n${b.join(' ')}`, arr: [...a, ...b] };
    },
    fmt: 'Line 1: N. Line 2: first array. Line 3: second array.',
    c: sz => `1 ≤ N ≤ ${Math.min(sz, 10)}, |arr[i]| ≤ 50`,
    d: 'concatenation of both arrays', szR: [5, 8, 10],
  },
  {
    n: 'String of Characters',
    gen: (rng, sz) => {
      const len = rngRange(rng, 5, Math.min(sz, 20));
      const s = Array.from({ length: len }, () => String.fromCharCode(rngRange(rng, 97, 122))).join('');
      const arr = s.split('').map(c => c.charCodeAt(0));
      return { line: s, arr };
    },
    fmt: 'A single string of lowercase letters.',
    c: sz => `1 ≤ |S| ≤ ${Math.min(sz, 20)}`,
    d: 'given string', szR: [5, 8, 10, 15],
  },
];

function _fmtTitle(op, filter, input) {
  if (filter.n === 'All Elements') return `${op.n} of ${input.n}`;
  return `${op.n} of ${filter.n} in ${input.n}`;
}

function _fmtDesc(op, filter, input) {
  if (filter.n === 'All Elements') return `Given ${input.d}, compute the ${op.n.toLowerCase()} of all elements.`;
  return `Given ${input.d}, compute the ${op.n.toLowerCase()} of all ${filter.d}.`;
}

const _DIFFICULTIES = [
  { l: 'Very Easy', n: 1, x: 10 },
  { l: 'Easy', n: 2, x: 20 },
  { l: 'Basic', n: 3, x: 30 },
  { l: 'Beginner', n: 4, x: 30 },
  { l: 'Intermediate', n: 5, x: 40 },
  { l: 'Advanced', n: 6, x: 55 },
  { l: 'Hard', n: 7, x: 70 },
  { l: 'Expert', n: 8, x: 85 },
];

const _TOPICS_EASY = ['Variables', 'Operators', 'Bitwise Basics', 'Logical Operators', 'If-Else', 'Nested If', 'Loops', 'Patterns', 'Basic Arrays', 'Strings Basics'];
const _TOPICS_MEDIUM = ['Functions', 'Recursion', 'Searching', 'Sorting', 'Prefix Sum', 'Two Pointers', 'Sliding Window', 'Stack', 'Queue', 'Linked List', 'HashMap'];
const _TOPICS_HARD = ['Trees', 'BST', 'Heap', 'Graph Basics', 'DFS', 'BFS', 'Dynamic Programming Basics', 'Greedy', 'Binary Search on Answer'];
const _TOPICS_EXPERT = ['Advanced DP', 'Segment Trees', 'Fenwick Tree', 'Tries', 'Union Find', 'Shortest Path', 'Topological Sort', 'Backtracking', 'Advanced Graphs', 'Competitive Programming Challenges'];

function _getDiff(inputIdx, opIdx) {
  const complexity = inputIdx * MOPS.length + opIdx;
  const total = MOPS.length * MINPUTS.length;
  const ratio = complexity / total;
  if (ratio < 0.25) return _DIFFICULTIES[1];
  if (ratio < 0.50) return _DIFFICULTIES[4];
  if (ratio < 0.75) return _DIFFICULTIES[6];
  return _DIFFICULTIES[7];
}

function _getTopic(opIdx, inputIdx) {
  const diff = _getDiff(inputIdx, opIdx);
  if (diff.l === 'Easy') return _TOPICS_EASY[(opIdx + inputIdx * 3) % _TOPICS_EASY.length];
  if (diff.l === 'Intermediate') return _TOPICS_MEDIUM[(opIdx + inputIdx * 5) % _TOPICS_MEDIUM.length];
  if (diff.l === 'Hard') return _TOPICS_HARD[(opIdx + inputIdx * 2) % _TOPICS_HARD.length];
  return _TOPICS_EXPERT[(opIdx + inputIdx * 7) % _TOPICS_EXPERT.length];
}

function generateMassiveProblemSet() {
  const problems = [];
  const seenTitles = new Set();
  let id = Math.max(...BEGINNER_PROBLEMS.map(p => p.id)) + 1;
  const topicFirstId = {};

  for (let oi = 0; oi < MOPS.length; oi++) {
    const op = MOPS[oi];
    for (let fi = 0; fi < MFILTERS.length; fi++) {
      const filter = MFILTERS[fi];
      for (let ii = 0; ii < MINPUTS.length; ii++) {
        const input = MINPUTS[ii];
        for (const sz of input.szR) {
          const title = _fmtTitle(op, filter, input);
          if (seenTitles.has(title)) continue;
          seenTitles.add(title);

          const rng = mulberry32(id * 7919 + oi * 313 + fi * 17 + ii * 5);
          const diff = _getDiff(ii, oi);
          const tag = _getTopic(oi, ii);

          const testCases = [];
          const examples = [];
          for (let t = 0; t < 5; t++) {
            const { line, arr } = input.gen(rng, sz);
            const filtered = arr.filter(filter.f);
            let output;
            if (filtered.length === 0) {
              output = op.n.includes('Count') || op.n.includes('Sum') || op.n.includes('Product') ? '0' : '-1';
            } else {
              const raw = op.f(filtered);
              output = Number.isInteger(raw) ? raw.toString() : raw.toString();
            }
            const tc = { input: line, output, hidden: t >= 3 };
            testCases.push(tc);
            if (t < 2) examples.push({ input: line, output, explanation: `Apply ${op.n.toLowerCase()} on ${filter.d}.` });
          }

          problems.push({
            id,
            title,
            difficulty: diff.l,
            difficultyLevel: diff.n,
            tags: [tag],
            xpReward: diff.x,
            description: _fmtDesc(op, filter, input),
            constraints: input.c(sz),
            inputFormat: input.fmt,
            outputFormat: `Output ${op.o}.`,
            examples,
            testCases,
            hints: [`Identify the ${filter.d} in the input.`, `Apply the ${op.n.toLowerCase()} operation.`],
            timeComplexity: 'O(n)',
            spaceComplexity: 'O(1)',
          });

          if (!topicFirstId[tag]) topicFirstId[tag] = [];
          topicFirstId[tag].push(id);
          id++;
        }
      }
    }
  }

  return { problems, topicFirstId };
}

const { problems: GENERATED_PROBLEMS, topicFirstId: topicProblemIds } = generateMassiveProblemSet();
const CODING_PROBLEMS = [...BEGINNER_PROBLEMS, ...GENERATED_PROBLEMS];
const TOTAL_PROBLEMS = CODING_PROBLEMS.length;

function populateCurriculum() {
  const beginnerIds = BEGINNER_PROBLEMS.map(p => p.id);
  CURRICULUM[0].problemIds = beginnerIds;

  const problemById = new Map(GENERATED_PROBLEMS.map(p => [p.id, p]));

  const tagByDiff = {};
  for (const [tag, ids] of Object.entries(topicProblemIds)) {
    for (const pid of ids) {
      const p = problemById.get(pid);
      if (!p) continue;
      const key = `${tag}::${p.difficulty}`;
      if (!tagByDiff[key]) tagByDiff[key] = [];
      tagByDiff[key].push(pid);
    }
  }

  for (let s = 1; s < CURRICULUM.length; s++) {
    const section = CURRICULUM[s];
    const sectionProblemIds = [];
    if (section.subSections) {
      for (let si = 0; si < section.subSections.length; si++) {
        const ss = section.subSections[si];
        const key = `${ss.topic}::${section.difficulty}`;
        const ids = tagByDiff[key] || [];
        if (ids.length === 0) {
          const diffSuffix = `::${section.difficulty}`;
          const diffPool = [];
          for (const [k, v] of Object.entries(tagByDiff)) {
            if (k.endsWith(diffSuffix)) diffPool.push(...v);
          }
          const perSS = Math.ceil(diffPool.length / section.subSections.length);
          const start = si * perSS;
          ss.problems = diffPool.slice(start, start + perSS);
        } else {
          ss.problems = ids;
        }
        sectionProblemIds.push(...ss.problems);
      }
    }
    section.problemIds = sectionProblemIds;
  }
}

populateCurriculum();

export { CODING_PROBLEMS, TOTAL_PROBLEMS, CURRICULUM };

export function getProblem(id) {
  return CODING_PROBLEMS.find(p => p.id === id) || null;
}

export function getProblemsSlice(start, count) {
  return CODING_PROBLEMS.slice(start - 1, start - 1 + count);
}
