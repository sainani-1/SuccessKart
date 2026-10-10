// Curated fallback questions for the Daily Coding Streak.
//
// Every entry exposes a deterministic case generator `gen(i)`. Index 0 is the
// sample shown to the student, indexes 1..5 are the remaining visible tests and
// indexes 6..40 are the hidden tests. Because the output is computed here, the
// expected output can never drift away from the sample input.

export const VISIBLE_TEST_COUNT = 6;
export const HIDDEN_TEST_COUNT = 35;
export const TOTAL_TEST_COUNT = VISIBLE_TEST_COUNT + HIDDEN_TEST_COUNT;

const seededRandom = (seed) => {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

const randomInt = (rnd, min, max) => min + Math.floor(rnd() * (max - min + 1));

const factorial = (n) => {
  let out = 1;
  for (let k = 2; k <= n; k += 1) out *= k;
  return out;
};

const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));

const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const isPowerOfTwo = (n) => n > 0 && (n & (n - 1)) === 0;

const digitSum = (n) => String(n).split('').reduce((sum, digit) => sum + Number(digit), 0);

const isPrime = (n) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d += 1) if (n % d === 0) return false;
  return true;
};

const fib = (n) => {
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i += 1) {
    const next = a + b;
    a = b;
    b = next;
  }
  return a;
};

const longestPalindromicLength = (text) => {
  let best = text.length ? 1 : 0;
  const expand = (left, right) => {
    let l = left;
    let r = right;
    while (l >= 0 && r < text.length && text[l] === text[r]) {
      if (r - l + 1 > best) best = r - l + 1;
      l -= 1;
      r += 1;
    }
  };
  for (let i = 0; i < text.length; i += 1) {
    expand(i, i);
    expand(i, i + 1);
  }
  return best;
};

const stockSpans = (prices) =>
  prices.map((price, index) => {
    let span = 1;
    let day = index - 1;
    while (day >= 0 && prices[day] <= price) {
      span += 1;
      day -= 1;
    }
    return span;
  });

const subarrayCountWithSum = (values, target) => {
  let count = 0;
  for (let start = 0; start < values.length; start += 1) {
    let sum = 0;
    for (let end = start; end < values.length; end += 1) {
      sum += values[end];
      if (sum === target) count += 1;
    }
  }
  return count;
};

const maxSubarraySum = (values) => {
  let best = values[0];
  let current = values[0];
  for (let i = 1; i < values.length; i += 1) {
    current = Math.max(values[i], current + values[i]);
    best = Math.max(best, current);
  }
  return best;
};

const activityCount = (activities) => {
  const sorted = [...activities].sort((a, b) => a[1] - b[1]);
  let count = 0;
  let lastEnd = -Infinity;
  sorted.forEach(([start, end]) => {
    if (start >= lastEnd) {
      count += 1;
      lastEnd = end;
    }
  });
  return count;
};

const gridOutput = (cells, transform) => transform(cells).map((row) => row.join(' ')).join('\n');

const transposeGrid = (cells) => [0, 1, 2].map((column) => [0, 1, 2].map((row) => cells[row * 3 + column]));

const spiralGrid = (cells) => [[cells[0], cells[1], cells[2], cells[5], cells[8], cells[7], cells[6], cells[3], cells[4]]];

