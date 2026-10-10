import { useEffect, useRef, useState } from 'react';
import {
  Braces,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  FileCode2,
  Flag,
  Loader2,
  PlayCircle,
  Save,
  Send,
  Star,
  Terminal,
  Wand2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { runDcsJudge } from '../../utils/dcsJudge';
import { submitDcsAttempt } from '../../utils/dcs';
import { DEFAULT_SNIPPETS, isDefaultSnippet } from '../../utils/dcsSnippets';
import LANGUAGES, { LANGUAGE_KEYS } from '../../utils/dcsLanguages';
import { snippetsFor, formatSource, readUserTemplate, writeUserTemplate } from '../../utils/dcsTemplates';
import {
  readQuestionDraft,
  saveQuestionDraft,
  clearQuestionDraft,
  readDefaultLanguage,
  writeDefaultLanguage,
} from '../../utils/dcsDrafts';

const summarizeResult = (data, questionId) => ({
  questionId: data?.questionId || questionId,
  accepted: !!data?.accepted,
  visiblePassed: data?.visiblePassed ?? 0,
  visibleTotal: data?.visibleTotal ?? 0,
  hiddenPassed: data?.hiddenPassed ?? 0,
  hiddenTotal: data?.hiddenTotal ?? 0,
});

const OPENERS = { '(': ')', '[': ']', '{': '}' };
const CLOSERS = { ')': '(', ']': '[', '}': '}' };
const QUOTES = { '"': '"', "'": "'", '`': '`' };
const INDENT = '  ';
const DEFAULT_LANGUAGE_KEY = 'javascript';

const leadingWord = (element) => {
  const value = String(element?.value || '');
  const position = element?.selectionStart ?? value.length;
  const before = value.slice(0, position);
  const match = before.match(/(?:^|[^A-Za-z0-9_])([A-Za-z_]\w*)$/);
  return match ? match[1] : '';
};

// Editor + run/submit/custom-input workflow shared by the Daily Coding Streak
// page and the fullscreen problem workspace.
const CodeWorkspace = ({
  contest,
  question,
  questions = [],
  answers = {},
  onAnswersChange,
  judgedResults = {},
  onJudgedChange,
  onNotice,
  onSubmitted,
}) => {
  const { user } = useAuth();
  const [language, setLanguage] = useState(
    () => {
      const stored = readDefaultLanguage();
      return stored && LANGUAGES[stored] ? stored : DEFAULT_LANGUAGE_KEY;
    }
  );
  const [runningCode, setRunningCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [codeResult, setCodeResult] = useState(null);
  const [customInput, setCustomInput] = useState('');
  const [customResult, setCustomResult] = useState(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [runningCustom, setRunningCustom] = useState(false);
  const [judgeSource, setJudgeSource] = useState('cloud');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [snippetsMenuOpen, setSnippetsMenuOpen] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [suggestionMatches, setSuggestionMatches] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);

  const questionId = question?.id;
  const editorRef = useRef(null);
  const langMenuRef = useRef(null);
  const snippetsMenuRef = useRef(null);
  const templateMenuRef = useRef(null);
  const pendingCursorRef = useRef(null);
  const snippetAppliedRef = useRef({});

  useEffect(() => {
    setCodeResult(null);
    setCustomResult(null);
    setShowCustomInput(false);
    setJudgeSource('cloud');
    setSuggestionMatches([]);
    setSuggestionIndex(-1);
    setLangMenuOpen(false);
    setSnippetsMenuOpen(false);
    setTemplateMenuOpen(false);
    const draft = readQuestionDraft(contest?.id, questionId);
    const stored = readDefaultLanguage();
    const next =
      (draft?.language && LANGUAGES[draft.language] && draft.language) ||
      (stored && LANGUAGES[stored] && stored) ||
      DEFAULT_LANGUAGE_KEY;
    setLanguage(next);
    const currentCode = String(answers?.[questionId] || '');
    if (
      currentCode &&
      isDefaultSnippet(currentCode) &&
      DEFAULT_SNIPPETS[next] &&
      DEFAULT_SNIPPETS[next] !== currentCode
    ) {
      onAnswersChange?.({ ...answers, [questionId]: DEFAULT_SNIPPETS[next] });
    }
  }, [questionId, contest?.id]);

  useEffect(() => {
    const anyOpen = langMenuOpen || snippetsMenuOpen || templateMenuOpen;
    if (!anyOpen) return undefined;
    const onDown = (event) => {
      const target = event.target;
      const inside =
        (langMenuRef.current && langMenuRef.current.contains(target)) ||
        (snippetsMenuRef.current && snippetsMenuRef.current.contains(target)) ||
        (templateMenuRef.current && templateMenuRef.current.contains(target));
      if (!inside) {
        setLangMenuOpen(false);
        setSnippetsMenuOpen(false);
        setTemplateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [langMenuOpen, snippetsMenuOpen, templateMenuOpen]);

  useEffect(() => {
    if (!questionId) return;
    const existing = String(answers?.[questionId] || '').trim();
    if (existing || snippetAppliedRef.current[questionId]) return;
    snippetAppliedRef.current[questionId] = true;
    const draft = readQuestionDraft(contest?.id, questionId);
    const stored = readDefaultLanguage();
    const target =
      (draft?.language && LANGUAGES[draft.language] && draft.language) ||
      (stored && LANGUAGES[stored] && stored) ||
      language;
    onAnswersChange?.({
      ...answers,
      [questionId]: DEFAULT_SNIPPETS[target] || DEFAULT_SNIPPETS[DEFAULT_LANGUAGE_KEY],
    });
  }, [questionId, answers?.[questionId]]);

  useEffect(() => {
    const position = pendingCursorRef.current;
    if (position === null || !editorRef.current) return;
    pendingCursorRef.current = null;
    editorRef.current.focus();
    editorRef.current.setSelectionRange(position, position);
  }, [answers?.[questionId]]);

  useEffect(() => {
    if (!contest?.id || !questionId) return undefined;
    const code = String(answers?.[questionId] || '');
    if (!code || isDefaultSnippet(code)) return undefined;
    const timer = setTimeout(() => {
      saveQuestionDraft(contest.id, { questionId, code, language });
    }, 300);
    return () => clearTimeout(timer);
  }, [contest?.id, questionId, answers?.[questionId], language]);

  const notify = (message) => onNotice?.(message);

  const sourceFor = () => String(answers?.[questionId] || '');

  const setSource = (value) => onAnswersChange?.({ ...answers, [questionId]: value });

  const restoreCursor = (position) => {
    pendingCursorRef.current = position;
  };

  const changeLanguage = (next) => {
    if (!LANGUAGES[next]) return;
    const current = String(answers?.[questionId] || '');
    const isDefault = !current.trim() || isDefaultSnippet(current);
    if (isDefault && DEFAULT_SNIPPETS[next]) {
      onAnswersChange?.({ ...answers, [questionId]: DEFAULT_SNIPPETS[next] });
    }
    setLanguage(next);
  };

  const computeMatches = (word = '') => {
    if (!word || word.length < 2) return [];
    const matches = snippetsFor(language).filter((snippet) =>
      snippet.alias.toLowerCase().startsWith(word.toLowerCase())
    );
    return matches.slice(0, 5);
  };

  const detectSuggestions = (element) => {
    const matches = computeMatches(leadingWord(element));
    setSuggestionMatches(matches);
    setSuggestionIndex(-1);
  };

  const applySnippet = (snippet, options = {}) => {
    const textarea = editorRef.current;
    if (!textarea || !snippet) return;
    const replaceAlias = options.replaceAlias !== false;
    const value = textarea.value;
    const caret = textarea.selectionStart ?? value.length;
    let wordStart = caret;
    if (replaceAlias) {
      while (wordStart > 0 && /[A-Za-z0-9_]/.test(value[wordStart - 1])) wordStart -= 1;
    }
    const firstLineLen =
      snippet.code.indexOf('\n') === -1 ? snippet.code.length : snippet.code.indexOf('\n');
    const nextValue = value.slice(0, wordStart) + snippet.code + value.slice(caret);
    setSource(nextValue);
    restoreCursor(wordStart + firstLineLen);
    setSuggestionMatches([]);
    setSuggestionIndex(-1);
    setSnippetsMenuOpen(false);
  };

  const loadDefaultCode = () => {
    const snippet = DEFAULT_SNIPPETS[language] || DEFAULT_SNIPPETS[DEFAULT_LANGUAGE_KEY];
    const current = String(answers?.[questionId] || '');
    if (current === snippet) {
      notify(`Default ${LANGUAGES[language]?.label || language} code is already loaded.`);
      return;
    }
    if (current.trim() && !isDefaultSnippet(current)) {
      if (!window.confirm('Replace your current code with the default starter code?')) return;
    }
    setSource(snippet);
    restoreCursor(snippet.length);
    notify(`Default ${LANGUAGES[language]?.label || language} code loaded.`);
  };

  const handleFormat = () => {
    const formatted = formatSource(language, sourceFor());
    if (formatted === sourceFor()) {
      notify('Your code is already formatted.');
      return;
    }
    setSource(formatted);
    restoreCursor(formatted.length);
    notify('Code formatted.');
  };

  const handleSaveTemplate = () => {
    const code = sourceFor().trim();
    if (!code) {
      notify('The editor is empty — save code first.');
      return;
    }
    writeUserTemplate(language, code);
    setTemplateMenuOpen(false);
    notify(`${LANGUAGES[language]?.label || language} template saved. Use it from the template menu.`);
  };

  const applySavedTemplate = (forAll = false) => {
    const template = readUserTemplate(language);
    if (!template) {
      notify(`No saved ${LANGUAGES[language]?.label || language} template yet. Save one first.`);
      return;
    }
    if (forAll) {
      const next = { ...answers };
      questions.forEach((goodQuestion) => {
        next[goodQuestion.id] = template;
      });
      onAnswersChange(next);
      notify(`Template applied to all ${questions.length} questions.`);
    } else {
      setSource(template);
      restoreCursor(0);
      notify('Your template is ready to edit.');
    }
    setTemplateMenuOpen(false);
  };

  const handleCodeKeyDown = (event) => {
    const textarea = editorRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;

    if (suggestionMatches.length) {
      const isNav = event.key === 'ArrowDown' || event.key === 'ArrowUp';
      const isPick = event.key === 'Enter' || event.key === 'Tab';
      const isDismiss = event.key === 'Escape';
      if (isNav || isPick || isDismiss) {
        event.preventDefault();
        if (isDismiss) {
          setSuggestionMatches([]);
          setSuggestionIndex(-1);
          return;
        }
        if (isNav) {
          const max = suggestionMatches.length - 1;
          const base = suggestionIndex >= 0 ? suggestionIndex : 0;
          setSuggestionIndex(event.key === 'ArrowDown' ? Math.min(max, base + 1) : Math.max(0, base - 1));
          return;
        }
        applySnippet(suggestionMatches[suggestionIndex >= 0 ? suggestionIndex : 0]);
        return;
      }
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      const nextValue = value.slice(0, selectionStart) + INDENT + value.slice(selectionEnd);
      setSource(nextValue);
      restoreCursor(selectionStart + INDENT.length);
      return;
    }

    if (event.key === 'Enter') {
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const beforeLine = value.slice(lineStart, selectionStart);
      const indentMatch = beforeLine.match(/^[ \t]*/);
      const currentIndent = indentMatch ? indentMatch[0] : '';
      const extraIndent = /[({]\s*$/.test(beforeLine) ? INDENT : '';
      event.preventDefault();
      const insertion = `\n${currentIndent}${extraIndent}`;
      const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
      setSource(nextValue);
      restoreCursor(selectionStart + insertion.length);
      return;
    }

    if (OPENERS[event.key] || QUOTES[event.key]) {
      event.preventDefault();
      const open = event.key;
      const close = OPENERS[event.key] || event.key;
      if (selectionEnd > selectionStart) {
        const nextValue =
          value.slice(0, selectionStart) +
          open +
          value.slice(selectionStart, selectionEnd) +
          close +
          value.slice(selectionEnd);
        setSource(nextValue);
        restoreCursor(selectionEnd + 2);
        return;
      }
      const nextValue = value.slice(0, selectionStart) + open + close + value.slice(selectionEnd);
      setSource(nextValue);
      restoreCursor(selectionStart + 1);
      return;
    }

    if (CLOSERS[event.key]) {
      if (value[selectionStart] === event.key && value[selectionStart - 1] === CLOSERS[event.key]) {
        event.preventDefault();
        restoreCursor(selectionStart + 1);
      }
      return;
    }

    if (event.key === 'Backspace') {
      const before = value[selectionStart - 1];
      const after = value[selectionStart];
      if (
        selectionStart === selectionEnd &&
        ((OPENERS[before] && OPENERS[before] === after) || (QUOTES[before] && before === after))
      ) {
        event.preventDefault();
        const nextValue = value.slice(0, selectionStart - 1) + value.slice(selectionStart + 1);
        setSource(nextValue);
        restoreCursor(selectionStart - 1);
      }
    }
  };

  const handleSubmit = async () => {
    if (!contest?.id || !question || submitting) return;
    const sourceCode = sourceFor().trim();
    if (!sourceCode) {
      notify('Write code for this question before submitting it.');
      return;
    }
    setSubmitting(true);
    notify('');
    try {
      const { result: data, source } = await runDcsJudge({
        mode: 'submit',
        contestId: contest.id,
        question,
        language,
        sourceCode,
      });
      setJudgeSource(source);

      const summary = summarizeResult(data, question.id);
      const merged = { ...judgedResults, [summary.questionId]: summary };
      onJudgedChange?.(merged);
      setCodeResult(data);

      const testResults = Object.values(merged);
      const passedCount = testResults.filter((result) => result.accepted).length;
      const submissionStatus =
        passedCount === questions.length && questions.length > 0 ? 'accepted' : 'partial';
      const cleanAnswers = Object.fromEntries(
        Object.entries(answers || {}).filter(([, code]) => !isDefaultSnippet(code))
      );
      const result = await submitDcsAttempt({
        userId: user.id,
        contestId: contest.id,
        questions,
        answers: cleanAnswers,
        language,
        testResults,
        passedQuestions: passedCount,
        submissionStatus,
      });
      clearQuestionDraft(contest.id, question.id);

      onSubmitted?.({ result, summary, submissionStatus, merged });
      notify(
        (summary.accepted
          ? `Accepted — all ${summary.visibleTotal + summary.hiddenTotal} tests passed. Today's streak is marked as practiced.`
          : `Not accepted: ${summary.visiblePassed}/${summary.visibleTotal} shown tests passed` +
            (data.hiddenSkipped
              ? ' — hidden tests were skipped because shown tests failed.'
              : ` and ${summary.hiddenPassed}/${summary.hiddenTotal} hidden tests passed.`)) +
          (source === 'backup' ? ' (Judged by the backup runner because the cloud judge was unavailable.)' : '')
      );
    } catch (err) {
      notify(err?.message || 'Could not submit your code.');
    } finally {
      setSubmitting(false);
    }
  };

  const runSelectedCode = async () => {
    if (!contest?.id || !question || runningCode) return;
    const sourceCode = sourceFor().trim();
    if (!sourceCode) {
      notify('Write code for this question before running it.');
      return;
    }
    setRunningCode(true);
    setCodeResult(null);
    notify('');
    try {
      const { result: data, source } = await runDcsJudge({
        mode: 'run',
        contestId: contest.id,
        question,
        language,
        sourceCode,
      });
      setJudgeSource(source);
      setCodeResult(data);
    } catch (error) {
      setCodeResult({ error: error?.message || 'Code execution failed.' });
    } finally {
      setRunningCode(false);
    }
  };

  const runCustomInput = async () => {
    if (!contest?.id || !question || runningCustom) return;
    const sourceCode = sourceFor().trim();
    if (!sourceCode) {
      notify('Write code for this question before running it.');
      return;
    }
    setRunningCustom(true);
    setCustomResult(null);
    notify('');
    try {
      const { result: data } = await runDcsJudge({
        mode: 'custom',
        contestId: contest.id,
        question,
        language,
        sourceCode,
        customInput,
      });
      setCustomResult(data);
    } catch (error) {
      setCustomResult({ stderr: error?.message || 'Code execution failed.' });
    } finally {
      setRunningCustom(false);
    }
  };

  if (!question) return null;

  const judged = judgedResults?.[question.id];
  const testCases = Array.isArray(question.test_cases) ? question.test_cases : [];
  const shownTests = testCases.filter((test) => !test?.hidden).length;
  const hiddenTests = Math.max(0, testCases.length - shownTests);
  const shownLabel = shownTests || 6;
  const hiddenLabel = hiddenTests || 35;

  const failingTests = (codeResult?.results || []).filter((test) => !test.hidden && !test.passed);
  const busy = runningCode || submitting || runningCustom;
  const currentDefault = readDefaultLanguage();
  const isCurrentDefault = currentDefault === language;
  const activeSuggestion = suggestionIndex >= 0 ? suggestionIndex : 0;
  const hasTemplate = !!readUserTemplate(language);

  const toggleDefault = () => {
    writeDefaultLanguage(isCurrentDefault ? null : language);
    setLangMenuOpen(false);
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      <div className="px-3 sm:px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <label
            htmlFor="dcs-code"
            className="text-sm font-bold text-slate-800 inline-flex items-center gap-1.5"
          >
            <Code2 size={15} className="text-slate-400" /> Code
          </label>

          <div className="relative" ref={langMenuRef}>
            <button
              type="button"
              onClick={() => setLangMenuOpen((value) => !value)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-gold-400 disabled:opacity-50"
            >
              <span className={`w-2 h-2 rounded-full ${LANGUAGES[language]?.dot || 'bg-slate-400'}`} />
              <span className="max-w-[8rem] truncate">{LANGUAGES[language]?.label || language}</span>
              {isCurrentDefault ? (
                <Star size={12} className="text-amber-500" fill="currentColor" />
              ) : null}
              {langMenuOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {langMenuOpen ? (
              <div className="absolute left-0 z-30 mt-1 w-52 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                {LANGUAGE_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      changeLanguage(key);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold transition ${
                      key === language
                        ? 'bg-gold-50 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${LANGUAGES[key]?.dot || 'bg-slate-400'}`} />
                    <span className="flex-1 truncate">{LANGUAGES[key]?.label || key}</span>
                    {currentDefault === key ? (
                      <Star size={11} className="text-amber-500 shrink-0" fill="currentColor" />
                    ) : null}
                  </button>
                ))}
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={toggleDefault}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  <Star
                    size={12}
                    className={isCurrentDefault ? 'text-amber-500' : 'text-slate-300'}
                    fill={isCurrentDefault ? 'currentColor' : 'none'}
                  />
                  {isCurrentDefault ? 'Clear default language' : 'Set as default language'}
                </button>
              </div>
            ) : null}
          </div>

          <div className="relative" ref={snippetsMenuRef}>
            <button
              type="button"
              onClick={() => setSnippetsMenuOpen((value) => !value)}
              className="inline-flex items-center gap-1.5 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              title="Insert code snippets (for, while, if, …)"
            >
              <Braces size={13} />
              <span className="hidden lg:inline">Snippets</span>
            </button>
            {snippetsMenuOpen ? (
              <div className="absolute left-0 z-30 mt-1 w-64 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {LANGUAGES[language]?.label || language} snippets
                </p>
                {snippetsFor(language).map((snippet) => (
                  <button
                    key={`${snippet.alias}-${snippet.code}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applySnippet(snippet, { replaceAlias: false });
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <span className="font-mono font-bold text-blue-600">{snippet.alias}</span>
                    <span className="truncate text-slate-400">{snippet.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleFormat}
            className="inline-flex items-center gap-1.5 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            title="Format / re-indent the code"
          >
            <Wand2 size={13} />
            <span className="hidden lg:inline">Format</span>
          </button>

          <button
            type="button"
            onClick={loadDefaultCode}
            disabled={busy}
            className="inline-flex items-center gap-1.5 border border-blue-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
            title={`Insert the default ${LANGUAGES[language]?.label || language} starter code`}
          >
            <FileCode2 size={13} />
            <span className="hidden sm:inline">Default Code</span>
          </button>

          <div className="relative" ref={templateMenuRef}>
            <button
              type="button"
              onClick={() => setTemplateMenuOpen((value) => !value)}
              className="inline-flex items-center gap-1.5 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              title="Save your own template or reuse it"
            >
              <Save size={13} />
              <span className="hidden lg:inline">Template</span>
              {hasTemplate ? (
                <Star size={11} className="text-amber-500" fill="currentColor" />
              ) : null}
            </button>
            {templateMenuOpen ? (
              <div className="absolute left-0 z-30 mt-1 w-72 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Save size={13} className="text-slate-400" /> Save current code as{" "}
                  {LANGUAGES[language]?.label || language} template
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => applySavedTemplate(false)}
                  disabled={!hasTemplate}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Code2 size={13} className="text-slate-400" /> Use template for this question
                </button>
                <button
                  type="button"
                  onClick={() => applySavedTemplate(true)}
                  disabled={!hasTemplate}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Terminal size={13} className="text-slate-400" /> Use template for all {questions.length} questions
                </button>
                {!hasTemplate ? (
                  <p className="px-3 py-1 text-[11px] text-slate-400">
                    Nothing saved yet — write code and press &quot;Save current code as template&quot;.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {judgeSource === 'backup' ? (
            <span
              className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded bg-amber-100 text-amber-700 border border-amber-200"
              title="The cloud judge was unavailable, so tests ran on the backup runner."
            >
              Backup judge
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runSelectedCode}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 px-3.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
          >
            {runningCode ? <Loader2 size={13} className="animate-spin" /> : <PlayCircle size={13} />}
            {runningCode ? 'Running…' : 'Run'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {submitting ? 'Judging…' : 'Submit'}
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <div className="relative">
          <textarea
            ref={editorRef}
            id="dcs-code"
            value={sourceFor()}
            onChange={(e) => {
              setSource(e.target.value);
              detectSuggestions(e.target);
            }}
            onClick={(e) => detectSuggestions(e.target)}
            onKeyDown={handleCodeKeyDown}
            placeholder={'// Write your solution here\n// Input is read from stdin, print the answer to stdout.'}
            rows={16}
            spellCheck="false"
            disabled={busy}
            className="w-full border border-slate-800 rounded-lg px-3 py-3 font-mono text-[13px] leading-6 bg-slate-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-400 resize-y disabled:opacity-70"
          />
          {suggestionMatches.length ? (
            <div className="absolute left-2 right-2 top-2 z-20 rounded-lg border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
              {suggestionMatches.map((snippet, index) => (
                <button
                  key={`${snippet.alias}-${snippet.code}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applySnippet(snippet);
                  }}
                  onMouseEnter={() => setSuggestionIndex(index)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs border-b border-slate-800 last:border-0 ${
                    index === activeSuggestion
                      ? 'bg-blue-600/20 text-white'
                      : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-mono font-bold text-blue-400">{snippet.alias}</span>
                  <span className="flex-1 truncate text-slate-400">{snippet.label}</span>
                  <kbd className="text-[10px] text-slate-500">Tab</kbd>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {judged ? (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full border ${
                judged.accepted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {judged.accepted ? <CheckCircle2 size={13} /> : <Flag size={13} />}
              {judged.accepted
                ? 'Accepted'
                : `${judged.visiblePassed ?? 0}/${(judged.visibleTotal ?? 0) + (judged.hiddenTotal ?? 0)} tests`}
            </span>
          ) : null}
          {judged && !judged.accepted && judged.hiddenTotal ? (
            <span className="text-[11px] font-semibold text-slate-400">
              hidden: {judged.hiddenPassed}/{judged.hiddenTotal}
            </span>
          ) : null}
        </div>

        {codeResult ? (
          <div className="mt-3 rounded-lg border overflow-hidden">
            <div
              className={`px-3 py-2 text-xs font-bold flex items-center justify-between gap-2 ${
                codeResult.error || !codeResult.accepted
                  ? 'bg-rose-50 text-rose-700 border-b border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-b border-emerald-200'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {codeResult.error || !codeResult.accepted ? <Flag size={13} /> : <CheckCircle2 size={13} />}
                {codeResult.error
                  ? 'Failed to run'
                  : codeResult.accepted
                  ? 'Accepted'
                  : 'Wrong Answer'}
              </span>
              {codeResult.results ? (
                <span className="font-semibold opacity-80">
                  {codeResult.visiblePassed}/{codeResult.visibleTotal} shown
                  {codeResult.hiddenTotal ? ` · ${codeResult.hiddenPassed}/${codeResult.hiddenTotal} hidden` : ''}
                </span>
              ) : null}
            </div>

            <div className="p-3 font-mono text-xs bg-slate-950 text-slate-100 whitespace-pre-wrap">
              {codeResult.error ? (
                <p className="text-rose-300">{codeResult.error}</p>
              ) : (
                <>
                  {codeResult.hiddenSkipped ? (
                    <p className="text-amber-300 mb-2">
                      Hidden tests were skipped because a shown test failed.
                    </p>
                  ) : null}
                  {failingTests.length ? (
                    failingTests.map((test) => (
                      <div key={test.index} className="mb-3 last:mb-0">
                        <p className="text-rose-300 font-sans font-bold">
                          Shown test {test.index + 1}: {test.status}
                        </p>
                        <p className="text-slate-400">Input: {JSON.stringify(test.input)}</p>
                        <p className="text-slate-400">Expected: {JSON.stringify(test.expectedOutput)}</p>
                        <p className="text-slate-400">Actual: {JSON.stringify(test.actualOutput)}</p>
                        {test.error ? <p className="text-rose-300">{test.error}</p> : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-300">
                      {codeResult.accepted
                        ? 'All executed test cases passed.'
                        : 'No shown test failed — check the hidden tests above.'}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        ) : null}

        {isCurrentDefault ? (
          <p className="text-[11px] text-slate-400 mt-2 inline-flex items-center gap-1">
            <Star size={11} className="text-amber-500" fill="currentColor" />
            {LANGUAGES[language]?.label} is your default — new problems will open in it.
          </p>
        ) : null}

        <div className="mt-4 border border-slate-200 rounded-lg bg-slate-50 p-3">
          <button
            type="button"
            onClick={() => setShowCustomInput((value) => !value)}
            className="w-full flex items-center justify-between gap-2 text-xs font-bold uppercase text-slate-500"
          >
            <span className="inline-flex items-center gap-1.5"><Terminal size={13} /> Custom Input</span>
            {showCustomInput ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showCustomInput ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                rows={3}
                placeholder="Type the input your program should read, then run it."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
              <button
                type="button"
                onClick={runCustomInput}
                disabled={runningCustom}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {runningCustom ? <Loader2 size={13} className="animate-spin" /> : <PlayCircle size={13} />}
                Run Custom Input
              </button>
              {customResult ? (
                <div className="rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100 whitespace-pre-wrap">
                  <p className="mb-1 font-sans font-bold text-slate-400 uppercase">Output</p>
                  {customResult.stderr ? (
                    <p className="text-rose-300">{customResult.stderr}</p>
                  ) : (
                    <p className="text-slate-100">{customResult.stdout || '(no output)'}</p>
                  )}
                  {customResult.status ? (
                    <p className="mt-1 text-slate-400">{customResult.status}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Run checks the {shownLabel} shown tests. Submit runs all {shownLabel + hiddenLabel} tests, saves your code and marks today as practiced. Your work is autosaved on this device. Type a keyword (for, while, if…) and press Tab to insert a snippet.
        </p>
      </div>
    </div>
  );
};

export default CodeWorkspace;