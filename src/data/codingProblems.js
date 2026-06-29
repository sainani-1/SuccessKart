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

const TOTAL_PROBLEMS = 50001;

function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const XPS = [10, 15, 20, 30, 45, 65, 90, 120, 160, 200];

const TOPIC_TEMPLATES = {
  'Variables': [
    { t: 'Swap Two Numbers', desc: 'Read two integers and swap their values.', constr: '-10^9 ≤ a, b ≤ 10^9', inFmt: 'Two integers a and b.', outFmt: 'Print a and b after swapping.', tc: [{i:'5 3',o:'3 5'},{i:'-1 4',o:'4 -1'},{i:'0 0',o:'0 0'},{i:'100 -200',o:'-200 100'},{i:'999 1',o:'1 999'}] },
    { t: 'Variable Declaration Practice', desc: 'Read a number and print it back with a message.', constr: '-10^9 ≤ n ≤ 10^9', inFmt: 'A single integer.', outFmt: 'Print "You entered: X" where X is the number.', tc: [{i:'42',o:'You entered: 42'},{i:'-7',o:'You entered: -7'},{i:'0',o:'You entered: 0'},{i:'9999',o:'You entered: 9999'},{i:'-12345',o:'You entered: -12345'}] },
    { t: 'Type Conversion', desc: 'Read a float and print its integer part and the original number.', constr: '-10^6 ≤ f ≤ 10^6', inFmt: 'A floating point number.', outFmt: 'Print "Integer: X Float: Y"', tc: [{i:'3.14',o:'Integer: 3 Float: 3.14'},{i:'-2.5',o:'Integer: -2 Float: -2.5'},{i:'0.0',o:'Integer: 0 Float: 0.0'},{i:'100.99',o:'Integer: 100 Float: 100.99'},{i:'-0.5',o:'Integer: 0 Float: -0.5'}] },
    { t: 'Multiple Assignment', desc: 'Read three numbers and print them in reverse order.', constr: '-10^9 ≤ a,b,c ≤ 10^9', inFmt: 'Three integers.', outFmt: 'Three integers in reverse order.', tc: [{i:'1 2 3',o:'3 2 1'},{i:'4 5 6',o:'6 5 4'},{i:'-1 -2 -3',o:'-3 -2 -1'},{i:'0 0 0',o:'0 0 0'},{i:'100 200 300',o:'300 200 100'}] },
  ],
  'Operators': [
    { t: 'Arithmetic Operations', desc: 'Read two integers and print their sum, difference, product, quotient, and remainder.', constr: '1 ≤ a,b ≤ 10^6', inFmt: 'Two integers.', outFmt: 'Five lines: sum, difference, product, quotient, remainder.', tc: [{i:'10 3',o:'13\n7\n30\n3\n1'},{i:'5 2',o:'7\n3\n10\n2\n1'},{i:'100 4',o:'104\n96\n400\n25\n0'},{i:'7 7',o:'14\n0\n49\n1\n0'},{i:'1 1',o:'2\n0\n1\n1\n0'}] },
    { t: 'Bitwise AND', desc: 'Read two integers and print their bitwise AND.', constr: '0 ≤ a,b ≤ 10^9', inFmt: 'Two integers.', outFmt: 'Bitwise AND result.', tc: [{i:'5 3',o:'1'},{i:'8 7',o:'0'},{i:'15 10',o:'10'},{i:'0 255',o:'0'},{i:'1024 2048',o:'0'}] },
    { t: 'Logical Operators', desc: 'Read three booleans (0/1) and print AND, OR, XOR of all three.', constr: '0 or 1', inFmt: 'Three integers (0 or 1).', outFmt: 'Three lines: AND, OR, XOR.', tc: [{i:'1 1 0',o:'0\n1\n0'},{i:'1 1 1',o:'1\n1\n1'},{i:'0 0 0',o:'0\n0\n0'},{i:'1 0 1',o:'0\n1\n0'},{i:'0 1 0',o:'0\n1\n1'}] },
    { t: 'Modulo Master', desc: 'Read N and K. Print N modulo K.', constr: '1 ≤ N ≤ 10^9, 1 ≤ K ≤ 10^5', inFmt: 'Two integers N and K.', outFmt: 'N % K.', tc: [{i:'17 5',o:'2'},{i:'100 7',o:'2'},{i:'81 9',o:'0'},{i:'12345 100',o:'45'},{i:'0 1',o:'0'}] },
  ],
  'Loops': [
    { t: 'Print 1 to N', desc: 'Print numbers from 1 to N.', constr: '1 ≤ N ≤ 1000', inFmt: 'Single integer N.', outFmt: 'Numbers from 1 to N separated by space.', tc: [{i:'5',o:'1 2 3 4 5'},{i:'3',o:'1 2 3'},{i:'1',o:'1'},{i:'10',o:'1 2 3 4 5 6 7 8 9 10'},{i:'7',o:'1 2 3 4 5 6 7'}] },
    { t: 'Sum of N Numbers', desc: 'Read N followed by N integers. Print their sum.', constr: '1 ≤ N ≤ 1000, -10^6 ≤ each ≤ 10^6', inFmt: 'First line N. Second line N integers.', outFmt: 'Sum of the N integers.', tc: [{i:'5\n1 2 3 4 5',o:'15'},{i:'3\n-1 0 1',o:'0'},{i:'1\n42',o:'42'},{i:'4\n100 200 300 400',o:'1000'},{i:'6\n-5 -4 -3 -2 -1 0',o:'-15'}] },
    { t: 'Multiplication Table', desc: 'Read N and print its multiplication table from 1 to 10.', constr: '1 ≤ N ≤ 100', inFmt: 'Single integer N.', outFmt: '"N x i = result" for i = 1 to 10.', tc: [{i:'5',o:'5 x 1 = 5\n5 x 2 = 10\n5 x 3 = 15\n5 x 4 = 20\n5 x 5 = 25\n5 x 6 = 30\n5 x 7 = 35\n5 x 8 = 40\n5 x 9 = 45\n5 x 10 = 50'},{i:'3',o:'3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n3 x 5 = 15\n3 x 6 = 18\n3 x 7 = 21\n3 x 8 = 24\n3 x 9 = 27\n3 x 10 = 30'},{i:'10',o:'10 x 1 = 10\n10 x 2 = 20\n10 x 3 = 30\n10 x 4 = 40\n10 x 5 = 50\n10 x 6 = 60\n10 x 7 = 70\n10 x 8 = 80\n10 x 9 = 90\n10 x 10 = 100'},{i:'7',o:'7 x 1 = 7\n7 x 2 = 14\n7 x 3 = 21\n7 x 4 = 28\n7 x 5 = 35\n7 x 6 = 42\n7 x 7 = 49\n7 x 8 = 56\n7 x 9 = 63\n7 x 10 = 70'},{i:'1',o:'1 x 1 = 1\n1 x 2 = 2\n1 x 3 = 3\n1 x 4 = 4\n1 x 5 = 5\n1 x 6 = 6\n1 x 7 = 7\n1 x 8 = 8\n1 x 9 = 9\n1 x 10 = 10'}] },
    { t: 'Factorial', desc: 'Read N and print N!.', constr: '1 ≤ N ≤ 20', inFmt: 'Single integer N.', outFmt: 'N!', tc: [{i:'5',o:'120'},{i:'3',o:'6'},{i:'10',o:'3628800'},{i:'1',o:'1'},{i:'7',o:'5040'}] },
    { t: 'Count Digits', desc: 'Read an integer and count its digits.', constr: '0 ≤ N ≤ 10^9', inFmt: 'Single integer.', outFmt: 'Number of digits.', tc: [{i:'12345',o:'5'},{i:'0',o:'1'},{i:'100000',o:'6'},{i:'7',o:'1'},{i:'999999999',o:'9'}] },
  ],
  'If Else': [
    { t: 'Even or Odd', desc: 'Read an integer and print "Even" or "Odd".', constr: '-10^9 ≤ N ≤ 10^9', inFmt: 'Single integer.', outFmt: '"Even" or "Odd".', tc: [{i:'4',o:'Even'},{i:'7',o:'Odd'},{i:'0',o:'Even'},{i:'-3',o:'Odd'},{i:'100',o:'Even'}] },
    { t: 'Largest of Three', desc: 'Read three integers and print the largest.', constr: '-10^9 ≤ a,b,c ≤ 10^9', inFmt: 'Three integers.', outFmt: 'The largest integer.', tc: [{i:'3 7 5',o:'7'},{i:'10 10 10',o:'10'},{i:'-1 -5 -2',o:'-1'},{i:'100 50 75',o:'100'},{i:'0 -100 50',o:'50'}] },
    { t: 'Leap Year', desc: 'Read a year and print "Leap" if leap year else "Not Leap".', constr: '1 ≤ year ≤ 10^5', inFmt: 'Single integer.', outFmt: '"Leap" or "Not Leap".', tc: [{i:'2024',o:'Leap'},{i:'2023',o:'Not Leap'},{i:'2000',o:'Leap'},{i:'1900',o:'Not Leap'},{i:'2400',o:'Leap'}] },
    { t: 'Grade Calculator', desc: 'Read marks (0-100) and print grade: A(≥90), B(≥80), C(≥70), D(≥60), F(<60).', constr: '0 ≤ marks ≤ 100', inFmt: 'Single integer.', outFmt: 'Grade letter.', tc: [{i:'95',o:'A'},{i:'82',o:'B'},{i:'65',o:'D'},{i:'45',o:'F'},{i:'100',o:'A'}] },
  ],
  'Functions': [
    { t: 'Add Two Numbers (Function)', desc: 'Write a function that takes two integers and returns their sum.', constr: '-10^9 ≤ a,b ≤ 10^9', inFmt: 'Two integers.', outFmt: 'Their sum.', tc: [{i:'2 3',o:'5'},{i:'-5 10',o:'5'},{i:'0 0',o:'0'},{i:'100 -100',o:'0'},{i:'999 1',o:'1000'}] },
    { t: 'Power Function', desc: 'Read base and exponent and compute base^exponent.', constr: '1 ≤ base ≤ 10, 0 ≤ exp ≤ 10', inFmt: 'Two integers.', outFmt: 'Result of base^exp.', tc: [{i:'2 3',o:'8'},{i:'5 0',o:'1'},{i:'3 4',o:'81'},{i:'10 2',o:'100'},{i:'7 3',o:'343'}] },
    { t: 'Is Prime?', desc: 'Write a function to check if a number is prime.', constr: '1 ≤ N ≤ 10^5', inFmt: 'Single integer.', outFmt: '"Prime" or "Not Prime".', tc: [{i:'7',o:'Prime'},{i:'12',o:'Not Prime'},{i:'1',o:'Not Prime'},{i:'97',o:'Prime'},{i:'100',o:'Not Prime'}] },
    { t: 'GCD Function', desc: 'Compute GCD of two numbers using a function.', constr: '1 ≤ a,b ≤ 10^6', inFmt: 'Two integers.', outFmt: 'GCD result.', tc: [{i:'12 8',o:'4'},{i:'17 5',o:'1'},{i:'100 25',o:'25'},{i:'0 5',o:'5'},{i:'36 48',o:'12'}] },
  ],
  'Arrays': [
    { t: 'Array Sum', desc: 'Read N and N integers. Print their sum.', constr: '1 ≤ N ≤ 1000, -10^6 ≤ arr[i] ≤ 10^6', inFmt: 'First line N. Second line N integers.', outFmt: 'Sum of array.', tc: [{i:'5\n1 2 3 4 5',o:'15'},{i:'3\n-1 0 1',o:'0'},{i:'1\n42',o:'42'},{i:'4\n-5 -10 -15 -20',o:'-50'},{i:'6\n100 200 300 400 500 600',o:'2100'}] },
    { t: 'Array Reverse', desc: 'Reverse an array of N integers.', constr: '1 ≤ N ≤ 1000', inFmt: 'First line N. Second line N integers.', outFmt: 'Reversed array.', tc: [{i:'5\n1 2 3 4 5',o:'5 4 3 2 1'},{i:'3\n4 5 6',o:'6 5 4'},{i:'1\n42',o:'42'},{i:'4\n-1 -2 -3 -4',o:'-4 -3 -2 -1'},{i:'6\n10 20 30 40 50 60',o:'60 50 40 30 20 10'}] },
    { t: 'Find Maximum', desc: 'Find the maximum element in an array.', constr: '1 ≤ N ≤ 1000, -10^6 ≤ arr[i] ≤ 10^6', inFmt: 'First line N. Second line N integers.', outFmt: 'Maximum element.', tc: [{i:'5\n3 7 2 9 1',o:'9'},{i:'3\n-5 -2 -8',o:'-2'},{i:'1\n42',o:'42'},{i:'4\n100 200 50 75',o:'200'},{i:'6\n-1 -2 -3 -4 -5 0',o:'0'}] },
    { t: 'Frequency Count', desc: 'Count frequency of each element in array.', constr: '1 ≤ N ≤ 1000, 1 ≤ arr[i] ≤ 100', inFmt: 'First line N. Second line N integers.', outFmt: 'Each unique element and its frequency.', tc: [{i:'5\n1 2 1 3 1',o:'1:3\n2:1\n3:1'},{i:'3\n4 4 4',o:'4:3'},{i:'1\n7',o:'7:1'},{i:'6\n2 2 3 3 5 5',o:'2:2\n3:2\n5:2'},{i:'4\n10 10 10 10',o:'10:4'}] },
  ],
  'Strings': [
    { t: 'String Reverse', desc: 'Reverse a given string.', constr: '1 ≤ |s| ≤ 1000', inFmt: 'Single string.', outFmt: 'Reversed string.', tc: [{i:'hello',o:'olleh'},{i:'SucessKart',o:'traKssecuS'},{i:'abc',o:'cba'},{i:'racecar',o:'racecar'},{i:'A',o:'A'}] },
    { t: 'Palindrome Check', desc: 'Check if a string is palindrome.', constr: '1 ≤ |s| ≤ 1000', inFmt: 'Single string.', outFmt: '"Palindrome" or "Not Palindrome".', tc: [{i:'racecar',o:'Palindrome'},{i:'hello',o:'Not Palindrome'},{i:'madam',o:'Palindrome'},{i:'a',o:'Palindrome'},{i:'ab',o:'Not Palindrome'}] },
    { t: 'Vowel Count', desc: 'Count vowels (a,e,i,o,u) in a string (case-insensitive).', constr: '1 ≤ |s| ≤ 1000', inFmt: 'Single string.', outFmt: 'Number of vowels.', tc: [{i:'hello world',o:'3'},{i:'AEIOU',o:'5'},{i:'xyz',o:'0'},{i:'SucessKart',o:'3'},{i:'bcdfg',o:'0'}] },
  ],
  'Matrix': [
    { t: 'Matrix Addition', desc: 'Add two matrices of same dimensions.', constr: '1 ≤ N,M ≤ 100, -10^3 ≤ val ≤ 10^3', inFmt: 'N M then N*M for each matrix.', outFmt: 'Resultant matrix.', tc: [{i:'2 2\n1 2\n3 4\n5 6\n7 8',o:'6 8\n10 12'},{i:'2 3\n1 1 1\n2 2 2\n3 3 3\n4 4 4',o:'4 4 4\n6 6 6'},{i:'1 1\n5\n10',o:'15'},{i:'3 2\n1 0\n0 1\n1 1\n1 1\n1 0\n0 1',o:'2 1\n1 1\n1 2'},{i:'2 2\n0 0\n0 0\n0 0\n0 0',o:'0 0\n0 0'}] },
    { t: 'Matrix Transpose', desc: 'Transpose a matrix.', constr: '1 ≤ N,M ≤ 100', inFmt: 'N M then N*M integers.', outFmt: 'Transposed matrix.', tc: [{i:'2 3\n1 2 3\n4 5 6',o:'1 4\n2 5\n3 6'},{i:'1 4\n1 2 3 4',o:'1\n2\n3\n4'},{i:'3 3\n1 1 1\n2 2 2\n3 3 3',o:'1 2 3\n1 2 3\n1 2 3'},{i:'2 2\n1 2\n3 4',o:'1 3\n2 4'},{i:'4 1\n1\n2\n3\n4',o:'1 2 3 4'}] },
  ],
  'Patterns': [
    { t: 'Right Triangle Star', desc: 'Print a right-angled triangle pattern of *.', constr: '1 ≤ N ≤ 100', inFmt: 'Single integer N.', outFmt: 'N rows of stars.', tc: [{i:'3',o:'*\n**\n***'},{i:'5',o:'*\n**\n***\n****\n*****'},{i:'1',o:'*'},{i:'4',o:'*\n**\n***\n****'},{i:'2',o:'*\n**'}] },
    { t: 'Pyramid Pattern', desc: 'Print a centered pyramid of *.', constr: '1 ≤ N ≤ 50', inFmt: 'Single integer N.', outFmt: 'Pyramid pattern.', tc: [{i:'3',o:'  *\n ***\n*****'},{i:'5',o:'    *\n   ***\n  *****\n *******\n*********'},{i:'1',o:'*'},{i:'2',o:' *\n***'},{i:'4',o:'   *\n  ***\n *****\n*******'}] },
    { t: 'Diamond Pattern', desc: 'Print a diamond pattern of *.', constr: '1 ≤ N ≤ 50', inFmt: 'Single integer N.', outFmt: 'Diamond pattern.', tc: [{i:'3',o:'  *\n ***\n*****\n ***\n  *'},{i:'5',o:'    *\n   ***\n  *****\n *******\n*********\n *******\n  *****\n   ***\n    *'},{i:'1',o:'*'},{i:'2',o:' *\n***\n *'},{i:'4',o:'   *\n  ***\n *****\n*******\n *****\n  ***\n   *'}] },
    { t: 'Number Pattern', desc: 'Print pattern: 1, 12, 123... for N rows.', constr: '1 ≤ N ≤ 9', inFmt: 'Single integer N.', outFmt: 'Number pattern.', tc: [{i:'3',o:'1\n12\n123'},{i:'5',o:'1\n12\n123\n1234\n12345'},{i:'1',o:'1'},{i:'4',o:'1\n12\n123\n1234'},{i:'2',o:'1\n12'}] },
  ],
  'Searching': [
    { t: 'Linear Search', desc: 'Find index of first occurrence of K in array.', constr: '1 ≤ N ≤ 1000', inFmt: 'Line1: N K. Line2: N integers.', outFmt: 'Index (0-based) or -1.', tc: [{i:'5 3\n1 2 3 4 5',o:'2'},{i:'4 10\n1 2 3 4',o:'-1'},{i:'3 5\n5 5 5',o:'0'},{i:'1 42\n42',o:'0'},{i:'6 0\n-1 0 2 -5 0 3',o:'1'}] },
    { t: 'Binary Search', desc: 'Find K in sorted array using binary search.', constr: '1 ≤ N ≤ 10^5, sorted ascending', inFmt: 'Line1: N K. Line2: N sorted ints.', outFmt: 'Index or -1.', tc: [{i:'5 3\n1 2 3 4 5',o:'2'},{i:'4 10\n1 2 3 4',o:'-1'},{i:'6 7\n1 3 5 7 9 11',o:'3'},{i:'1 42\n42',o:'0'},{i:'8 25\n10 15 20 25 30 35 40 45',o:'3'}] },
    { t: 'First and Last Occurrence', desc: 'Find first and last index of K in sorted array.', constr: '1 ≤ N ≤ 10^5', inFmt: 'Line1: N K. Line2: N sorted ints.', outFmt: 'First Last or -1 -1.', tc: [{i:'8 3\n1 2 3 3 3 4 5 6',o:'2 4'},{i:'5 10\n1 2 3 4 5',o:'-1 -1'},{i:'8 5\n1 2 3 4 5 5 5 6',o:'4 6'},{i:'3 1\n1 1 1',o:'0 2'},{i:'1 7\n7',o:'0 0'}] },
  ],
  'Sorting': [
    { t: 'Bubble Sort', desc: 'Sort an array using bubble sort.', constr: '1 ≤ N ≤ 1000', inFmt: 'Line1: N. Line2: N ints.', outFmt: 'Sorted array.', tc: [{i:'5\n5 4 3 2 1',o:'1 2 3 4 5'},{i:'3\n3 1 2',o:'1 2 3'},{i:'1\n42',o:'42'},{i:'4\n-1 -5 0 3',o:'-5 -1 0 3'},{i:'6\n9 8 7 6 5 4',o:'4 5 6 7 8 9'}] },
    { t: 'Selection Sort', desc: 'Sort using selection sort and print each pass.', constr: '1 ≤ N ≤ 100', inFmt: 'Line1: N. Line2: N ints.', outFmt: 'Array after each selection.', tc: [{i:'4\n4 3 2 1',o:'1 3 2 4\n1 2 3 4\n1 2 3 4'},{i:'3\n3 1 2',o:'1 3 2\n1 2 3'},{i:'5\n5 4 3 2 1',o:'1 4 3 2 5\n1 2 3 4 5\n1 2 3 4 5\n1 2 3 4 5'},{i:'2\n2 1',o:'1 2'},{i:'1\n7',o:'7'}] },
    { t: 'Merge Sort', desc: 'Sort array using merge sort.', constr: '1 ≤ N ≤ 10^5', inFmt: 'Line1: N. Line2: N ints.', outFmt: 'Sorted array.', tc: [{i:'5\n5 4 3 2 1',o:'1 2 3 4 5'},{i:'3\n3 1 2',o:'1 2 3'},{i:'8\n8 7 6 5 4 3 2 1',o:'1 2 3 4 5 6 7 8'},{i:'4\n-1 -5 3 0',o:'-5 -1 0 3'},{i:'6\n1 1 1 1 1 1',o:'1 1 1 1 1 1'}] },
    { t: 'Quick Sort', desc: 'Sort using quicksort.', constr: '1 ≤ N ≤ 10^5', inFmt: 'Line1: N. Line2: N ints.', outFmt: 'Sorted array.', tc: [{i:'5\n3 1 4 1 5',o:'1 1 3 4 5'},{i:'3\n3 2 1',o:'1 2 3'},{i:'6\n6 5 4 3 2 1',o:'1 2 3 4 5 6'},{i:'2\n2 1',o:'1 2'},{i:'7\n7 7 7 7 7 7 7',o:'7 7 7 7 7 7 7'}] },
  ],
  'Recursion': [
    { t: 'Fibonacci (Recursive)', desc: 'Print Nth Fibonacci number using recursion.', constr: '0 ≤ N ≤ 30', inFmt: 'Single integer N.', outFmt: 'Nth Fibonacci number.', tc: [{i:'5',o:'5'},{i:'0',o:'0'},{i:'10',o:'55'},{i:'1',o:'1'},{i:'20',o:'6765'}] },
    { t: 'Tower of Hanoi', desc: 'Print moves to solve Tower of Hanoi for N disks.', constr: '1 ≤ N ≤ 10', inFmt: 'Single integer N.', outFmt: 'Each move as "Move disk X from A to B".', tc: [{i:'1',o:'Move disk 1 from A to C'},{i:'2',o:'Move disk 1 from A to B\nMove disk 2 from A to C\nMove disk 1 from B to C'},{i:'3',o:'Move disk 1 from A to C\nMove disk 2 from A to B\nMove disk 1 from C to B\nMove disk 3 from A to C\nMove disk 1 from B to A\nMove disk 2 from B to C\nMove disk 1 from A to C'}] },
    { t: 'Sum of Digits (Recursive)', desc: 'Find sum of digits of N using recursion.', constr: '0 ≤ N ≤ 10^9', inFmt: 'Single integer.', outFmt: 'Sum of digits.', tc: [{i:'123',o:'6'},{i:'0',o:'0'},{i:'9999',o:'36'},{i:'1024',o:'7'},{i:'55555',o:'25'}] },
    { t: 'Power (Recursive)', desc: 'Compute a^b using recursion.', constr: '1 ≤ a ≤ 10, 0 ≤ b ≤ 15', inFmt: 'Two integers.', outFmt: 'Result.', tc: [{i:'2 3',o:'8'},{i:'3 4',o:'81'},{i:'5 0',o:'1'},{i:'10 3',o:'1000'},{i:'7 2',o:'49'}] },
  ],
  'Linked List': [
    { t: 'Reverse Linked List', desc: 'Reverse a singly linked list.', constr: '1 ≤ N ≤ 10^5', inFmt: 'Line1: N. Line2: N integers.', outFmt: 'Reversed list.', tc: [{i:'5\n1 2 3 4 5',o:'5 4 3 2 1'},{i:'3\n4 5 6',o:'6 5 4'},{i:'1\n42',o:'42'},{i:'4\n-1 -2 -3 -4',o:'-4 -3 -2 -1'},{i:'2\n10 20',o:'20 10'}] },
    { t: 'Detect Cycle', desc: 'Detect if linked list has a cycle.', constr: '1 ≤ N ≤ 10^5', inFmt: 'Line1: N. Line2: N ints. Line3: cycle position (-1 for none).', outFmt: '"Cycle" or "No Cycle".', tc: [{i:'3\n1 2 3\n0',o:'Cycle'},{i:'4\n1 2 3 4\n-1',o:'No Cycle'},{i:'1\n5\n0',o:'Cycle'},{i:'5\n1 2 3 4 5\n-1',o:'No Cycle'},{i:'2\n7 8\n0',o:'Cycle'}] },
  ],
  'Stack': [
    { t: 'Stack Operations', desc: 'Implement stack with push, pop, top, isEmpty.', constr: '1 ≤ Q ≤ 1000', inFmt: 'Q operations: "push x", "pop", "top", "empty".', outFmt: 'Result of top/empty.', tc: [{i:'5\npush 1\npush 2\ntop\npop\ntop',o:'2\n1'},{i:'4\npush 5\npush 10\npop\ntop',o:'5'},{i:'3\nempty\npush 1\nempty',o:'true\nfalse'},{i:'6\npush 1\npush 2\npush 3\npop\npop\ntop',o:'1'},{i:'2\npush 42\ntop',o:'42'}] },
    { t: 'Balanced Parentheses', desc: 'Check if parentheses string is balanced.', constr: '1 ≤ |s| ≤ 1000', inFmt: 'Single string of (){}[].', outFmt: '"Balanced" or "Not Balanced".', tc: [{i:'({[]})',o:'Balanced'},{i:'(]',o:'Not Balanced'},{i:'{[()]}',o:'Balanced'},{i:'((()))',o:'Balanced'},{i:'(',o:'Not Balanced'}] },
  ],
  'Queue': [
    { t: 'Queue Operations', desc: 'Implement queue with enqueue, dequeue, front.', constr: '1 ≤ Q ≤ 1000', inFmt: 'Q operations: "enqueue x", "dequeue", "front".', outFmt: 'Result of front/dequeue.', tc: [{i:'5\nenqueue 1\nenqueue 2\nfront\ndequeue\nfront',o:'1\n2'},{i:'4\nenqueue 10\nenqueue 20\ndequeue\ndequeue',o:''},{i:'6\nenqueue 5\nenqueue 15\nenqueue 25\nfront\ndequeue\nfront',o:'5\n15'},{i:'3\nenqueue 42\nfront\nfront',o:'42\n42'},{i:'4\nenqueue 1\ndequeue\nenqueue 2\nfront',o:'2'}] },
  ],
  'Tree': [
    { t: 'Binary Tree Inorder', desc: 'Print inorder traversal of binary tree.', constr: '1 ≤ N ≤ 1000', inFmt: 'Line1: N. Line2: values. Line3: left children indices (-1 for null). Line4: right children indices.', outFmt: 'Inorder traversal.', tc: [{i:'3\n1 2 3\n-1 -1 0\n-1 -1 -1',o:'2 1 3'},{i:'1\n42\n-1\n-1',o:'42'},{i:'5\n1 2 3 4 5\n-1 0 -1 -1 2\n-1 -1 1 4 -1',o:'2 4 5 3 1'}] },
    { t: 'Binary Search Tree', desc: 'Insert N numbers into BST and print inorder.', constr: '1 ≤ N ≤ 1000', inFmt: 'Line1: N. Line2: N ints.', outFmt: 'Inorder traversal of BST.', tc: [{i:'5\n5 3 7 2 4',o:'2 3 4 5 7'},{i:'4\n10 5 15 3',o:'3 5 10 15'},{i:'6\n1 2 3 4 5 6',o:'1 2 3 4 5 6'},{i:'3\n3 2 1',o:'1 2 3'},{i:'7\n8 3 10 1 6 14 4',o:'1 3 4 6 8 10 14'}] },
    { t: 'Tree Height', desc: 'Find height of a binary tree.', constr: '1 ≤ N ≤ 1000', inFmt: 'Same as binary tree input format.', outFmt: 'Height of tree.', tc: [{i:'3\n1 2 3\n-1 -1 0\n-1 -1 -1',o:'2'},{i:'1\n42\n-1\n-1',o:'1'},{i:'7\n1 2 3 4 5 6 7\n-1 -1 0 2 -1 -1 -1\n-1 -1 1 -1 3 5 6',o:'4'}] },
  ],
  'Graph': [
    { t: 'BFS Traversal', desc: 'Print BFS traversal of graph starting from node 0.', constr: '1 ≤ N ≤ 1000', inFmt: 'Line1: N M. Next M lines: u v edge.', outFmt: 'BFS order.', tc: [{i:'4 3\n0 1\n1 2\n2 3',o:'0 1 2 3'},{i:'5 4\n0 1\n0 2\n1 3\n1 4',o:'0 1 2 3 4'},{i:'3 2\n0 1\n1 2',o:'0 1 2'},{i:'1 0',o:'0'},{i:'4 3\n0 2\n2 1\n1 3',o:'0 2 1 3'}] },
    { t: 'DFS Traversal', desc: 'Print DFS traversal of graph from node 0.', constr: '1 ≤ N ≤ 1000', inFmt: 'Same as BFS format.', outFmt: 'DFS order.', tc: [{i:'4 3\n0 1\n1 2\n2 3',o:'0 1 2 3'},{i:'5 4\n0 1\n0 2\n1 3\n1 4',o:'0 1 3 4 2'},{i:'3 2\n0 1\n1 2',o:'0 1 2'},{i:'1 0',o:'0'},{i:'4 3\n0 2\n2 1\n1 3',o:'0 2 1 3'}] },
    { t: 'Shortest Path (Unweighted)', desc: 'Find shortest path distance from source to all nodes (BFS).', constr: '1 ≤ N ≤ 1000', inFmt: 'Line1: N M S. Next M lines: edges.', outFmt: 'Distances from S to each node.', tc: [{i:'4 3 0\n0 1\n1 2\n2 3',o:'0 1 2 3'},{i:'5 4 0\n0 1\n0 2\n1 3\n1 4',o:'0 1 1 2 2'},{i:'3 1 2\n1 2',o:'-1 -1 0'}] },
  ],
  'Dynamic Programming': [
    { t: '0/1 Knapsack', desc: 'Find max value with weight capacity W.', constr: '1 ≤ N ≤ 100, 1 ≤ W ≤ 1000', inFmt: 'Line1: N W. Line2: values. Line3: weights.', outFmt: 'Maximum value.', tc: [{i:'3 50\n60 100 120\n10 20 30',o:'220'},{i:'4 10\n10 40 30 50\n5 4 6 3',o:'90'},{i:'2 5\n10 20\n1 2',o:'30'},{i:'3 8\n10 40 50\n3 4 5',o:'90'},{i:'5 100\n500 400 300 200 100\n50 40 30 20 10',o:'1500'}] },
    { t: 'Longest Common Subsequence', desc: 'Find LCS length of two strings.', constr: '1 ≤ |a|,|b| ≤ 1000', inFmt: 'Two strings.', outFmt: 'LCS length.', tc: [{i:'ABCD\nACDF',o:'3'},{i:'AGGTAB\nGXTXAYB',o:'4'},{i:'ABC\nDEF',o:'0'},{i:'AAAA\nAAAA',o:'4'},{i:'ABCDEF\nABCDEF',o:'6'}] },
    { t: 'Coin Change', desc: 'Find minimum coins needed for amount.', constr: '1 ≤ N ≤ 100, 0 ≤ amount ≤ 10000', inFmt: 'Line1: N amount. Line2: coin denominations.', outFmt: 'Minimum coins or -1.', tc: [{i:'3 11\n1 2 5',o:'3'},{i:'3 3\n2 5 10',o:'-1'},{i:'4 0\n1 2 5 10',o:'0'},{i:'3 7\n1 5 10',o:'3'},{i:'4 15\n1 3 5 7',o:'3'}] },
    { t: 'Longest Increasing Subsequence', desc: 'Find LIS length.', constr: '1 ≤ N ≤ 1000', inFmt: 'Line1: N. Line2: array.', outFmt: 'LIS length.', tc: [{i:'8\n10 9 2 5 3 7 101 18',o:'4'},{i:'6\n0 1 0 3 2 3',o:'4'},{i:'1\n42',o:'1'},{i:'5\n5 4 3 2 1',o:'1'},{i:'7\n3 10 2 1 20 30 25',o:'4'}] },
    { t: 'Edit Distance', desc: 'Find min operations to convert s1 to s2.', constr: '1 ≤ |a|,|b| ≤ 500', inFmt: 'Two strings.', outFmt: 'Edit distance.', tc: [{i:'CAT\nCAR',o:'1'},{i:'SUNDAY\nSATURDAY',o:'3'},{i:'ABC\nABC',o:'0'},{i:'DOG\nCAT',o:'3'},{i:'abcdef\nazced',o:'3'}] },
    { t: 'Rod Cutting', desc: 'Max profit from cutting rod of length N.', constr: '1 ≤ N ≤ 100', inFmt: 'Line1: N. Line2: prices for each length (1..N).', outFmt: 'Max profit.', tc: [{i:'8\n1 5 8 9 10 17 17 20',o:'22'},{i:'4\n2 5 7 8',o:'10'},{i:'5\n1 2 3 4 5',o:'5'},{i:'3\n3 5 8',o:'8'},{i:'6\n1 3 4 5 7 9',o:'10'}] },
    { t: 'Maximum Subarray Sum', desc: 'Find contiguous subarray with max sum (Kadane).', constr: '1 ≤ N ≤ 10^5', inFmt: 'Line1: N. Line2: array.', outFmt: 'Maximum subarray sum.', tc: [{i:'9\n-2 1 -3 4 -1 2 1 -5 4',o:'6'},{i:'5\n1 2 3 4 5',o:'15'},{i:'5\n-1 -2 -3 -4 -5',o:'-1'},{i:'4\n-2 1 -3 4',o:'4'},{i:'6\n5 -2 3 -1 2 -4',o:'7'}] },
    { t: 'Unique Paths', desc: 'Count unique paths from top-left to bottom-right in grid.', constr: '1 ≤ M,N ≤ 100', inFmt: 'Two integers M N.', outFmt: 'Number of unique paths.', tc: [{i:'3 7',o:'28'},{i:'3 2',o:'3'},{i:'7 3',o:'28'},{i:'3 3',o:'6'},{i:'1 1',o:'1'}] },
    { t: 'Minimum Path Sum', desc: 'Find min sum path from top-left to bottom-right.', constr: '1 ≤ M,N ≤ 200', inFmt: 'M N then grid values.', outFmt: 'Minimum path sum.', tc: [{i:'3 3\n1 3 1\n1 5 1\n4 2 1',o:'7'},{i:'2 3\n1 2 3\n4 5 6',o:'12'},{i:'1 3\n1 2 3',o:'6'},{i:'3 1\n1\n2\n3',o:'6'},{i:'2 2\n1 2\n3 4',o:'7'}] },
    { t: 'House Robber', desc: 'Max money you can rob without adjacent houses.', constr: '1 ≤ N ≤ 10^5', inFmt: 'Line1: N. Line2: values.', outFmt: 'Maximum amount.', tc: [{i:'5\n2 7 9 3 1',o:'12'},{i:'4\n1 2 3 1',o:'4'},{i:'3\n2 1 1',o:'3'},{i:'1\n5',o:'5'},{i:'6\n5 5 10 100 10 5',o:'110'}] },
    { t: 'Subset Sum', desc: 'Check if subset with given sum exists.', constr: '1 ≤ N ≤ 200, 0 ≤ sum ≤ 10^5', inFmt: 'Line1: N sum. Line2: array.', outFmt: '"Yes" or "No".', tc: [{i:'5 11\n1 5 3 7 4',o:'Yes'},{i:'4 30\n5 10 15 20',o:'No'},{i:'3 6\n1 2 3',o:'Yes'},{i:'2 0\n1 2',o:'Yes'},{i:'6 100\n10 20 30 40 50 60',o:'Yes'}] },
    { t: 'Palindromic Substrings', desc: 'Count palindromic substrings in a string.', constr: '1 ≤ N ≤ 1000', inFmt: 'Single string.', outFmt: 'Count.', tc: [{i:'abc',o:'3'},{i:'aaa',o:'6'},{i:'aba',o:'4'},{i:'a',o:'1'},{i:'abba',o:'6'}] },
    { t: 'Jump Game', desc: 'Check if you can reach last index.', constr: '1 ≤ N ≤ 10^4', inFmt: 'Line1: N. Line2: jump array.', outFmt: '"Yes" or "No".', tc: [{i:'5\n2 3 1 1 4',o:'Yes'},{i:'5\n3 2 1 0 4',o:'No'},{i:'3\n1 1 1',o:'Yes'},{i:'1\n0',o:'Yes'},{i:'6\n2 0 0 0 0 5',o:'No'}] },
    { t: 'Decode Ways', desc: 'Count ways to decode digit string (A=1...Z=26).', constr: '1 ≤ |s| ≤ 100', inFmt: 'String of digits.', outFmt: 'Number of ways.', tc: [{i:'12',o:'2'},{i:'226',o:'3'},{i:'0',o:'0'},{i:'06',o:'0'},{i:'11106',o:'2'}] },
  ],
  'Greedy': [
    { t: 'Activity Selection', desc: 'Maximum number of non-overlapping activities.', constr: '1 ≤ N ≤ 10^5', inFmt: 'Line1: N. Next N lines: start end.', outFmt: 'Maximum activities count.', tc: [{i:'4\n1 3\n2 4\n3 5\n5 6',o:'3'},{i:'3\n1 2\n2 3\n3 4',o:'3'},{i:'2\n1 4\n2 3',o:'1'},{i:'1\n5 10',o:'1'},{i:'5\n1 2\n3 4\n0 6\n5 7\n8 9',o:'4'}] },
    { t: 'Fractional Knapsack', desc: 'Max value with fractional items allowed.', constr: '1 ≤ N ≤ 1000', inFmt: 'Line1: N W. Next N lines: value weight.', outFmt: 'Max value (2 decimal).', tc: [{i:'3 50\n60 10\n100 20\n120 30',o:'240.00'},{i:'2 10\n10 5\n20 10',o:'25.00'},{i:'3 15\n10 5\n20 10\n30 15',o:'45.00'},{i:'1 10\n100 5',o:'100.00'},{i:'4 20\n20 5\n30 10\n40 15\n50 20',o:'86.67'}] },
    { t: 'Minimum Coins (Greedy)', desc: 'Minimum coins for amount using greedy (Indian currency).', constr: '1 ≤ amount ≤ 10^5', inFmt: 'Single integer.', outFmt: 'Minimum coins.', tc: [{i:'93',o:'5'},{i:'100',o:'1'},{i:'30',o:'3'},{i:'578',o:'10'},{i:'1',o:'1'}] },
    { t: 'Job Sequencing', desc: 'Max profit from jobs with deadlines.', constr: '1 ≤ N ≤ 1000', inFmt: 'Line1: N. Next N lines: id deadline profit.', outFmt: 'Maximum profit.', tc: [{i:'4\n1 4 20\n2 1 10\n3 1 40\n4 1 30',o:'60'},{i:'5\n1 2 100\n2 1 19\n3 2 27\n4 1 25\n5 3 15',o:'142'},{i:'3\n1 2 50\n2 1 60\n3 2 40',o:'110'}] },
  ],
  'Hashing': [
    { t: 'Two Sum', desc: 'Find indices of two numbers that sum to target.', constr: '2 ≤ N ≤ 10^5', inFmt: 'Line1: N target. Line2: array.', outFmt: 'Two indices (0-based).', tc: [{i:'4 9\n2 7 11 15',o:'0 1'},{i:'3 6\n3 2 4',o:'1 2'},{i:'2 3\n3 3',o:'0 1'},{i:'5 10\n1 2 3 4 5',o:'3 4'},{i:'3 0\n-1 0 1',o:'0 2'}] },
    { t: 'Subarray Sum Equals K', desc: 'Count subarrays with sum equal to K.', constr: '1 ≤ N ≤ 10^5', inFmt: 'Line1: N K. Line2: array.', outFmt: 'Count.', tc: [{i:'5 3\n1 2 3 -2 3',o:'4'},{i:'3 2\n1 1 1',o:'2'},{i:'4 -2\n-1 -1 1 1',o:'2'},{i:'2 0\n0 0',o:'3'},{i:'5 7\n3 4 7 2 -3 1 4 2',o:'4'}] },
    { t: 'First Non-Repeating Character', desc: 'Find first non-repeating character index.', constr: '1 ≤ |s| ≤ 10^5', inFmt: 'Single string.', outFmt: 'Index (0-based) or -1.', tc: [{i:'leetcode',o:'0'},{i:'loveleetcode',o:'2'},{i:'aabb',o:'-1'},{i:'abcabc',o:'-1'},{i:'sucesskart',o:'1'}] },
    { t: 'Group Anagrams', desc: 'Group anagram strings together. Print group sizes.', constr: '1 ≤ N ≤ 1000', inFmt: 'Line1: N. Next N lines: strings.', outFmt: 'Group sizes sorted.', tc: [{i:'6\nate\nbat\ntea\nate\ntan\nnat',o:'2 2 2'},{i:'3\nabc\ndef\nghi',o:'1 1 1'},{i:'4\nab\nba\nabc\ncba',o:'2 2'},{i:'2\nhello\nhello',o:'2'},{i:'5\ncar\narc\ncat\ntac\nact',o:'3 2'}] },
  ],
  'Bit Manipulation': [
    { t: 'Count Set Bits', desc: 'Count set bits (1s) in binary representation.', constr: '0 ≤ N ≤ 10^9', inFmt: 'Single integer.', outFmt: 'Set bit count.', tc: [{i:'7',o:'3'},{i:'10',o:'2'},{i:'0',o:'0'},{i:'255',o:'8'},{i:'1024',o:'1'}] },
    { t: 'Power of Two', desc: 'Check if N is a power of 2.', constr: '-10^9 ≤ N ≤ 10^9', inFmt: 'Single integer.', outFmt: '"Yes" or "No".', tc: [{i:'16',o:'Yes'},{i:'18',o:'No'},{i:'1',o:'Yes'},{i:'0',o:'No'},{i:'1024',o:'Yes'}] },
    { t: 'Single Number', desc: 'Find element that appears once (others twice).', constr: '1 ≤ N ≤ 10^5', inFmt: 'Line1: N. Line2: array.', outFmt: 'The single element.', tc: [{i:'5\n2 2 1 3 1',o:'3'},{i:'3\n4 1 2 1 2',o:'4'},{i:'1\n42',o:'42'},{i:'7\n1 1 2 2 3 3 4',o:'4'},{i:'5\n-1 -1 0 2 2',o:'0'}] },
    { t: 'Bit Manipulation: Find Missing Number', desc: 'Find the missing number in 0..N.', constr: '1 ≤ N ≤ 10^5', inFmt: 'Line1: N. Line2: N numbers (0..N missing one).', outFmt: 'Missing number.', tc: [{i:'3\n3 0 1',o:'2'},{i:'2\n0 1',o:'2'},{i:'5\n0 1 2 3 5',o:'4'},{i:'1\n1',o:'0'},{i:'4\n4 3 2 1',o:'0'}] },
  ],
  'Mathematics': [
    { t: 'Armstrong Number', desc: 'Check if N is an Armstrong number.', constr: '1 ≤ N ≤ 10^6', inFmt: 'Single integer.', outFmt: '"Armstrong" or "Not Armstrong".', tc: [{i:'153',o:'Armstrong'},{i:'123',o:'Not Armstrong'},{i:'370',o:'Armstrong'},{i:'1',o:'Armstrong'},{i:'9474',o:'Armstrong'}] },
    { t: 'Perfect Number', desc: 'Check if N is a perfect number.', constr: '1 ≤ N ≤ 10^8', inFmt: 'Single integer.', outFmt: '"Perfect" or "Not Perfect".', tc: [{i:'28',o:'Perfect'},{i:'12',o:'Not Perfect'},{i:'6',o:'Perfect'},{i:'496',o:'Perfect'},{i:'100',o:'Not Perfect'}] },
    { t: 'Sieve of Eratosthenes', desc: 'Print all primes up to N using sieve.', constr: '2 ≤ N ≤ 10^5', inFmt: 'Single integer.', outFmt: 'Space-separated primes.', tc: [{i:'10',o:'2 3 5 7'},{i:'20',o:'2 3 5 7 11 13 17 19'},{i:'5',o:'2 3 5'},{i:'2',o:'2'},{i:'30',o:'2 3 5 7 11 13 17 19 23 29'}] },
    { t: 'LCM of Two Numbers', desc: 'Find LCM of two integers.', constr: '1 ≤ a,b ≤ 10^6', inFmt: 'Two integers.', outFmt: 'LCM.', tc: [{i:'12 18',o:'36'},{i:'7 5',o:'35'},{i:'4 6',o:'12'},{i:'1 10',o:'10'},{i:'100 75',o:'300'}] },
    { t: 'Prime Factors', desc: 'Print prime factors of N.', constr: '2 ≤ N ≤ 10^6', inFmt: 'Single integer.', outFmt: 'Space-separated prime factors.', tc: [{i:'12',o:'2 2 3'},{i:'100',o:'2 2 5 5'},{i:'17',o:'17'},{i:'36',o:'2 2 3 3'},{i:'315',o:'3 3 5 7'}] },
  ],
  'Sliding Window': [
    { t: 'Maximum Sum Subarray of Size K', desc: 'Find max sum of any subarray of size K.', constr: '1 ≤ K ≤ N ≤ 10^5', inFmt: 'Line1: N K. Line2: array.', outFmt: 'Maximum sum.', tc: [{i:'6 3\n2 3 5 2 9 1',o:'16'},{i:'5 2\n-1 2 3 1 -4',o:'4'},{i:'4 4\n1 2 3 4',o:'10'},{i:'7 3\n1 2 3 4 5 6 7',o:'18'},{i:'3 1\n5 3 8',o:'8'}] },
    { t: 'Longest Substring Without Repeating', desc: 'Find length of longest substring without repeating chars.', constr: '1 ≤ |s| ≤ 10^5', inFmt: 'Single string.', outFmt: 'Length.', tc: [{i:'abcabcbb',o:'3'},{i:'bbbbb',o:'1'},{i:'pwwkew',o:'3'},{i:'',o:'0'},{i:'dvdf',o:'3'}] },
    { t: 'Minimum Window Substring', desc: 'Find min window containing all chars of pattern.', constr: '1 ≤ |s|,|p| ≤ 10^5', inFmt: 'Two strings: s and p.', outFmt: 'Minimum window substring.', tc: [{i:'ADOBECODEBANC\nABC',o:'BANC'},{i:'a\na',o:'a'},{i:'a\naa',o:''},{i:'ab\nb',o:'b'},{i:'abcdef\nfed',o:'def'}] },
  ],
  'Prefix Sum': [
    { t: 'Range Sum Query', desc: 'Answer Q range sum queries on array.', constr: '1 ≤ N,Q ≤ 10^5', inFmt: 'Line1: N Q. Line2: array. Next Q: L R.', outFmt: 'Sum for each query.', tc: [{i:'5 2\n1 2 3 4 5\n0 2\n1 4',o:'6\n14'},{i:'3 3\n10 20 30\n0 0\n1 2\n0 2',o:'10\n50\n60'},{i:'4 1\n-1 0 1 2\n0 3',o:'2'},{i:'2 2\n5 5\n0 1\n0 0',o:'10\n5'},{i:'6 3\n1 1 1 1 1 1\n0 5\n2 4\n3 3',o:'6\n3\n1'}] },
    { t: 'Equilibrium Index', desc: 'Find index where left sum equals right sum.', constr: '1 ≤ N ≤ 10^5', inFmt: 'Line1: N. Line2: array.', outFmt: 'Equilibrium index or -1.', tc: [{i:'6\n1 7 3 6 5 6',o:'3'},{i:'3\n1 2 3',o:'-1'},{i:'4\n2 1 -1 2',o:'1'},{i:'1\n42',o:'0'},{i:'5\n1 2 3 4 5',o:'-1'}] },
  ],
  'Binary Search': [
    { t: 'Search in Rotated Array', desc: 'Find K in rotated sorted array.', constr: '1 ≤ N ≤ 10^5', inFmt: 'Line1: N K. Line2: rotated array.', outFmt: 'Index or -1.', tc: [{i:'7 0\n4 5 6 7 0 1 2',o:'4'},{i:'7 3\n4 5 6 7 0 1 2',o:'-1'},{i:'5 2\n3 4 5 1 2',o:'4'},{i:'1 1\n1',o:'0'},{i:'6 9\n7 8 9 1 2 3',o:'2'}] },
    { t: 'Peak Element', desc: 'Find a peak element (greater than neighbors).', constr: '1 ≤ N ≤ 10^5', inFmt: 'Line1: N. Line2: array.', outFmt: 'Peak element value.', tc: [{i:'7\n1 2 3 1 2 3 4',o:'3'},{i:'5\n1 2 1 3 5',o:'2'},{i:'1\n42',o:'42'},{i:'3\n1 2 3',o:'3'},{i:'4\n5 4 3 2',o:'5'}] },
  ],
  'Backtracking': [
    { t: 'Generate Permutations', desc: 'Generate all permutations of first N natural numbers.', constr: '1 ≤ N ≤ 8', inFmt: 'Single integer N.', outFmt: 'All permutations, one per line.', tc: [{i:'3',o:'1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1'},{i:'2',o:'1 2\n2 1'},{i:'1',o:'1'},{i:'4',o:'1 2 3 4\n1 2 4 3\n1 3 2 4\n1 3 4 2\n1 4 2 3\n1 4 3 2\n2 1 3 4\n2 1 4 3\n2 3 1 4\n2 3 4 1\n2 4 1 3\n2 4 3 1\n3 1 2 4\n3 1 4 2\n3 2 1 4\n3 2 4 1\n3 4 1 2\n3 4 2 1\n4 1 2 3\n4 1 3 2\n4 2 1 3\n4 2 3 1\n4 3 1 2\n4 3 2 1'}] },
    { t: 'N-Queens Count', desc: 'Count ways to place N queens on NxN board.', constr: '1 ≤ N ≤ 12', inFmt: 'Single integer N.', outFmt: 'Number of solutions.', tc: [{i:'4',o:'2'},{i:'1',o:'1'},{i:'8',o:'92'},{i:'5',o:'10'},{i:'6',o:'4'}] },
    { t: 'Subset Sum (Backtracking)', desc: 'Find all subsets that sum to target.', constr: '1 ≤ N ≤ 20', inFmt: 'Line1: N target. Line2: array.', outFmt: 'Number of subsets.', tc: [{i:'4 5\n1 2 3 4',o:'2'},{i:'5 10\n2 3 5 6 8',o:'3'},{i:'3 6\n1 2 3',o:'2'},{i:'4 0\n1 2 3 4',o:'1'},{i:'6 15\n1 2 3 4 5 6',o:'4'}] },
    { t: 'Combination Sum', desc: 'Find all unique combinations summing to target.', constr: '1 ≤ N ≤ 30, candidates ≤ 40', inFmt: 'Line1: N target. Line2: candidates.', outFmt: 'Number of combinations.', tc: [{i:'4 7\n2 3 6 7',o:'2'},{i:'3 8\n2 3 5',o:'3'},{i:'4 1\n1 2 3 4',o:'1'},{i:'3 5\n1 2 3',o:'3'},{i:'5 10\n2 5 3 6 7',o:'4'}] },
  ],
  'Heap': [
    { t: 'Kth Largest Element', desc: 'Find Kth largest element in array.', constr: '1 ≤ N ≤ 10^5, 1 ≤ K ≤ N', inFmt: 'Line1: N K. Line2: array.', outFmt: 'Kth largest.', tc: [{i:'6 2\n3 2 1 5 6 4',o:'5'},{i:'9 4\n3 2 3 1 2 4 5 5 6',o:'4'},{i:'1 1\n42',o:'42'},{i:'5 3\n1 2 3 4 5',o:'3'},{i:'7 1\n7 6 5 4 3 2 1',o:'7'}] },
    { t: 'Merge K Sorted Arrays', desc: 'Merge K sorted arrays into one sorted array.', constr: '1 ≤ K ≤ 100, total N ≤ 10^5', inFmt: 'Line1: K. Next: for each array, line with count N then N ints.', outFmt: 'Merged sorted array.', tc: [{i:'2\n3 1 3 5\n3 2 4 6',o:'1 2 3 4 5 6'},{i:'3\n2 1 4\n3 2 5 7\n2 0 6',o:'0 1 2 4 5 6 7'},{i:'1\n3 3 2 1',o:'1 2 3'},{i:'2\n1 10\n1 20',o:'10 20'},{i:'3\n2 1 8\n2 3 5\n2 2 4',o:'1 2 3 4 5 8'}] },
    { t: 'Top K Frequent Elements', desc: 'Find K most frequent elements.', constr: '1 ≤ N ≤ 10^5', inFmt: 'Line1: N K. Line2: array.', outFmt: 'K most frequent elements.', tc: [{i:'6 2\n1 1 1 2 2 3',o:'1 2'},{i:'4 1\n1 1 1 2',o:'1'},{i:'8 3\n1 2 2 3 3 3 4 4',o:'3 2 4'},{i:'1 1\n42',o:'42'},{i:'5 2\n1 2 2 3 3',o:'2 3'}] },
  ],
  'Number Theory': [
    { t: 'Modular Exponentiation', desc: 'Compute (a^b) % m efficiently.', constr: '1 ≤ a,m ≤ 10^9, 0 ≤ b ≤ 10^9', inFmt: 'Three integers a b m.', outFmt: '(a^b) % m.', tc: [{i:'2 10 1000',o:'24'},{i:'3 5 100',o:'43'},{i:'10 0 7',o:'1'},{i:'5 3 13',o:'8'},{i:'123 456 789',o:'699'}] },
    { t: 'Euler Totient', desc: 'Compute Euler totient φ(N).', constr: '1 ≤ N ≤ 10^6', inFmt: 'Single integer.', outFmt: 'φ(N).', tc: [{i:'10',o:'4'},{i:'7',o:'6'},{i:'12',o:'4'},{i:'1',o:'1'},{i:'100',o:'40'}] },
    { t: 'Extended Euclidean', desc: 'Find GCD and coefficients x,y for ax+by=GCD(a,b).', constr: '1 ≤ a,b ≤ 10^6', inFmt: 'Two integers.', outFmt: 'GCD x y.', tc: [{i:'30 20',o:'10 1 -1'},{i:'17 5',o:'1 1 -3'},{i:'100 25',o:'25 0 1'},{i:'99 78',o:'3 -11 14'},{i:'24 36',o:'12 -1 1'}] },
  ],
  'Multithreading': [
    { t: 'Print in Order', desc: 'Print numbers 1,2,3 in order using threading primitives.', constr: '', inFmt: 'No input.', outFmt: '1 2 3 in order.', tc: [{i:'',o:'1 2 3'}] },
    { t: 'Producer Consumer', desc: 'Simulate producer-consumer with buffer size N.', constr: '1 ≤ N ≤ 100', inFmt: 'N items to produce.', outFmt: 'Items consumed in order.', tc: [{i:'3',o:'Produced: 1\nConsumed: 1\nProduced: 2\nConsumed: 2\nProduced: 3\nConsumed: 3'},{i:'2',o:'Produced: 1\nConsumed: 1\nProduced: 2\nConsumed: 2'},{i:'1',o:'Produced: 1\nConsumed: 1'}] },
    { t: 'FizzBuzz Multithreaded', desc: 'Print FizzBuzz using 4 threads.', constr: '1 ≤ N ≤ 50', inFmt: 'Single integer.', outFmt: 'Output sequence with Fizz/Buzz/FizzBuzz.', tc: [{i:'15',o:'1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz'},{i:'5',o:'1 2 Fizz 4 Buzz'},{i:'3',o:'1 2 Fizz'}] },
  ],
  'File Handling': [
    { t: 'Read and Sum', desc: 'Read integers from input (file/stdin) and print their sum.', constr: '1 ≤ N ≤ 1000', inFmt: 'N integers.', outFmt: 'Sum.', tc: [{i:'10 20 30',o:'60'},{i:'1 2 3 4 5',o:'15'},{i:'100 200',o:'300'},{i:'-5 5 10',o:'10'},{i:'0 0 0',o:'0'}] },
    { t: 'Word Count', desc: 'Count words in a paragraph.', constr: '1 ≤ |s| ≤ 10000', inFmt: 'A line of text.', outFmt: 'Word count.', tc: [{i:'Hello World',o:'2'},{i:'This is a test',o:'4'},{i:'Coding',o:'1'},{i:'A quick brown fox jumps over the lazy dog',o:'9'},{i:'Spaces   between    words',o:'3'}] },
  ],
  'OOP': [
    { t: 'Rectangle Class', desc: 'Create a Rectangle class with area() and perimeter() methods.', constr: '1 ≤ l,w ≤ 1000', inFmt: 'Length and width.', outFmt: 'Area and perimeter.', tc: [{i:'5 3',o:'15 16'},{i:'10 10',o:'100 40'},{i:'7 2',o:'14 18'},{i:'1 1',o:'1 4'},{i:'100 1',o:'100 202'}] },
    { t: 'Bank Account', desc: 'Implement BankAccount with deposit, withdraw, getBalance.', constr: '1 ≤ Q ≤ 100', inFmt: 'Operations: deposit x, withdraw x, balance.', outFmt: 'Balance after each balance query.', tc: [{i:'4\ndeposit 100\nwithdraw 30\nbalance\ndeposit 50',o:'70'},{i:'5\ndeposit 500\nbalance\nwithdraw 600\nwithdraw 100\nbalance',o:'400'},{i:'3\nbalance\ndeposit 100\nbalance',o:'0\n100'}] },
    { t: 'Student Class', desc: 'Create Student class with name, marks, and grade calculation.', constr: '1 ≤ marks ≤ 100', inFmt: 'Name and 5 subject marks.', outFmt: 'Name, total, and grade.', tc: [{i:'John 85 90 78 92 88',o:'John 433 A'},{i:'Alice 60 65 70 68 72',o:'Alice 335 B'},{i:'Bob 45 50 48 52 40',o:'Bob 235 D'}] },
  ],
};

