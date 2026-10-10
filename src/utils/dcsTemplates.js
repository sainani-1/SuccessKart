const cFamily = () => [
  { alias: 'for', label: 'for loop', code: 'for (let i = 0; i < n; i++) {\n}' },
  { alias: 'while', label: 'while loop', code: 'while (condition) {\n}' },
  { alias: 'if', label: 'if statement', code: 'if (condition) {\n}' },
  { alias: 'try', label: 'try / catch', code: 'try {\n} catch (error) {\n}' },
  { alias: 'fun', label: 'function', code: 'function name(args) {\n}' },
  { alias: 'main', label: 'main block', code: 'function main() {\n}' },
];

export const CODE_SNIPPETS = {
  javascript: [
    { alias: 'for', label: 'for loop', code: 'for (let i = 0; i < n; i++) {\n}' },
    { alias: 'forof', label: 'for...of', code: 'for (const item of items) {\n}' },
    { alias: 'while', label: 'while loop', code: 'while (condition) {\n}' },
    { alias: 'if', label: 'if statement', code: 'if (condition) {\n}' },
    { alias: 'else', label: 'if / else', code: 'if (condition) {\n} else {\n}' },
    { alias: 'try', label: 'try / catch', code: 'try {\n} catch (error) {\n}' },
    { alias: 'fun', label: 'function', code: 'function name(args) {\n}' },
    { alias: 'main', label: 'main block', code: 'function main() {\n}' },
  ],
  typescript: [
    { alias: 'for', label: 'for loop', code: 'for (let i = 0; i < n; i++) {\n}' },
    { alias: 'forof', label: 'for...of', code: 'for (const item of items) {\n}' },
    { alias: 'while', label: 'while loop', code: 'while (condition) {\n}' },
    { alias: 'if', label: 'if statement', code: 'if (condition) {\n}' },
    { alias: 'try', label: 'try / catch', code: 'try {\n} catch (error) {\n}' },
    { alias: 'fun', label: 'function', code: 'function name(args: unknown): void {\n}' },
  ],
  python: [
    { alias: 'for', label: 'for loop', code: 'for value in values:\n    pass' },
    { alias: 'while', label: 'while loop', code: 'while condition:\n    pass' },
    { alias: 'if', label: 'if statement', code: 'if condition:\n    pass' },
    { alias: 'elif', label: 'else if', code: 'elif condition:\n    pass' },
    { alias: 'try', label: 'try / except', code: 'try:\n    pass\nexcept Exception as e:\n    pass' },
    { alias: 'def', label: 'function', code: 'def name(args):\n    pass' },
    { alias: 'main', label: 'main block', code: 'if __name__ == "__main__":\n    pass' },
  ],
  java: cFamily(),
  c: cFamily(),
  cpp: cFamily(),
  csharp: cFamily(),
  go: cFamily(),
  rust: cFamily(),
  swift: cFamily(),
  kotlin: cFamily(),
  php: cFamily(),
  ruby: [
    { alias: 'for', label: 'for loop', code: 'for i in 1..n\n  puts i\nend' },
    { alias: 'while', label: 'while loop', code: 'while condition\n  # body\nend' },
    { alias: 'if', label: 'if statement', code: 'if condition\n  # body\nend' },
    { alias: 'try', label: 'begin / rescue', code: 'begin\n  # body\nrescue => e\n  # handle\nend' },
    { alias: 'def', label: 'method', code: 'def name(args)\n  # body\nend' },
  ],
};

const INDENT_LANGUAGES = new Set(['python', 'ruby']);

// Lightweight formatter: re-indents brace-based languages, trims trailing
// whitespace for indentation-sensitive languages.
export const formatSource = (language, code) => {
  const text = String(code || '').replace(/\r\n/g, '\n');
  if (INDENT_LANGUAGES.has(language)) {
    return text.split('\n').map((line) => line.replace(/\s+$/, '')).join('\n');
  }

  const lines = text.split('\n');
  const out = [];
  let depth = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push('');
      continue;
    }
    const opens = (trimmed.match(/[{(\[]/g) || []).length;
    const closes = (trimmed.match(/[})]\]/g) || []).length;
    const lineIndent = Math.max(0, depth - Math.max(0, closes - opens));
    out.push('  '.repeat(lineIndent) + trimmed);
    depth = Math.max(0, depth + opens - closes);
  }
  return out.join('\n');
};

const templateKey = (language) => `dcs_template_${language}`;

export const readUserTemplate = (language) => {
  try {
    return localStorage.getItem(templateKey(language)) || '';
  } catch {
    return '';
  }
};

export const writeUserTemplate = (language, code) => {
  try {
    if (code) localStorage.setItem(templateKey(language), code);
    else localStorage.removeItem(templateKey(language));
  } catch {
    // storage unavailable
  }
};

export const snippetsFor = (language) =>
  CODE_SNIPPETS[language] || CODE_SNIPPETS.javascript || [];

export default { CODE_SNIPPETS, formatSource, readUserTemplate, writeUserTemplate, snippetsFor };