const makeGrid = (index) => {
  if (index === 0) return [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const rnd = seededRandom(index + 11);
  return Array.from({ length: 9 }, () => randomInt(rnd, -40, 60));
};

export const FALLBACK_POOL = {
  easy: [
    {
      title: 'Sum of Two Numbers',
      description: 'Read two integers and print their sum.\n\nInput: two integers a and b separated by a single space.\nOutput: one integer, a + b.',
      constraints: '-1000 <= a, b <= 1000',
      topics: ['Math', 'Basic Input/Output'],
      hints: ['Split the input line on spaces and convert both parts to integers.', 'Print a + b.'],
      gen: (i) => {
        if (i === 0) return { input: '12 30', output: '42' };
        const rnd = seededRandom(i + 1);
        const a = randomInt(rnd, -1000, 1000);
        const b = randomInt(rnd, -1000, 1000);
        return { input: `${a} ${b}`, output: String(a + b) };
      },
    },
    {
      title: 'Even or Odd',
      description: 'Given an integer N, print "Even" if N is even, otherwise print "Odd".\n\nInput: one integer N.\nOutput: the word Even or Odd.',
      constraints: '1 <= N <= 10^5',
      topics: ['Math', 'Conditionals'],
      hints: ['A number is even when the remainder after dividing by 2 is 0.', 'Print the matching word.'],
      gen: (i) => {
        const n = i === 0 ? 7 : i * 137 + 2;
        return { input: String(n), output: n % 2 === 0 ? 'Even' : 'Odd' };
      },
    },
    {
      title: 'Largest of Three',
      description: 'Given three integers, print the largest one.\n\nInput: three integers separated by spaces.\nOutput: one integer, the maximum of the three.',
      constraints: '-10^6 <= values <= 10^6',
      topics: ['Math', 'Conditionals'],
      hints: ['Compare the three values two at a time.', 'Math.max works too.'],
      gen: (i) => {
        if (i === 0) return { input: '5 19 11', output: '19' };
        const rnd = seededRandom(i + 1);
        const a = randomInt(rnd, -1000, 1000);
        const b = randomInt(rnd, -1000, 1000);
        const c = randomInt(rnd, -1000, 1000);
        return { input: `${a} ${b} ${c}`, output: String(Math.max(a, b, c)) };
      },
    },
    {
      title: 'Factorial of N',
      description: 'Print the factorial of N (N!).\n\nInput: one integer N.\nOutput: one integer, N factorial.',
      constraints: '0 <= N <= 12',
      topics: ['Math', 'Recursion'],
      hints: ['0! is 1.', 'Multiply the integers from 1 up to N.'],
      gen: (i) => {
        const n = i === 0 ? 5 : i % 13;
        return { input: String(n), output: String(factorial(n)) };
      },
    },
    {
      title: 'Reverse a Number',
      description: 'Print the reverse of the given integer. Leading zeros drop away naturally, so 120 becomes 21.\n\nInput: one integer N.\nOutput: one integer, the reversed value.',
      constraints: '1 <= N <= 10^9',
      topics: ['Math', 'Strings'],
      hints: ['Convert the number to a string and reverse it.', 'Convert back to an integer so leading zeros disappear.'],
      gen: (i) => {
        if (i === 0) return { input: '120', output: '21' };
        const rnd = seededRandom(i + 1);
        const n = randomInt(rnd, 1, 1000000000);
        return { input: String(n), output: String(Number(String(n).split('').reverse().join(''))) };
      },
    },
    {
      title: 'Count Vowels',
      description: 'Count the vowels (a, e, i, o, u) in the given word. Both uppercase and lowercase count.\n\nInput: one word.\nOutput: one integer, the number of vowels.',
      constraints: '1 <= length <= 1000',
      topics: ['Strings', 'Counting'],
      hints: ['Traverse the word once and test each character.', 'Remember both cases.'],
      gen: (i) => {
        const words = ['SuccessKart', 'coding', 'streak', 'aeiou', 'Blueprint', 'Championship', 'routine', 'Education', 'Automation', 'Queue'];
        const word = words[i % words.length];
        return { input: word, output: String((word.match(/[aeiou]/gi) || []).length) };
      },
    },
    {
      title: 'Sum of Digits',
      description: 'Print the sum of the digits of the given positive integer.\n\nInput: one positive integer N.\nOutput: one integer, the sum of its digits.',
      constraints: '1 <= N <= 10^9',
      topics: ['Math', 'Strings'],
      hints: ['Take the number modulo 10 repeatedly, or walk through its digits as text.', 'Accumulate the digits in a total.'],
      gen: (i) => {
        if (i === 0) return { input: '472', output: '13' };
        const rnd = seededRandom(i + 1);
        const n = randomInt(rnd, 1, 1000000000);
        return { input: String(n), output: String(digitSum(n)) };
      },
    },
    {
      title: 'Print First N Multiples of 5',
      description: 'Print the first N multiples of 5 separated by a single space.\n\nInput: one integer N.\nOutput: N integers separated by spaces.',
      constraints: '1 <= N <= 100',
      topics: ['Loops', 'Basic Input/Output'],
      hints: ['Loop i from 1 to N.', 'Print 5 * i with a space between values.'],
      gen: (i) => {
        const n = i === 0 ? 4 : (i % 20) + 1;
        return { input: String(n), output: Array.from({ length: n }, (_, k) => (k + 1) * 5).join(' ') };
      },
    },
    {
      title: 'Leap Year Check',
      description: 'Print "Yes" if the given year is a leap year, otherwise print "No".\n\nInput: one year.\nOutput: Yes or No.',
      constraints: '1900 <= year <= 3000',
      topics: ['Math', 'Conditionals'],
      hints: ['A leap year is divisible by 4, except century years which must be divisible by 400.', '2000 is a leap year, 1900 is not.'],
      gen: (i) => {
        const year = i === 0 ? 2024 : 1900 + ((i * 13) % 1100);
        return { input: String(year), output: isLeapYear(year) ? 'Yes' : 'No' };
      },
    },
    {
      title: 'Power of Two',
      description: 'Print "Yes" if N is a power of two, otherwise print "No".\n\nInput: one integer N.\nOutput: Yes or No.',
      constraints: '1 <= N <= 10^9',
      topics: ['Math', 'Bit Manipulation'],
      hints: ['A power of two has exactly one bit set.', 'N & (N - 1) equals 0 for every power of two.'],
      gen: (i) => {
        const values = [16, 1, 2, 4, 8, 32, 64, 1024, 65536, 1000, 17, 999999937];
        const n = values[i % values.length];
        return { input: String(n), output: isPowerOfTwo(n) ? 'Yes' : 'No' };
      },
    },
    {
      title: 'Second Largest',
      description: 'Given four distinct integers, print the second largest.\n\nInput: four distinct integers separated by spaces.\nOutput: one integer, the second largest value.',
      constraints: 'All four values are distinct, -10^6 <= value <= 10^6',
      topics: ['Arrays', 'Sorting'],
      hints: ['Sort the four values in descending order.', 'The answer sits at index 1 after sorting.'],
      gen: (i) => {
        if (i === 0) return { input: '4 9 2 7', output: '7' };
        const rnd = seededRandom(i + 1);
        const values = new Set();
        while (values.size < 4) values.add(randomInt(rnd, -100000, 100000));
        const list = [...values];
        return { input: list.join(' '), output: String([...list].sort((a, b) => b - a)[1]) };
      },
    },
    {
      title: 'String Length',
      description: 'Print the length of the given word.\n\nInput: one word without spaces.\nOutput: one integer, the number of characters.',
      constraints: '1 <= length <= 1000',
      topics: ['Strings', 'Basic Input/Output'],
      hints: ['Read the word and take its length.'],
      gen: (i) => {
        const words = ['coding', 'success', 'streak', 'javascript', 'python', 'java', 'cplusplus', 'algorithm', 'database', 'compiler', 'function', 'variable'];
        const word = words[i % words.length];
        return { input: word, output: String(word.length) };
      },
    },
    {
      title: 'Absolute Difference',
      description: 'Print the absolute difference between two integers.\n\nInput: two integers a and b separated by a space.\nOutput: one integer, |a - b|.',
      constraints: '-10^6 <= a, b <= 10^6',
      topics: ['Math', 'Conditionals'],
      hints: ['Subtract the two values.', 'Return the absolute value of the result.'],
      gen: (i) => {
        if (i === 0) return { input: '15 40', output: '25' };
        const rnd = seededRandom(i + 1);
        const a = randomInt(rnd, -1000000, 1000000);
        const b = randomInt(rnd, -1000000, 1000000);
        return { input: `${a} ${b}`, output: String(Math.abs(a - b)) };
      },
    },
    {
      title: 'Table of N',
      description: 'Print the multiplication table of N from 1 to 10, one line per entry in the format "N x i = product".\n\nInput: one integer N.\nOutput: 10 lines, each "N x i = product".',
      constraints: '1 <= N <= 20',
      topics: ['Loops', 'Strings'],
      hints: ['Loop i from 1 to 10 inclusive.', 'Print all ten lines, not only the first one.'],
      gen: (i) => {
        const n = i === 0 ? 7 : (i % 20) + 1;
        return {
          input: String(n),
          output: Array.from({ length: 10 }, (_, k) => `${n} x ${k + 1} = ${n * (k + 1)}`).join('\n'),
        };
      },
    },
  ],
  medium: [
    {
      title: 'Output of Loop Sum',
      description: 'What does this Python program print?\n\nsum = 0\nfor i in range(1, 6):\n    if i % 2 == 0:\n        sum += i\nprint(sum)\n\nThere is no input. Print the single value produced by the program.',
      constraints: 'range end is exclusive',
      topics: ['Loops', 'Python'],
      hints: ['range(1, 6) visits 1, 2, 3, 4, 5.', 'Only the even values are added: 2 + 4.'],
      gen: () => ({ input: '', output: '6' }),
    },
    {
      title: 'Fibonacci nth Term',
      description: 'Print the Nth Fibonacci number where F(0) = 0 and F(1) = 1.\n\nInput: one integer N.\nOutput: one integer, F(N).',
      constraints: '0 <= N <= 30',
      topics: ['Dynamic Programming', 'Recursion'],
      hints: ['Build the sequence up to N instead of recursing twice.', 'F(9) is 34.'],
      gen: (i) => {
        const n = i === 0 ? 9 : i % 31;
        return { input: String(n), output: String(fib(n)) };
      },
    },
    {
      title: 'Count Distinct Words',
      description: 'Count the distinct words in the given line. Words are split by spaces and the comparison ignores case.\n\nInput: one line of words.\nOutput: one integer, the number of distinct words.',
      constraints: '1 <= words <= 100',
      topics: ['Strings', 'Hash Set'],
      hints: ['Lowercase every word before comparing.', 'Store the words in a set and print its size.'],
      gen: (i) => {
        const lines = ['Code code CODE smart', 'daily daily streak', 'learn learn learn', 'one two three four', 'SuccessKart successKART', 'a b a b c', 'alpha beta gamma', 'repeat repeat new', 'x y z x', 'sky blue sky', 'run run run run', 'hello world hello'];
        const line = lines[i % lines.length];
        return { input: line, output: String(new Set(line.split(/\s+/).map((word) => word.toLowerCase())).size) };
      },
    },
    {
      title: 'Array Rotation Output',
      description: 'What is the output of the list [1, 2, 3, 4, 5] after one right rotation?\n\nThere is no input. Print the rotated list in Python list syntax.',
      constraints: 'Python list syntax',
      topics: ['Arrays', 'Python'],
      hints: ['The last element moves to the front.', 'Keep the remaining order unchanged.'],
      gen: () => ({ input: '', output: '[5, 1, 2, 3, 4]' }),
    },
    {
      title: 'GCD of Two Numbers',
      description: 'Print the greatest common divisor of two integers.\n\nInput: two integers a and b separated by a space.\nOutput: one integer, gcd(a, b).',
      constraints: '1 <= a, b <= 10^9',
      topics: ['Math', 'Number Theory'],
      hints: ['Use Euclid\'s algorithm: gcd(a, b) = gcd(b, a % b).', 'Stop when the remainder becomes 0.'],
      gen: (i) => {
        if (i === 0) return { input: '18 24', output: '6' };
        const rnd = seededRandom(i + 1);
        const a = randomInt(rnd, 1, 1000000);
        const b = randomInt(rnd, 1, 1000000);
        return { input: `${a} ${b}`, output: String(gcd(a, b)) };
      },
    },
    {
      title: 'Prime Count in Range',
      description: 'Count how many prime numbers exist in the inclusive range [L, R].\n\nInput: two integers L and R separated by a space.\nOutput: one integer, the number of primes in the range.',
      constraints: '1 <= L <= R <= 10^5',
      topics: ['Math', 'Prime Numbers'],
      hints: ['Test each value in the range for primality.', 'A value is prime when nothing from 2 up to its square root divides it.'],
      gen: (i) => {
        if (i === 0) return { input: '10 30', output: '6' };
        const rnd = seededRandom(i + 1);
        const left = randomInt(rnd, 1, 900);
        const right = left + randomInt(rnd, 20, 200);
        let count = 0;
        for (let n = left; n <= right; n += 1) if (isPrime(n)) count += 1;
        return { input: `${left} ${right}`, output: String(count) };
      },
    },
    {
      title: 'Frequency of a Character',
      description: 'Print how many times the character ch occurs in the given word.\n\nInput: a word followed by a single character, separated by a space.\nOutput: one integer. The comparison is case sensitive.',
      constraints: 'Case sensitive, 1 <= word length <= 1000',
      topics: ['Strings', 'Counting'],
      hints: ['Walk through the word once.', 'Only count exact character matches.'],
      gen: (i) => {
        if (i === 0) return { input: 'banana a', output: '3' };
        const words = ['banana', 'mississippi', 'success', 'hello', 'character', 'repeat', 'balance', 'cocoa', 'seventeen', 'rare'];
        const word = words[i % words.length];
        const ch = word[i % word.length];
        return { input: `${word} ${ch}`, output: String(word.split(ch).length - 1) };
      },
    },
    {
      title: 'Output of String Slicing',
      description: 'What does this Python program print?\n\ns = "SuccessKart"\nprint(s[3:8])\n\nThere is no input. Print the exact string produced by print().',
      constraints: 'Zero-indexed slicing, the end index is exclusive',
      topics: ['Strings', 'Python'],
      hints: ['Count positions from 0.', 'Characters 3 to 7 inclusive are printed.'],
      gen: () => ({ input: '', output: 'cessK' }),
    },
    {
      title: 'Armstrong Number Check',
      description: 'Print "Yes" if N is an Armstrong number (the sum of the cubes of its digits equals N), otherwise print "No".\n\nInput: one integer N.\nOutput: Yes or No.',
      constraints: '1 <= N <= 10^6',
      topics: ['Math', 'Digits'],
      hints: ['Extract every digit of N.', 'Cube each digit, add them up and compare with N.'],
      gen: (i) => {
        if (i === 0) return { input: '153', output: 'Yes' };
        const rnd = seededRandom(i + 1);
        const n = randomInt(rnd, 1, 999999);
        const cubeSum = String(n).split('').reduce((sum, digit) => sum + Number(digit) ** 3, 0);
        return { input: String(n), output: cubeSum === n ? 'Yes' : 'No' };
      },
    },
    {
      title: 'Longest Word Length',
      description: 'Print the length of the longest word in the given line. Words are separated by spaces.\n\nInput: one line of words.\nOutput: one integer, the length of the longest word.',
      constraints: '1 <= words <= 100',
      topics: ['Strings', 'Splitting'],
      hints: ['Split the line on spaces.', 'Take the maximum of the resulting lengths.'],
      gen: (i) => {
        const lines = ['learn coding every day', 'short and crisp', 'persistent effort wins', 'tiny', 'success needs consistency', 'break the problem down', 'practice makes perfect', 'readable code matters', 'think before you code', 'small steps daily'];
        const line = lines[i % lines.length];
        return { input: line, output: String(Math.max(...line.split(/\s+/).map((word) => word.length))) };
      },
    },
  ],
  hard: [
    {
      title: 'Output of Nested Loops',
      description: 'What does this Python program print?\n\ncount = 0\nfor i in range(4):\n    for j in range(i, 4):\n        count += 1\nprint(count)\n\nThere is no input. Print the single value produced by the program.',
      constraints: 'Standard Python ranges, the end is exclusive',
      topics: ['Loops', 'Python'],
      hints: ['List the pairs (i, j) visited by the loops.', 'The inner loop runs 4 - i times for each i.'],
      gen: () => ({ input: '', output: '10' }),
    },
    {
      title: 'Matrix Transpose',
      description: 'Given nine integers describing a 3x3 matrix in row-major order, print its transpose: three lines, each holding one row of the result.\n\nInput: nine integers separated by spaces (row 1, then row 2, then row 3).\nOutput: three lines with three integers each, separated by spaces.',
      constraints: 'The matrix is always 3x3',
      topics: ['Arrays', 'Matrix'],
      hints: ['The element at row r, column c moves to row c, column r.', 'Build the output column by column.'],
      gen: (i) => {
        const cells = makeGrid(i);
        return { input: cells.join(' '), output: gridOutput(cells, transposeGrid) };
      },
    },
    {
      title: 'Longest Palindromic Substring',
      description: 'Print the length of the longest palindromic substring of the given lowercase string.\n\nInput: one lowercase string.\nOutput: one integer, that length.',
      constraints: '1 <= length <= 1000',
      topics: ['Strings', 'Two Pointers'],
      hints: ['Expand around every possible centre.', 'Check both odd and even length palindromes.'],
      gen: (i) => {
        const texts = ['babad', 'abba', 'forgeeksskeegfor', 'abcde', 'aaaa', 'racecar', 'xyzzyx', 'madamimadam', 'ccccc', 'abacdfgdcaba'];
        const text = texts[i % texts.length];
        return { input: text, output: String(longestPalindromicLength(text)) };
      },
    },
    {
      title: 'Stock Span Problem',
      description: 'For every day print the stock span: the number of consecutive days ending on that day (counting today) whose price is less than or equal to today\'s price.\n\nInput: one or more prices separated by spaces.\nOutput: one span per price, separated by spaces.',
      constraints: '1 <= number of prices <= 1000, 1 <= price <= 10^5',
      topics: ['Stacks', 'Monotonic Stack'],
      hints: ['Walk left while the previous price is not greater.', 'The span of day 0 is always 1.'],
      gen: (i) => {
        if (i === 0) return { input: '100 80 60 70 60 75 85', output: stockSpans([100, 80, 60, 70, 60, 75, 85]).join(' ') };
        const rnd = seededRandom(i + 5);
        const prices = Array.from({ length: 7 }, () => randomInt(rnd, 10, 500));
        return { input: prices.join(' '), output: stockSpans(prices).join(' ') };
      },
    },
    {
      title: 'Number of Subarrays With Sum K',
      description: 'Count the contiguous subarrays whose sum equals K.\n\nInput: the first line holds two integers n and K, the second line holds the n integers of the array.\nOutput: one integer, the number of such subarrays.',
      constraints: '1 <= n <= 200, -1000 <= array values and K <= 1000',
      topics: ['Arrays', 'Prefix Sum', 'Hash Map'],
      hints: ['Track how many prefix sums you have seen.', 'A subarray from i to j sums to K when prefix[j] - prefix[i - 1] equals K.'],
      gen: (i) => {
        if (i === 0) return { input: '3 2\n1 1 1', output: '2' };
        const rnd = seededRandom(i + 7);
        const n = randomInt(rnd, 4, 12);
        const values = Array.from({ length: n }, () => randomInt(rnd, -3, 3));
        const target = randomInt(rnd, -3, 5);
        return { input: `${n} ${target}\n${values.join(' ')}`, output: String(subarrayCountWithSum(values, target)) };
      },
    },
    {
      title: 'Recursion Output',
      description: 'What does this Python program print?\n\ndef f(n):\n    if n <= 1:\n        return 1\n    return n * f(n - 1)\n\nprint(f(5))\n\nThere is no input. Print the single value produced by the program.',
      constraints: 'Standard Python recursion',
      topics: ['Recursion', 'Python'],
      hints: ['Unfold the call: f(5) = 5 * f(4).', 'The base case returns 1.'],
      gen: () => ({ input: '', output: '120' }),
    },
    {
      title: 'Merge Two Sorted Lists',
      description: 'Merge the sorted lists [2, 7, 10] and [1, 4, 6, 9] into one sorted list and print it in Python list syntax.\n\nThere is no input. Print the merged list.',
      constraints: 'Both lists are already sorted and contain no duplicates',
      topics: ['Arrays', 'Two Pointers'],
      hints: ['Walk both lists at once and always take the smaller value.', 'Print the result with ", " between values.'],
      gen: () => ({ input: '', output: '[1, 2, 4, 6, 7, 9, 10]' }),
    },
    {
      title: 'Kadane Maximum Subarray Sum',
      description: 'Print the maximum sum of any contiguous subarray of the given array.\n\nInput: the first line holds n, the second line holds the n integers of the array.\nOutput: one integer, the maximum subarray sum.',
      constraints: '1 <= n <= 200, at least one element exists',
      topics: ['Arrays', 'Dynamic Programming'],
      hints: ['Decide for every position whether to extend the previous subarray or start a new one.', 'Keep the best sum seen so far.'],
      gen: (i) => {
        if (i === 0) return { input: '9\n-2 1 -3 4 -1 2 1 -5 4', output: '6' };
        const rnd = seededRandom(i + 13);
        const n = randomInt(rnd, 4, 14);
        const values = Array.from({ length: n }, () => randomInt(rnd, -20, 20));
        return { input: `${n}\n${values.join(' ')}`, output: String(maxSubarraySum(values)) };
      },
    },
    {
      title: 'Spiral Order Output',
      description: 'Given nine integers describing a 3x3 matrix in row-major order, print the matrix in spiral order: the top row left to right, then down the right column, the bottom row right to left, up the left column, and finally the centre value.\n\nInput: nine integers separated by spaces.\nOutput: nine integers separated by spaces.',
      constraints: 'The matrix is always 3x3',
      topics: ['Arrays', 'Matrix'],
      hints: ['Peel the matrix one layer at a time.', 'For 3x3 the order is 0,1,2,5,8,7,6,3,4 in index order.'],
      gen: (i) => {
        const cells = makeGrid(i);
        return { input: cells.join(' '), output: gridOutput(cells, spiralGrid).replace(/\n/g, ' ') };
      },
    },
    {
      title: 'Activity Selection Count',
      description: 'You are given n activities described by a start and an end time. Select the maximum number of activities that do not overlap: an activity may start exactly when the previous one ends. Intervals are half-open [start, end).\n\nInput: the first line holds n, followed by n lines each containing start end.\nOutput: one integer, the maximum number of activities.',
      constraints: '1 <= n <= 100, 0 <= start < end <= 1000',
      topics: ['Greedy', 'Sorting'],
      hints: ['Sort the activities by their end time.', 'Take an activity whenever its start is not earlier than the last chosen end.'],
      gen: (i) => {
        if (i === 0) return { input: '5\n1 3\n2 4\n3 5\n0 7\n5 7', output: '3' };
        const rnd = seededRandom(i + 17);
        const n = randomInt(rnd, 3, 8);
        const activities = Array.from({ length: n }, () => {
          const start = randomInt(rnd, 0, 40);
          return [start, start + randomInt(rnd, 1, 20)];
        });
        return {
          input: `${n}\n${activities.map(([start, end]) => `${start} ${end}`).join('\n')}`,
          output: String(activityCount(activities)),
        };
      },
    },
  ],
};

const distinctExamples = (cases, limit = 3) => {
  const seen = new Set();
  const examples = [];
  cases.forEach((testCase) => {
    const key = `${testCase.input}\u0000${testCase.output}`;
    if (seen.has(key) || examples.length >= limit) return;
    seen.add(key);
    examples.push({ input: testCase.input, output: testCase.output, explanation: '' });
  });
  return examples;
};

// Builds a complete question row (including all 41 test cases) from a pool entry.
export const buildPoolQuestion = (entry) => {
  const cases = Array.from({ length: TOTAL_TEST_COUNT }, (_, index) => entry.gen(index));
  const sample = cases[0];
  return {
    title: entry.title,
    description: entry.description,
    constraints: entry.constraints || '',
    topics: entry.topics || [],
    hints: entry.hints || [],
    companies: entry.companies || [],
    examples: distinctExamples(cases),
    sample_input: sample.input,
    sample_output: sample.output,
    expected_answer: sample.output,
    input_format: '',
    output_format: '',
    test_cases: cases.map((testCase, index) => ({
      input: testCase.input,
      output: testCase.output,
      hidden: index >= VISIBLE_TEST_COUNT,
    })),
    source: 'pool',
  };
};
