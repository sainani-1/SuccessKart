import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Gamepad2, Star, RotateCcw, Trophy, Zap, Lock, ArrowLeft, Brain, Cpu, Shield, Target, Flame, Clock, Code2, Terminal, BugPlay, LayoutList, Gauge, ChevronRight, Heart, Sparkles, Volume2, VolumeX, Pause, Play, SkipForward, AlertTriangle, CheckCircle, XCircle, MousePointerClick } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Coffee = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
    <line x1="6" x2="6" y1="2" y2="4" />
    <line x1="10" x2="10" y1="2" y2="4" />
    <line x1="14" x2="14" y1="2" y2="4" />
  </svg>
);

const GAMES = [
  { id: 'code-rush', label: 'Code Rush', icon: Terminal, desc: 'Type code snippets before they reach the bottom! Speed typing game.', color: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-50', textColor: 'text-cyan-700', border: 'border-cyan-200' },
  { id: 'code-builder', label: 'Code Builder', icon: LayoutList, desc: 'Drag & drop scrambled code lines into the correct order.', color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', textColor: 'text-violet-700', border: 'border-violet-200' },
  { id: 'bug-buster', label: 'Bug Buster', icon: BugPlay, desc: 'Find and squash bugs in code snippets before time runs out!', color: 'from-red-500 to-rose-600', bg: 'bg-red-50', textColor: 'text-red-700', border: 'border-red-200' },
];

const LANGUAGES = [
  { id: 'c', label: 'C', icon: Cpu, color: 'from-blue-600 to-blue-800', desc: 'Systems programming fundamentals' },
  { id: 'cpp', label: 'C++', icon: Shield, color: 'from-purple-600 to-purple-800', desc: 'Object-oriented & systems programming' },
  { id: 'java', label: 'Java', icon: Coffee, color: 'from-orange-600 to-red-600', desc: 'Platform-independent applications' },
  { id: 'python', label: 'Python', icon: Brain, color: 'from-green-600 to-emerald-600', desc: 'AI, automation & general purpose' },
];

const LEVELS = ['Basic', 'Intermediate', 'Advanced', 'Master'];

const STORAGE_KEY = 'learn_by_playing_progress_v2';

// ==================== GAME DATA ====================

const CODE_RUSH_SNIPPETS = {
  c: {
    Basic: [
      { code: '#include <stdio.h>\nint main() { printf("Hello"); return 0; }', hint: 'Include stdio, main function, printf' },
      { code: 'int x = 10; float y = 3.14;', hint: 'Integer and float declarations' },
      { code: 'if (x > 0) { printf("Positive"); }', hint: 'If condition with positive check' },
      { code: 'for (int i = 0; i < 5; i++) { }', hint: 'For loop from 0 to 4' },
      { code: 'while (n > 0) { n--; }', hint: 'While loop decrementing' },
    ],
    Intermediate: [
      { code: 'int arr[5] = {1,2,3,4,5}; for(int i=0;i<5;i++) printf("%d",arr[i]);', hint: 'Array declaration and loop print' },
      { code: 'int *ptr = (int*)malloc(10 * sizeof(int)); free(ptr);', hint: 'Dynamic memory allocation and free' },
      { code: 'struct Student { char name[50]; int age; };', hint: 'Structure definition with name and age' },
      { code: 'int add(int a, int b) { return a + b; }', hint: 'Function that adds two integers' },
      { code: 'FILE *fp = fopen("file.txt","r"); fclose(fp);', hint: 'File open for reading and close' },
    ],
    Advanced: [
      { code: 'void (*funcPtr)(int) = &myFunction; funcPtr(10);', hint: 'Function pointer declaration and call' },
      { code: 'typedef struct { int x; int y; } Point; Point p = {10,20};', hint: 'Typedef struct and initialization' },
      { code: 'union Data { int i; float f; char str[20]; };', hint: 'Union with int, float, and string' },
      { code: 'int (*arrPtr)[5] = &arr; (*arrPtr)[0] = 100;', hint: 'Pointer to array of 5 ints' },
      { code: 'void callback(void (*fn)()) { fn(); }', hint: 'Function taking callback parameter' },
    ],
    Master: [
      { code: '#define SQUARE(x) ((x)*(x)) int r = SQUARE(5);', hint: 'Macro definition for square' },
      { code: 'int arr[] = {1,2,3,4,5}; int len = sizeof(arr)/sizeof(arr[0]);', hint: 'Array length using sizeof' },
      { code: 'void *ptr = &x; int *iptr = (int*)ptr;', hint: 'Void pointer cast to int pointer' },
      { code: 'enum Color { RED, GREEN, BLUE }; Color c = RED;', hint: 'Enum declaration and usage' },
      { code: 'setjmp(buf); longjmp(buf, 1);', hint: 'Non-local jump with setjmp/longjmp' },
    ],
  },
  cpp: {
    Basic: [
      { code: '#include <iostream>\nusing namespace std;\nint main() { cout << "Hi"; }', hint: 'Basic C++ with iostream and cout' },
      { code: 'int x; cin >> x; cout << x;', hint: 'Input and output using streams' },
      { code: 'string name = "Alice"; cout << name.length();', hint: 'String declaration and length method' },
      { code: 'for (int i : {1,2,3}) { cout << i; }', hint: 'Range-based for loop C++11' },
      { code: 'vector<int> v = {1,2,3}; v.push_back(4);', hint: 'Vector initialization and push_back' },
    ],
    Intermediate: [
      { code: 'class Car { public: void drive() {} }; Car c; c.drive();', hint: 'Class with method and object' },
      { code: 'virtual void sound() = 0;', hint: 'Pure virtual function declaration' },
      { code: 'template <typename T> T max(T a, T b) { return a>b?a:b; }', hint: 'Template function for max' },
      { code: 'shared_ptr<int> p = make_shared<int>(10);', hint: 'Shared pointer creation with make_shared' },
      { code: 'auto result = accumulate(v.begin(), v.end(), 0);', hint: 'STL accumulate algorithm' },
    ],
    Advanced: [
      { code: 'unique_ptr<int> uptr = make_unique<int>(42);', hint: 'Unique pointer with make_unique' },
      { code: 'vector<int> v; transform(v.begin(),v.end(),v.begin(), [](int x){return x*2;});', hint: 'Transform with lambda' },
      { code: 'class Base { virtual ~Base() = default; };', hint: 'Virtual destructor with default' },
      { code: 'std::map<string, int> m; m["key"] = 42;', hint: 'Map with string key and int value' },
      { code: 'thread t([]{ cout << "Hello"; }); t.join();', hint: 'Thread with lambda and join' },
    ],
    Master: [
      { code: 'template<typename... Args> auto sum(Args... args) { return (args + ...); }', hint: 'Fold expression variadic template' },
      { code: 'concept Integral = is_integral_v<T>;', hint: 'C++20 concept definition' },
      { code: 'auto fn = [](auto x) { return x * x; };', hint: 'Generic lambda with auto parameter' },
      { code: 'jthread jt([]{ this_thread::sleep_for(1s); });', hint: 'C++20 joining thread' },
      { code: 'std::optional<int> val = std::nullopt;', hint: 'Optional with null state' },
    ],
  },
  java: {
    Basic: [
      { code: 'public class Main { public static void main(String[] a) { } }', hint: 'Main class with entry point' },
      { code: 'System.out.println("Hello World");', hint: 'Print line statement' },
      { code: 'int[] arr = new int[5]; arr[0] = 10;', hint: 'Array creation and element assignment' },
      { code: 'String s = "Java"; System.out.println(s.length());', hint: 'String with length method' },
      { code: 'for (int i = 0; i < 10; i++) { }', hint: 'Standard for loop' },
    ],
    Intermediate: [
      { code: 'List<String> list = new ArrayList<>(); list.add("Hi");', hint: 'Generic ArrayList with add' },
      { code: 'class Animal { void sound() {} } class Dog extends Animal { }', hint: 'Class inheritance with extends' },
      { code: 'try { int x = 1/0; } catch(Exception e) { }', hint: 'Try-catch exception handling' },
      { code: 'interface Drawable { void draw(); }', hint: 'Interface with abstract method' },
      { code: 'Map<String,Integer> map = new HashMap<>(); map.put("a",1);', hint: 'HashMap with put operation' },
    ],
    Advanced: [
      { code: 'Stream.of(1,2,3).filter(n->n>1).collect(Collectors.toList());', hint: 'Stream filter and collect' },
      { code: 'Optional<String> opt = Optional.ofNullable(getValue());', hint: 'Optional with ofNullable' },
      { code: 'List<Integer> nums = Arrays.asList(1,2,3); nums.stream().map(n->n*2);', hint: 'Stream map operation' },
      { code: 'synchronized(this) { count++; }', hint: 'Synchronized block for thread safety' },
      { code: 'Thread t = new Thread(() -> System.out.println("Run")); t.start();', hint: 'Thread with lambda runnable' },
    ],
    Master: [
      { code: 'var list = new ArrayList<String>(); // Java 10+', hint: 'Local variable type inference' },
      { code: 'record Point(int x, int y) { } // Java 14+', hint: 'Record declaration for data carrier' },
      { code: 'sealed class Shape permits Circle, Square { }', hint: 'Sealed class with permits' },
      { code: 'CompletableFuture.supplyAsync(() -> compute()).thenAccept(System.out::println);', hint: 'Async future with thenAccept' },
      { code: '@FunctionalInterface interface F { void go(); }', hint: 'Functional interface annotation' },
    ],
  },
  python: {
    Basic: [
      { code: 'print("Hello, Python!")', hint: 'Print function call' },
      { code: 'name = input("Enter name: ")', hint: 'Input function with prompt' },
      { code: 'nums = [1, 2, 3, 4, 5]', hint: 'List literal with integers' },
      { code: 'for i in range(5): print(i)', hint: 'For loop with range' },
      { code: 'if x > 0: print("Positive")', hint: 'If condition with colon syntax' },
    ],
    Intermediate: [
      { code: 'd = {"name": "Alice", "age": 30}', hint: 'Dictionary literal with string keys' },
      { code: 'squares = [x**2 for x in range(10)]', hint: 'List comprehension with squares' },
      { code: 'def add(a, b): return a + b', hint: 'Function definition with return' },
      { code: 'try: x = 1/0\nexcept ZeroDivisionError: pass', hint: 'Try-except with specific exception' },
      { code: 'with open("file.txt") as f: data = f.read()', hint: 'Context manager file read' },
    ],
    Advanced: [
      { code: 'filtered = list(filter(lambda x: x > 0, nums))', hint: 'Filter with lambda and list conversion' },
      { code: 'class Animal: def speak(self): pass', hint: 'Class with method definition' },
      { code: 'nums = [1,2,3]; doubled = list(map(lambda x: x*2, nums))', hint: 'Map with lambda on list' },
      { code: 'from functools import reduce; total = reduce(lambda a,b: a+b, nums)', hint: 'Reduce with lambda accumulation' },
      { code: 'async def fetch(): await asyncio.sleep(1)', hint: 'Async function with await' },
    ],
    Master: [
      { code: 'decorator = lambda f: lambda: "!" + f() + "!"', hint: 'Lambda-based decorator pattern' },
      { code: 'gen = (x**2 for x in range(10))', hint: 'Generator expression with parentheses' },
      { code: '@dataclass\nclass Point: x: int; y: int', hint: 'Dataclass decorator with fields' },
      { code: 'import numpy as np; arr = np.array([1,2,3])', hint: 'NumPy array creation' },
      { code: 'with concurrent.futures.ThreadPoolExecutor() as ex: ex.submit(fn)', hint: 'ThreadPoolExecutor submit' },
    ],
  },
};

const CODE_BUILDER_CHALLENGES = {
  c: {
    Basic: [
      { lines: ['#include <stdio.h>', 'int main() {', '    printf("Hello World\\n");', '    return 0;', '}'], hint: 'Complete C program printing Hello World' },
      { lines: ['int x = 5;', 'int y = 10;', 'int sum = x + y;', 'printf("%d", sum);'], hint: 'Add two integers and print result' },
      { lines: ['int i;', 'for (i = 0; i < 5; i++) {', '    printf("%d\\n", i);', '}'], hint: 'Loop to print numbers 0 to 4' },
    ],
    Intermediate: [
      { lines: ['int arr[3] = {10, 20, 30};', 'int *ptr = arr;', 'for (int i = 0; i < 3; i++) {', '    printf("%d ", *(ptr + i));', '}'], hint: 'Array traversal using pointer arithmetic' },
      { lines: ['struct Student {', '    char name[50];', '    int age;', '};', 'struct Student s1 = {"Alice", 20};'], hint: 'Define struct and initialize instance' },
      { lines: ['int *p = (int*)malloc(sizeof(int));', '*p = 42;', 'printf("%d", *p);', 'free(p);'], hint: 'Dynamic allocation, assignment, and deallocation' },
    ],
    Advanced: [
      { lines: ['void swap(int *a, int *b) {', '    int temp = *a;', '    *a = *b;', '    *b = temp;', '}'], hint: 'Swap function using pointer parameters' },
      { lines: ['FILE *fp = fopen("data.txt", "w");', 'fprintf(fp, "Hello File\\n");', 'fclose(fp);'], hint: 'Write to file using fprintf' },
      { lines: ['int (*cmp)(const void*, const void*);', 'qsort(arr, n, sizeof(int), cmp);'], hint: 'Function pointer for qsort comparator' },
    ],
    Master: [
      { lines: ['#define MAX(a, b) ((a) > (b) ? (a) : (b))', 'int result = MAX(10, 20);', 'printf("%d", result);'], hint: 'Macro for max and its usage' },
      { lines: ['union Data {', '    int i;', '    float f;', '    char str[10];', '};', 'union Data d; d.i = 42;'], hint: 'Union declaration and int member assignment' },
      { lines: ['void *ptr = &x;', 'int *iptr = (int*)ptr;', 'printf("%d", *iptr);'], hint: 'Void pointer cast and dereference' },
    ],
  },
  cpp: {
    Basic: [
      { lines: ['#include <iostream>', 'using namespace std;', 'int main() {', '    cout << "Hello C++" << endl;', '    return 0;', '}'], hint: 'Basic C++ program with cout' },
      { lines: ['string name;', 'cout << "Enter name: ";', 'cin >> name;', 'cout << "Hi " << name;'], hint: 'Read string input and print greeting' },
      { lines: ['vector<int> nums = {1, 2, 3};', 'nums.push_back(4);', 'for (int n : nums) {', '    cout << n << " ";', '}'], hint: 'Vector with range-based for loop' },
    ],
    Intermediate: [
      { lines: ['class Rectangle {', 'public:', '    int w, h;', '    int area() { return w * h; }', '};', 'Rectangle r; r.w = 5; r.h = 3;'], hint: 'Class with member function and object' },
      { lines: ['template <typename T>', 'T square(T x) {', '    return x * x;', '}', 'int r = square(5);'], hint: 'Template function for square' },
      { lines: ['auto add = [](int a, int b) { return a + b; };', 'int r = add(3, 4);'], hint: 'Lambda expression assigned to auto' },
    ],
    Advanced: [
      { lines: ['unique_ptr<int> p = make_unique<int>(42);', 'cout << *p;'], hint: 'Unique pointer creation and dereference' },
      { lines: ['vector<int> v{1,2,3,4};', 'transform(v.begin(), v.end(), v.begin(),', '    [](int x) { return x * 2; });'], hint: 'STL transform doubling each element' },
      { lines: ['thread t([]{ cout << "Thread!"; });', 't.join();'], hint: 'Thread with lambda and join' },
    ],
    Master: [
      { lines: ['template<typename... Args>', 'auto sum(Args... args) {', '    return (args + ...);', '}', 'auto r = sum(1, 2, 3, 4);'], hint: 'Fold expression summing variadic args' },
      { lines: ['std::optional<int> parse(const string& s) {', '    try { return stoi(s); }', '    catch(...) { return nullopt; }', '}'], hint: 'Optional return for safe integer parsing' },
      { lines: ['vector<int> v(5);', 'iota(v.begin(), v.end(), 1);', 'auto it = find_if(v.begin(), v.end(),', '    [](int x) { return x > 3; });'], hint: 'Iota fill and find_if with lambda' },
    ],
  },
  java: {
    Basic: [
      { lines: ['public class Hello {', '    public static void main(String[] args) {', '        System.out.println("Hello Java!");', '    }', '}'], hint: 'Complete Java class with main method' },
      { lines: ['int[] numbers = new int[3];', 'numbers[0] = 10;', 'numbers[1] = 20;', 'numbers[2] = 30;'], hint: 'Array creation and element assignment' },
      { lines: ['String msg = "Java";', 'int len = msg.length();', 'System.out.println(len);'], hint: 'String length method call' },
    ],
    Intermediate: [
      { lines: ['List<String> list = new ArrayList<>();', 'list.add("Apple");', 'list.add("Banana");', 'for (String s : list) {', '    System.out.println(s);', '}'], hint: 'ArrayList with enhanced for loop' },
      { lines: ['class Animal {', '    void sound() {', '        System.out.println("Generic");', '    }', '}'], hint: 'Base class with method' },
      { lines: ['try {', '    int r = 10 / 0;', '} catch (ArithmeticException e) {', '    System.out.println("Cannot divide");', '}'], hint: 'Try-catch for arithmetic exception' },
    ],
    Advanced: [
      { lines: ['List<Integer> nums = Arrays.asList(1,2,3,4);', 'List<Integer> even = nums.stream()', '    .filter(n -> n % 2 == 0)', '    .collect(Collectors.toList());'], hint: 'Stream filter even numbers and collect' },
      { lines: ['Optional<String> opt = Optional.of("Hello");', 'opt.ifPresent(s -> System.out.println(s));'], hint: 'Optional with ifPresent consumer' },
      { lines: ['Thread t = new Thread(() -> {', '    System.out.println("Running");', '});', 't.start();'], hint: 'Thread with lambda runnable' },
    ],
    Master: [
      { lines: ['record Point(int x, int y) {}', 'Point p = new Point(3, 4);', 'System.out.println(p.x());'], hint: 'Record class and accessor method' },
      { lines: ['CompletableFuture<String> f =', '    CompletableFuture.supplyAsync(() -> "Hi");', 'f.thenAccept(System.out::println);'], hint: 'Async supply and then accept' },
      { lines: ['List.of(1,2,3).stream()', '    .map(n -> n * n)', '    .forEach(System.out::println);'], hint: 'Stream map square and forEach print' },
    ],
  },
  python: {
    Basic: [
      { lines: ['name = input("Enter name: ")', 'print(f"Hello, {name}!")'], hint: 'Read input and print f-string' },
      { lines: ['nums = [1, 2, 3, 4, 5]', 'for n in nums:', '    print(n)'], hint: 'List iteration with for loop' },
      { lines: ['x = 10', 'if x > 5:', '    print("Greater")', 'else:', '    print("Smaller")'], hint: 'If-else conditional' },
    ],
    Intermediate: [
      { lines: ['squares = [x**2 for x in range(10) if x % 2 == 0]', 'print(squares)'], hint: 'List comprehension with filter' },
      { lines: ['def factorial(n):', '    if n <= 1: return 1', '    return n * factorial(n-1)'], hint: 'Recursive factorial function' },
      { lines: ['d = {"name": "Alice", "age": 30}', 'for k, v in d.items():', '    print(f"{k}: {v}")'], hint: 'Dictionary iteration with items()' },
    ],
    Advanced: [
      { lines: ['class Dog:', '    def __init__(self, name):', '        self.name = name', '    def bark(self):', '        print(f"{self.name} says Woof!")'], hint: 'Class with constructor and method' },
      { lines: ['filtered = list(filter(lambda x: x > 0, [-1, 2, -3, 4]))', 'print(filtered)'], hint: 'Filter positive numbers with lambda' },
      { lines: ['with open("data.txt", "w") as f:', '    f.write("Hello Python\\n")'], hint: 'Context manager for file write' },
    ],
    Master: [
      { lines: ['@dataclass', 'class Point:', '    x: int', '    y: int', 'p = Point(3, 4)'], hint: 'Dataclass decorator with type hints' },
      { lines: ['import asyncio', 'async def fetch():', '    await asyncio.sleep(1)', '    return "data"', 'result = asyncio.run(fetch())'], hint: 'Async function with sleep and run' },
      { lines: ['nums = [1,2,3,4,5]', 'result = list(map(lambda x: x*2,', '    filter(lambda x: x%2==0, nums)))'], hint: 'Map and filter chained on list' },
    ],
  },
};

const BUG_BUSTER_CHALLENGES = {
  c: {
    Basic: [
      { code: ['#include <stdio.h>', '', 'int main() {', '    printf("Hello World\\n")', '    return 0;', '}'], bugLine: 3, fix: 'printf("Hello World\\n");', hint: 'Missing semicolon at end of printf statement' },
      { code: ['int main() {', '    int x = 10', '    return 0;', '}'], bugLine: 1, fix: 'int x = 10;', hint: 'Missing semicolon after variable declaration' },
      { code: ['int i;', 'for (i = 0 i < 5; i++) {', '    printf("%d", i);', '}'], bugLine: 1, fix: 'for (i = 0; i < 5; i++) {', hint: 'Missing semicolon in for loop initialization' },
    ],
    Intermediate: [
      { code: ['int *ptr;', '*ptr = 42;', 'printf("%d", *ptr);'], bugLine: 0, fix: 'int *ptr = (int*)malloc(sizeof(int));', hint: 'Pointer used without allocation - uninitialized pointer' },
      { code: ['int arr[3] = {1,2,3};', 'printf("%d", arr[3]);'], bugLine: 1, fix: 'printf("%d", arr[2]);', hint: 'Array index out of bounds - arr has indices 0,1,2' },
      { code: ['void func() {', '    return 42;', '}'], bugLine: 1, fix: '    return;', hint: 'Void function should not return a value' },
    ],
    Advanced: [
      { code: ['int* getPtr() {', '    int x = 42;', '    return &x;', '}'], bugLine: 2, fix: '    int *x = malloc(sizeof(int)); *x = 42; return x;', hint: 'Returning address of local variable (dangling pointer)' },
      { code: ['char *s = "Hello";', "s[0] = 'h';"], bugLine: 1, fix: "char s[] = \"Hello\"; s[0] = 'h';", hint: 'String literal is immutable - modify char array instead' },
      { code: ['free(ptr);', 'free(ptr);'], bugLine: 1, fix: 'ptr = NULL; // no second free', hint: 'Double free - freeing already freed pointer' },
    ],
    Master: [
      { code: ['int arr[5];', 'memset(arr, 0, 5);'], bugLine: 1, fix: 'memset(arr, 0, sizeof(arr));', hint: 'memset size should be full array size, not element count' },
      { code: ['struct S { int a; int b; };', 'printf("%d", sizeof(struct S));', '// expects 8 but may be 8 or more'], bugLine: -1, fix: '// Use __attribute__((packed)) if exact 8 needed', hint: 'This might actually be fine - padding is implementation-defined' },
      { code: ['int x = 1;', 'switch(x) {', '    case 1: printf("One");', '    case 2: printf("Two");', '}'], bugLine: 3, fix: '    case 1: printf("One"); break;', hint: 'Missing break statement - falls through to next case' },
    ],
  },
  cpp: {
    Basic: [
      { code: ['#include <iostream>', 'using namespace std;', 'int main() {', '    cout << "Hello"', '    return 0;', '}'], bugLine: 3, fix: '    cout << "Hello" << endl;', hint: 'Missing semicolon or stream end' },
      { code: ['int main() {', '    string s;', '    return 0;', '}'], bugLine: 1, fix: '#include <string>\\nint main() {\\n    string s;', hint: 'Missing #include <string> header' },
      { code: ['auto v = vector<int>{1,2,3};', 'cout << v.size;'], bugLine: 1, fix: 'cout << v.size();', hint: 'size() is a member function call, not a member variable' },
    ],
    Intermediate: [
      { code: ['class A { int x; };', 'A a;', 'a.x = 10;'], bugLine: 2, fix: '// x is private - add public: or use setter', hint: 'Class members are private by default' },
      { code: ['int& getRef() {', '    int x = 5;', '    return x;', '}'], bugLine: 2, fix: '    static int x = 5; return x;', hint: 'Returning reference to local variable' },
      { code: ['void del(int* p) { delete p; }', 'int main() {', '    int x = 5;', '    del(&x);', '}'], bugLine: 3, fix: '    // delete only on heap memory from new', hint: 'Deleting stack-allocated variable - undefined behavior' },
    ],
    Advanced: [
      { code: ['unique_ptr<int> p(new int(5));', 'unique_ptr<int> q = p;'], bugLine: 1, fix: 'unique_ptr<int> q = move(p);', hint: 'unique_ptr cannot be copied, only moved' },
      { code: ['vector<int> v;', 'for (int i = 0; i <= v.size(); i++) { }'], bugLine: 1, fix: 'for (int i = 0; i < v.size(); i++) { }', hint: '<= causes out-of-bounds, should be <' },
      { code: ['auto it = v.erase(v.begin());', 'it--; // use after erase'], bugLine: 1, fix: "// v.erase returns next valid iterator, don't decrement", hint: 'Using invalidated iterator after erase' },
    ],
    Master: [
      { code: ['int&& rref = 42;', 'int& ref = rref;'], bugLine: 1, fix: 'int&& ref = move(rref); // or int& ref = rref;', hint: 'Cannot bind lvalue reference to rvalue reference directly' },
      { code: ['template<typename T>', 'void f(T&&) {}', 'int x = 1;', 'f(x); // works', 'f(1); // works'], bugLine: -1, fix: '// This is actually correct - forwarding reference', hint: 'This code is actually valid - T&& is a forwarding reference' },
      { code: ['auto p = make_shared<int>(5);', 'weak_ptr<int> w = p;', 'cout << *w.lock();', 'p.reset();', 'cout << *w.lock(); // crash'], bugLine: 4, fix: 'if (auto s = w.lock()) cout << *s;', hint: 'Lock expired - check before dereferencing weak_ptr' },
    ],
  },
  java: {
    Basic: [
      { code: ['public class Main {', '    public static void main(String[] args) {', '        System.out.println("Hello")', '    }', '}'], bugLine: 2, fix: '        System.out.println("Hello");', hint: 'Missing semicolon at end of statement' },
      { code: ['int x = 10;', 'if (x = 5) {', '    System.out.println("Five");', '}'], bugLine: 1, fix: 'if (x == 5) {', hint: 'Assignment = used instead of comparison ==' },
      { code: ['String s = "Java";', 'int len = s.length;'], bugLine: 1, fix: 'int len = s.length();', hint: 'length() is a method in Java, not a property' },
    ],
    Intermediate: [
      { code: ['int[] arr = new int[5];', 'System.out.println(arr[5]);'], bugLine: 1, fix: 'System.out.println(arr[4]);', hint: 'Array index 5 is out of bounds for size 5 (0-4)' },
      { code: ['class Base {', '    public Base(String s) {}', '}', 'class Derived extends Base {', '    public Derived() {}', '}'], bugLine: 4, fix: '    public Derived() { super(""); }', hint: 'Implicit super constructor Base() is undefined' },
      { code: ['Object[] objs = new String[5];', 'objs[0] = Integer.valueOf(1);'], bugLine: 1, fix: '// ArrayStoreException at runtime - String[] cannot hold Integer', hint: 'Array covariance causes runtime ArrayStoreException' },
    ],
    Advanced: [
      { code: ['List<int> list = new ArrayList<>();'], bugLine: 0, fix: 'List<Integer> list = new ArrayList<>();', hint: 'Cannot use primitive type as generic type parameter' },
      { code: ['public void swap(int a, int b) {', '    int t = a; a = b; b = t;', '}'], bugLine: 0, fix: '// Java is pass-by-value, use array or holder', hint: 'Java passes primitives by value - swap will not work' },
      { code: ['String s = null;', 'if (s.equals("")) { }'], bugLine: 1, fix: 'if ("".equals(s)) { }', hint: 'Calling method on null reference throws NullPointerException' },
    ],
    Master: [
      { code: ['Set<Integer> set = new HashSet<>();', 'set.add(1);', 'set.add(2);', 'for (int i = 0; i < set.size(); i++) {', '    System.out.println(set.get(i));', '}'], bugLine: 4, fix: 'for (int i : set) { System.out.println(i); }', hint: 'Set has no get() method - use enhanced for-each instead' },
      { code: ['var nums = List.of(1, 2, 3);', 'nums.add(4);'], bugLine: 1, fix: '// List.of() returns immutable list, cannot add', hint: 'List.of() creates immutable list - add throws UnsupportedOperationException' },
      { code: ['Thread t = new Thread(() -> {', '    while (true) { }', '});', 't.start();', 't.start();'], bugLine: 4, fix: '// Cannot start a thread twice - throws IllegalThreadStateException', hint: 'Cannot start the same thread more than once' },
    ],
  },
  python: {
    Basic: [
      { code: ['print("Hello"'], bugLine: 0, fix: 'print("Hello")', hint: 'Missing closing parenthesis' },
      { code: ['if x = 5:', '    print("Five")'], bugLine: 0, fix: 'if x == 5:', hint: 'Assignment = used instead of comparison ==' },
      { code: ['for i in range(5)', '    print(i)'], bugLine: 0, fix: 'for i in range(5):', hint: 'Missing colon at end of for statement' },
    ],
    Intermediate: [
      { code: ['def add(a, b):', '    return a + b', 'result = add(5)'], bugLine: 2, fix: 'result = add(5, 3)', hint: 'Missing required second argument' },
      { code: ['nums = [1, 2, 3]', 'nums.remove(10)'], bugLine: 1, fix: 'if 10 in nums: nums.remove(10)', hint: 'ValueError if element not in list' },
      { code: ['d = {}', 'd["key"] += 1'], bugLine: 1, fix: 'd["key"] = d.get("key", 0) + 1', hint: 'KeyError if key does not exist in dict' },
    ],
    Advanced: [
      { code: ['class A:', '    def __init__(self):', '        self.x = 1', 'a = A()', 'print(a.y)'], bugLine: 4, fix: 'print(a.x)  # y does not exist', hint: 'AttributeError - object has no attribute y' },
      { code: ['def outer():', '    x = 10', '    def inner():', '        x += 1', '    inner()', 'outer()'], bugLine: 3, fix: 'nonlocal x\\n        x += 1', hint: 'Local variable x referenced before assignment - need nonlocal' },
      { code: ['def mutable_default(x=[]):', '    x.append(1)', '    return x', 'print(mutable_default())', 'print(mutable_default())'], bugLine: 0, fix: 'def mutable_default(x=None): if x is None: x = []', hint: 'Mutable default argument retains changes between calls' },
    ],
    Master: [
      { code: ['@dataclass', 'class Point:', '    x: int', '    y: int', 'p = Point("a", 2)'], bugLine: 4, fix: 'p = Point(1, 2)  # type mismatch', hint: 'Type hint violation at runtime - dataclass accepts any type' },
      { code: ['import asyncio', 'async def f():', '    return 1', 'result = f()'], bugLine: 3, fix: 'result = asyncio.run(f())', hint: 'Calling async function returns coroutine, not the result' },
      { code: ['gen = (x for x in range(5))', 'print(gen[0])'], bugLine: 1, fix: 'print(next(gen))  # or list(gen)[0]', hint: 'Generator objects do not support indexing' },
    ],
  },
};

// ==================== COMPONENTS ====================

const STORAGE_PROGRESS_KEY = 'lbp_progress';

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_PROGRESS_KEY)) || {}; } catch { return {}; }
}
function saveProgress(p) { localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(p)); }