const ALL_TOPICS = Object.keys(TOPIC_TEMPLATES);
const LEVEL_TOPIC_MAP = {
  1: ['Variables', 'Operators'],
  2: ['Loops', 'If Else'],
  3: ['Functions', 'Mathematics'],
  4: ['Arrays', 'Strings'],
  5: ['Patterns', 'Searching', 'Sorting'],
  6: ['Matrix', 'Recursion', 'Linked List', 'Stack', 'Queue'],
  7: ['Tree', 'Hashing', 'Bit Manipulation', 'Prefix Sum'],
  8: ['Graph', 'Greedy', 'Binary Search', 'Sliding Window', 'Heap'],
  9: ['Dynamic Programming', 'Backtracking', 'Number Theory'],
  10: ['Multithreading', 'File Handling', 'OOP'],
};

function seededRandom(seed) {
  const rng = mulberry32(seed);
  return rng;
}

const TITLE_VARIATIONS = [
  (t, id) => `${t} ${id}`,
  (t, id) => `${t} - Variant ${Math.floor(id / 7) + 1}`,
  (t, id) => `${t} Challenge ${Math.floor(id / 5) + 1}`,
  (t, id) => `${t} [Practice ${Math.floor(id / 11) + 1}]`,
  (t, id) => `${t} (Level ${Math.floor(id / 13) + 1})`,
  (t, id) => `Solve ${t}`,
  (t, id) => `Problem: ${t}`,
  (t, id) => `${t} #${id}`,
  (t, id) => `Task: ${t}`,
  (t, id) => `${t} Exercise ${id}`,
];