function percentToColor(pct) {
  if (pct >= 80) return 'from-green-400 to-emerald-500';
  if (pct >= 50) return 'from-amber-400 to-orange-500';
  return 'from-red-400 to-rose-500';
}

const LearnByPlaying = () => {
  const { profile } = useAuth();
  const [view, setView] = useState('hub'); // hub, game-select, playing
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedLang, setSelectedLang] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [progress, setProgress] = useState(loadProgress);
  const [soundOn, setSoundOn] = useState(true);

  // Game states
  const [gameState, setGameState] = useState(null); // game-specific state
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => { saveProgress(progress); }, [progress]);

  if (!profile) return <LoadingSpinner message="Loading..." />;

  const getLevelStars = (lang, level) => progress[`${lang}_${level}`]?.stars || 0;
  const getLevelHigh = (lang, level) => progress[`${lang}_${level}`]?.highScore || 0;
  const isLevelUnlocked = (lang, level) => {
    const idx = LEVELS.indexOf(level);
    if (idx === 0) return true;
    return (progress[`${lang}_${LEVELS[idx-1]}`]?.stars || 0) >= 1;
  };

  const completeLevel = (lang, level, earnedScore, earnedStars) => {
    const key = `${lang}_${level}`;
    const prev = progress[key] || {};
    const newStars = Math.max(earnedStars, prev.stars || 0);
    const newHigh = Math.max(earnedScore, prev.highScore || 0);
    setProgress(p => ({ ...p, [key]: { stars: newStars, highScore: newHigh } }));
  };

  // ==================== CODE RUSH GAME ====================
  const CodeRushGame = () => {
    const snippets = CODE_RUSH_SNIPPETS[selectedLang]?.[selectedLevel] || [];
    const [round, setRound] = useState(0);
    const [typed, setTyped] = useState('');
    const [fallY, setFallY] = useState(0);
    const [phase, setPhase] = useState('ready'); // ready, falling, done
    const [roundScore, setRoundScore] = useState(0);
    const [roundLives, setRoundLives] = useState(3);
    const [roundCombo, setRoundCombo] = useState(0);
    const inputRef = useRef(null);
    const animRef = useRef(null);
    const currentSnippet = snippets[round % snippets.length];

    const startRound = () => {
      setPhase('falling');
      setTyped('');
      setFallY(0);
      inputRef.current?.focus();
    };

    useEffect(() => {
      if (phase === 'falling') {
        const start = Date.now();
        const duration = 8000;
        const tick = () => {
          const elapsed = Date.now() - start;
          const pct = Math.min(elapsed / duration, 1);
          setFallY(pct * 100);
          if (pct < 1) animRef.current = requestAnimationFrame(tick);
          else {
            setPhase('done');
            setRoundLives(l => l - 1);
            setRoundCombo(0);
          }
        };
        animRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animRef.current);
      }
    }, [phase]);

    useEffect(() => {
      if (round > 0 && round <= snippets.length) startRound();
    }, [round]);

    useEffect(() => {
      if (roundLives <= 0) {
        setGameOver(true);
        const stars = roundScore >= 200 ? 3 : roundScore >= 100 ? 2 : 1;
        completeLevel(selectedLang, selectedLevel, roundScore, stars);
        setScore(roundScore);
      }
    }, [roundLives]);

    const handleType = (e) => {
      const val = e.target.value;
      setTyped(val);
      if (val === currentSnippet.code) {
        const bonus = Math.max(0, Math.floor((1 - fallY / 100) * 50));
        const comboBonus = roundCombo * 10;
        const earned = 10 + bonus + comboBonus;
        setRoundScore(s => s + earned);
        setRoundCombo(c => c + 1);
        setPhase('done');
        if (round + 1 >= snippets.length * 2) {
          setGameWon(true);
          const stars = roundScore >= 300 ? 3 : roundScore >= 150 ? 2 : 1;
          completeLevel(selectedLang, selectedLevel, roundScore + earned, stars);
          setScore(roundScore + earned);
        } else {
          setTimeout(() => setRound(r => r + 1), 500);
        }
      }
    };

    const targetCode = currentSnippet?.code || '';
    const diff = targetCode.split('').map((ch, i) => ({ ch, matched: typed[i] === ch, extra: i >= typed.length }));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal size={20} className="text-cyan-500" />
            <span className="font-bold text-slate-700">Code Rush</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1"><Heart size={16} className="text-red-500" />{'♥'.repeat(roundLives)}{'♡'.repeat(3-roundLives)}</div>
            <div className="text-sm font-bold text-slate-700">Score: {roundScore}</div>
            {roundCombo >= 2 && <div className="flex items-center gap-1 text-amber-600 font-bold"><Flame size={16} />x{roundCombo}</div>}
          </div>
        </div>

        <div className="relative h-72 bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
          {phase === 'ready' && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <button onClick={startRound} className="bg-cyan-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-cyan-600 transition shadow-lg flex items-center gap-2">
                <Play size={24} /> Start Round {round + 1}
              </button>
            </div>
          )}
          <div
            className="absolute left-4 right-4 bg-slate-800 rounded-xl p-4 border border-slate-600 transition-all"
            style={{ top: `${phase === 'falling' ? fallY : 0}%` }}
          >
            <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">{currentSnippet?.code}</pre>
            <div className="mt-2 text-xs text-slate-500">{currentSnippet?.hint}</div>
          </div>
          {phase === 'done' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
              {roundLives > 0 ? (
                <div className="text-green-400 font-bold text-xl flex items-center gap-2"><CheckCircle size={24} /> Correct!</div>
              ) : (
                <div className="text-red-400 font-bold text-xl flex items-center gap-2"><XCircle size={24} /> Time's Up!</div>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <input
            ref={inputRef}
            value={typed}
            onChange={handleType}
            placeholder={phase === 'falling' ? "Type the code exactly as shown..." : "Press Start to begin"}
            disabled={phase !== 'falling'}
            className="w-full p-4 rounded-xl border-2 border-slate-200 bg-white font-mono text-sm focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200 outline-none"
          />
          {typed.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-0.5 font-mono text-sm">
              {diff.map((d, i) => (
                <span key={i} className={d.extra ? 'text-slate-300' : d.matched ? 'text-green-500' : 'text-red-500 bg-red-50'}>{d.ch}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==================== CODE BUILDER GAME ====================
  const CodeBuilderGame = () => {
    const challenges = CODE_BUILDER_CHALLENGES[selectedLang]?.[selectedLevel] || [];
    const [round, setRound] = useState(0);
    const [shuffled, setShuffled] = useState([]);
    const [ordered, setOrdered] = useState([]);
    const [phase, setPhase] = useState('ready');
    const [roundScore, setRoundScore] = useState(0);
    const [mistakes, setMistakes] = useState(0);

    const challenge = challenges[round % challenges.length];

    useEffect(() => {
      if (challenge) {
        const s = [...challenge.lines].sort(() => Math.random() - 0.5);
        setShuffled(s);
        setOrdered([]);
        setPhase('arranging');
      }
    }, [round, challenge]);

    const moveToOrder = (idx) => {
      const item = shuffled[idx];
      const newShuffled = shuffled.filter((_, i) => i !== idx);
      const newOrdered = [...ordered, item];
      setShuffled(newShuffled);
      setOrdered(newOrdered);

      // Check if this placement is correct
      const correctIdx = newOrdered.length - 1;
      if (item !== challenge.lines[correctIdx]) setMistakes(m => m + 1);

      if (newOrdered.length === challenge.lines.length) {
        setPhase('done');
        const correct = newOrdered.every((line, i) => line === challenge.lines[i]);
        if (correct) {
          const bonus = Math.max(0, 30 - mistakes * 5);
          const earned = 50 + bonus;
          setRoundScore(s => s + earned);
          if (round + 1 >= challenges.length * 2) {
            setGameWon(true);
            completeLevel(selectedLang, selectedLevel, roundScore + earned, roundScore >= 300 ? 3 : roundScore >= 150 ? 2 : 1);
            setScore(roundScore + earned);
          } else {
            setTimeout(() => setRound(r => r + 1), 1000);
          }
        } else {
          setMistakes(m => m + 1);
          setTimeout(() => {
            setShuffled([...challenge.lines].sort(() => Math.random() - 0.5));
            setOrdered([]);
            setPhase('arranging');
          }, 1500);
        }
      }
    };

    const removeFromOrder = (idx) => {
      const item = ordered[idx];
      setOrdered(ordered.filter((_, i) => i !== idx));
      setShuffled([...shuffled, item]);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutList size={20} className="text-violet-500" />
            <span className="font-bold text-slate-700">Code Builder</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">Mistakes: {mistakes}</div>
            <div className="text-sm font-bold text-slate-700">Score: {roundScore}</div>
          </div>
        </div>

        <div className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-200">
          <Target size={14} className="inline mr-1 text-violet-500" />
          <strong>Goal:</strong> {challenge?.hint}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available Blocks</h4>
            <div className="space-y-1.5">
              {shuffled.map((line, idx) => (
                <button
                  key={idx}
                  onClick={() => phase === 'arranging' && moveToOrder(idx)}
                  disabled={phase !== 'arranging'}
                  className="w-full text-left p-2.5 rounded-lg border-2 border-dashed border-violet-200 bg-violet-50/50 hover:bg-violet-100 hover:border-violet-400 transition cursor-pointer font-mono text-xs text-slate-700"
                >
                  <code>{line}</code>
                </button>
              ))}
              {shuffled.length === 0 && (
                <div className="text-center text-slate-400 py-8 text-sm">All blocks used!</div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Sequence</h4>
            <div className="space-y-1.5 min-h-[200px] rounded-xl border-2 border-slate-200 bg-white p-2">
              {ordered.map((line, idx) => {
                const correct = line === challenge?.lines[idx];
                return (
                  <div
                    key={idx}
                    onClick={() => phase === 'arranging' && removeFromOrder(idx)}
                    className={`p-2.5 rounded-lg border-2 cursor-pointer font-mono text-xs transition ${correct ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white hover:border-red-300'}`}
                  >
                    <code className={correct ? 'text-green-700' : 'text-slate-700'}>{line}</code>
                    {!correct && phase === 'done' && <XCircle size={12} className="inline ml-1 text-red-400" />}
                  </div>
                );
              })}
              {ordered.length === 0 && (
                <div className="text-center text-slate-300 py-8 text-sm">Click blocks from left panel</div>
              )}
            </div>
          </div>
        </div>

        {phase === 'done' && (
          <div className={`p-4 rounded-xl text-center ${mistakes <= 2 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {mistakes <= 2 ? (
              <p className="text-green-700 font-bold flex items-center justify-center gap-2"><CheckCircle size={20} /> Perfect arrangement! +{50 + Math.max(0, 30 - mistakes * 5)} XP</p>
            ) : (
              <p className="text-red-700 font-bold flex items-center justify-center gap-2"><RotateCcw size={20} /> Incorrect order, try again!</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // ==================== BUG BUSTER GAME ====================
  const BugBusterGame = () => {
    const challenges = BUG_BUSTER_CHALLENGES[selectedLang]?.[selectedLevel] || [];
    const [round, setRound] = useState(0);
    const [selectedLine, setSelectedLine] = useState(null);
    const [phase, setPhase] = useState('ready');
    const [roundScore, setRoundScore] = useState(0);
    const [roundLives, setRoundLives] = useState(3);
    const [timeLeft, setTimeLeft] = useState(30);
    const challenge = challenges[round % challenges.length];

    useEffect(() => {
      if (phase === 'hunting') {
        setTimeLeft(30);
        const t = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(t);
              setPhase('done');
              setRoundLives(l => l - 1);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(t);
      }
    }, [phase, round]);

    const startRound = () => {
      setSelectedLine(null);
      setPhase('hunting');
    };

    const handleLineClick = (idx) => {
      if (phase !== 'hunting') return;
      setSelectedLine(idx);
      setPhase('done');
      const isBug = challenge?.bugLine === idx;
      if (isBug || challenge?.bugLine === -1) {
        const bonus = timeLeft * 2;
        const earned = 50 + bonus;
        setRoundScore(s => s + earned);
        setCombo(c => c + 1);
        if (round + 1 >= challenges.length * 2) {
          setGameWon(true);
          completeLevel(selectedLang, selectedLevel, roundScore + earned, roundScore >= 300 ? 3 : roundScore >= 150 ? 2 : 1);
          setScore(roundScore + earned);
        } else {
          setTimeout(() => setRound(r => r + 1), 1500);
        }
      } else {
        setRoundLives(l => l - 1);
        setCombo(0);
        setTimeout(() => {
          if (roundLives <= 1) {
            setGameOver(true);
            completeLevel(selectedLang, selectedLevel, roundScore, roundScore >= 200 ? 3 : roundScore >= 100 ? 2 : 1);
            setScore(roundScore);
          } else {
            setPhase('hunting');
          }
        }, 1500);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BugPlay size={20} className="text-red-500" />
            <span className="font-bold text-slate-700">Bug Buster</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1"><Heart size={16} className="text-red-500" />{'♥'.repeat(roundLives)}{'♡'.repeat(3-roundLives)}</div>
            <div className={`flex items-center gap-1 ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-slate-600'}`}>
              <Clock size={16} /> {timeLeft}s
            </div>
            <div className="text-sm font-bold text-slate-700">Score: {roundScore}</div>
          </div>
        </div>

        <div className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-200">
          <AlertTriangle size={14} className="inline mr-1 text-red-500" />
          <strong>Find the bug!</strong> Click on the line with the error. {challenge?.hint && <span className="text-slate-400">Hint: {challenge.hint}</span>}
        </div>

        {phase === 'ready' && (
          <div className="flex justify-center py-8">
            <button onClick={startRound} className="bg-red-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-red-600 transition shadow-lg flex items-center gap-2">
              <Play size={24} /> Hunt Bug {round + 1}
            </button>
          </div>
        )}

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-700 overflow-x-auto">
          <pre className="text-green-400 font-mono text-sm leading-relaxed">
            {challenge?.code.map((line, idx) => {
              let cls = 'text-green-400';
              if (phase === 'done' && challenge?.bugLine === idx) cls = 'text-red-400 bg-red-900/30 block rounded';
              else if (phase === 'done' && selectedLine === idx && challenge?.bugLine !== idx) cls = 'text-amber-400 bg-amber-900/30 block rounded';
              return (
                <span
                  key={idx}
                  onClick={() => handleLineClick(idx)}
                  className={`block px-2 py-0.5 rounded cursor-pointer transition ${phase === 'hunting' ? 'hover:bg-white/10' : ''}`}
                >
                  <span className="text-slate-600 mr-4 select-none">{idx + 1}</span>
                  {line || ' '}
                </span>
              );
            })}
          </pre>
        </div>

        {phase === 'done' && (
          <div className={`p-4 rounded-xl text-center ${challenge?.bugLine === selectedLine ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {challenge?.bugLine === selectedLine ? (
              <p className="text-green-700 font-bold flex items-center justify-center gap-2">
                <CheckCircle size={20} /> Bug found! +{50 + timeLeft * 2} XP
                <span className="text-sm font-normal text-green-600 ml-2">Fix: {challenge?.fix}</span>
              </p>
            ) : (
              <p className="text-red-700 font-bold flex items-center justify-center gap-2">
                <XCircle size={20} /> {challenge?.bugLine === -1 ? 'Actually no bug here - tricky!' : `Wrong! The bug was on line ${(challenge?.bugLine || 0) + 1}`}
                <span className="text-sm font-normal text-red-600 ml-2">Fix: {challenge?.fix}</span>
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  // ==================== GAME OVER MODAL ====================
  const GameEndModal = () => {
    if (!gameOver && !gameWon) return null;
    const stars = gameWon ? (score >= 300 ? 3 : score >= 150 ? 2 : 1) : (score >= 200 ? 3 : score >= 100 ? 2 : 1);
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-bounce-in">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 shadow-lg flex items-center justify-center ${gameWon ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}>
            {gameWon ? <Trophy size={40} className="text-white" /> : <RotateCcw size={40} className="text-white" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{gameWon ? 'Level Complete!' : 'Game Over'}</h2>
          <p className="text-slate-500 mb-4">{selectedLang?.toUpperCase()} - {selectedLevel}</p>
          <div className="flex justify-center gap-1 mb-4">
            {[1, 2, 3].map(s => <Star key={s} size={32} className={stars >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />)}
          </div>
          <p className="text-3xl font-bold text-amber-600 mb-6">{score} XP</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setView('level-select'); setGameOver(false); setGameWon(false); setScore(0); setLives(3); setCombo(0); }}
              className="px-6 py-3 rounded-xl border-2 border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >Back to Levels</button>
            <button onClick={() => { setGameOver(false); setGameWon(false); setScore(0); setLives(3); setCombo(0); setGameState(null); }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-lg"
            ><RotateCcw size={16} className="inline mr-1" /> Retry</button>
          </div>
        </div>
      </div>
    );
  };

  // ==================== RENDER ====================
  if (view === 'playing' && selectedGame === 'code-rush') return (
    <GameShell onBack={() => { setView('level-select'); setGameOver(false); setGameWon(false); setScore(0); }}>
      <CodeRushGame />
      <GameEndModal />
    </GameShell>
  );
  if (view === 'playing' && selectedGame === 'code-builder') return (
    <GameShell onBack={() => { setView('level-select'); setGameOver(false); setGameWon(false); setScore(0); }}>
      <CodeBuilderGame />
      <GameEndModal />
    </GameShell>
  );
  if (view === 'playing' && selectedGame === 'bug-buster') return (
    <GameShell onBack={() => { setView('level-select'); setGameOver(false); setGameWon(false); setScore(0); }}>
      <BugBusterGame />
      <GameEndModal />
    </GameShell>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg">
              <Gamepad2 size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Learn by Playing</h1>
              <p className="text-slate-500 text-sm">Master coding through interactive games!</p>
            </div>
          </div>
          <button onClick={() => setSoundOn(!soundOn)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
            {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>

        {/* Hub */}
        {view === 'hub' && (
          <>
            {/* Games */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {GAMES.map(game => {
                const Icon = game.icon;
                return (
                  <button key={game.id} onClick={() => { setSelectedGame(game.id); setView('lang-select'); }}
                    className="group bg-white rounded-2xl border-2 border-slate-100 hover:border-slate-200 p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon size={28} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">{game.label}</h3>
                    <p className="text-sm text-slate-500">{game.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Progress Summary */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Trophy size={18} className="text-amber-500" /> Your Progress</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {LANGUAGES.map(lang => {
                  const completed = LEVELS.filter(l => getLevelStars(lang.id, l) >= 1).length;
                  return (
                    <div key={lang.id} className="text-center p-3 rounded-xl bg-slate-50">
                      <p className="font-bold text-slate-900">{lang.label}</p>
                      <p className="text-sm text-slate-500">{completed}/{LEVELS.length} levels</p>
                      <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${percentToColor((completed / LEVELS.length) * 100)}`} style={{ width: `${(completed / LEVELS.length) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Language Select */}
        {view === 'lang-select' && (
          <div className="space-y-4">
            <button onClick={() => setView('hub')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
              <ArrowLeft size={20} /> <span className="font-medium">Back to games</span>
            </button>
            <h2 className="text-xl font-bold text-slate-900">Choose a Language</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {LANGUAGES.map(lang => {
                const Icon = lang.icon;
                return (
                  <button key={lang.id} onClick={() => { setSelectedLang(lang.id); setView('level-select'); }}
                    className="group bg-white rounded-2xl border-2 border-slate-100 hover:border-slate-200 p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${lang.color} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon size={28} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">{lang.label}</h3>
                    <p className="text-sm text-slate-500">{lang.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Level Select */}
        {view === 'level-select' && (
          <div className="space-y-4">
            <button onClick={() => setView('lang-select')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
              <ArrowLeft size={20} /> <span className="font-medium">Back to languages</span>
            </button>
            <h2 className="text-xl font-bold text-slate-900">{LANGUAGES.find(l => l.id === selectedLang)?.label} - Levels</h2>
            <p className="text-sm text-slate-500">Playing: {GAMES.find(g => g.id === selectedGame)?.label}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LEVELS.map((level, idx) => {
                const stars = getLevelStars(selectedLang, level);
                const high = getLevelHigh(selectedLang, level);
                const unlocked = isLevelUnlocked(selectedLang, level);
                const gameData = GAMES.find(g => g.id === selectedGame);
                return (
                  <button key={level} onClick={() => { if (unlocked) { setSelectedLevel(level); setView('playing'); setGameState(null); } }}
                    disabled={!unlocked}
                    className={`relative bg-white rounded-2xl border-2 p-6 text-left transition-all ${unlocked ? 'border-slate-100 hover:border-slate-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer' : 'border-slate-100 opacity-60 cursor-not-allowed'}`}
                  >
                    {!unlocked && <div className="absolute inset-0 bg-white/40 rounded-2xl flex items-center justify-center z-10"><Lock size={32} className="text-slate-400" /></div>}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${unlocked ? `bg-gradient-to-br ${gameData?.color || 'from-indigo-500 to-purple-600'}` : 'bg-slate-200'} flex items-center justify-center`}>
                          {unlocked ? <Target size={20} className="text-white" /> : <Lock size={20} className="text-slate-400" />}
                        </div>
                        <div>
                          <h3 className={`text-lg font-bold ${unlocked ? 'text-slate-900' : 'text-slate-400'}`}>{level}</h3>
                          {high > 0 && <p className="text-xs text-slate-400">Best: {high} XP</p>}
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map(s => <Star key={s} size={16} className={stars >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const GameShell = ({ children, onBack }) => (
  <div className="h-full overflow-y-auto">
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
        <ArrowLeft size={20} /> <span className="font-medium">Back to levels</span>
      </button>
      {children}
    </div>
  </div>
);

export default LearnByPlaying;