function generateProblem(globalId) {
  const rng = seededRandom(globalId + 42);
  const diffLevels = DIFFICULTY_LEVELS;
  
  let diffIdx = 0;
  if (globalId <= 5000) diffIdx = 0;
  else if (globalId <= 10000) diffIdx = 1;
  else if (globalId <= 15000) diffIdx = 2;
  else if (globalId <= 20000) diffIdx = 3;
  else if (globalId <= 25000) diffIdx = 4;
  else if (globalId <= 30000) diffIdx = 5;
  else if (globalId <= 35000) diffIdx = 6;
  else if (globalId <= 40000) diffIdx = 7;
  else if (globalId <= 45000) diffIdx = 8;
  else diffIdx = 9;

  const diff = diffLevels[diffIdx];
  const topics = LEVEL_TOPIC_MAP[diff.id] || ALL_TOPICS;
  // Interleave topics round-robin for natural progression
  const globalOffsetInTier = (globalId - 1) - (diffIdx * 5000);
  const numTopics = topics.length;
  const topicIndex = globalOffsetInTier % numTopics;
  const topic = topics[topicIndex];
  const templates = TOPIC_TEMPLATES[topic];
  const tmplIndex = Math.floor(globalOffsetInTier / numTopics) % templates.length;
  const tmpl = templates[tmplIndex];
  const titleFn = TITLE_VARIATIONS[Math.floor(rng() * TITLE_VARIATIONS.length)];
  const varNum = Math.floor(rng() * 9000) + 1000;

  const xp = [10, 15, 20, 30, 45, 65, 90, 120, 160, 200][diffIdx];
  const complexity = ['O(1)', 'O(n)', 'O(n)', 'O(n log n)', 'O(n log n)', 'O(n²)', 'O(n²)', 'O(2^n)', 'O(n * 2^n)', 'O(n!)'][diffIdx];
  const spaceComplexity = ['O(1)', 'O(1)', 'O(n)', 'O(n)', 'O(n)', 'O(n²)', 'O(n²)', 'O(n)', 'O(n²)', 'O(n!)'][diffIdx];

  const hints = [
    `Think about the ${topic.toLowerCase()} concepts involved.`,
    `Try breaking the problem into smaller sub-problems.`,
    `Consider the edge cases and constraints.`,
  ];

  return {
    id: globalId,
    title: titleFn(tmpl.t || 'Coding Problem', varNum),
    difficulty: diff.name,
    difficultyLevel: diff.id,
    tags: [topic, ...(diffIdx > 4 ? ['Algorithm'] : [])],
    description: tmpl.desc || 'Solve this programming challenge.',
    constraints: tmpl.constr || 'Standard input/output constraints apply.',
    inputFormat: tmpl.inFmt || 'Read input from stdin.',
    outputFormat: tmpl.outFmt || 'Print output to stdout.',
    examples: (tmpl.tc || []).slice(0, 2).map((tc, i) => ({
      input: tc.i,
      output: tc.o,
      explanation: i === 0 ? `Follow the ${topic.toLowerCase()} logic.` : 'Apply the same approach.',
    })),
    testCases: (tmpl.tc || []).map((tc, i) => ({
      input: tc.i,
      output: tc.o,
      hidden: i >= (tmpl.tc || []).length - 1,
    })),
    hints: hints,
    timeComplexity: complexity,
    spaceComplexity: spaceComplexity,
    xpReward: xp,
  };
}

let problemsCache = null;

const CODING_PROBLEMS = [];
for (let i = 1; i <= TOTAL_PROBLEMS; i++) {
  CODING_PROBLEMS.push(generateProblem(i));
}

export { CODING_PROBLEMS, TOTAL_PROBLEMS };

export function getProblem(id) {
  return CODING_PROBLEMS[id - 1];
}

export function getProblemsSlice(start, count) {
  return CODING_PROBLEMS.slice(start - 1, start - 1 + count);
}
