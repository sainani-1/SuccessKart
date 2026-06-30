import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Zap, ChevronDown, ChevronUp, Play, CheckCircle, XCircle, RotateCcw, Maximize2, Minimize2, Lightbulb, MessageSquare, Send, AlertTriangle, Clock, Copy, Check } from 'lucide-react';
import MonacoCdnEditor from '../MonacoCdnEditor';
import { runCode } from '../../logicBuilding/codeRunner';
import { getDifficultyBadgeColor, TEMPLATES, LANGUAGES } from '../../data/skillUpUtils';

const ProblemDetail = ({ problem, onBack, onSubmit, userProgress = {}, userId }) => {
  const isSolved = (userProgress?.solvedIds || []).includes(problem.id);
  const savedLang = typeof window !== 'undefined' ? localStorage.getItem('skillup_last_language') || 'python' : 'python';
  const [language, setLanguage] = useState(savedLang);
  const [code, setCode] = useState(TEMPLATES[savedLang] || TEMPLATES.python);
  const [activeTab, setActiveTab] = useState('description');
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedExamples, setExpandedExamples] = useState(new Set());
  const [hintsOpen, setHintsOpen] = useState(false);
  const [usedHints, setUsedHints] = useState(new Set());
  const [hintRevealed, setHintRevealed] = useState(new Set());
  const [discussion, setDiscussion] = useState([]);
  const [discussionInput, setDiscussionInput] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [pasteWarning, setPasteWarning] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [startTime] = useState(Date.now());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const editorContainerRef = useRef(null);
  const contentRef = useRef(null);
  const completionVisible = isSolved || results?.accepted;

  // Time tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Tab switch detection
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitchCount((c) => {
          const next = c + 1;
          if (next >= 3) setShowTabWarning(true);
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Paste detection
  const handlePaste = useCallback(() => {
    setPasteWarning(true);
    setTimeout(() => setPasteWarning(false), 3000);
  }, []);

  // Language switch
  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    localStorage.setItem('skillup_last_language', lang);
    if (!code || code === TEMPLATES[language]) {
      setCode(TEMPLATES[lang] || '');
    }
  };

  // Reset code
  const handleReset = () => {
    setCode(TEMPLATES[language] || '');
    setResults(null);
  };

  // Run Code
  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setResults(null);
    try {
      const exampleTests = (problem.examples || []).map((ex, i) => ({
        input: ex.input,
        output: ex.output,
        hidden: false,
        label: `Example ${i + 1}`,
      }));
      const res = await runCode(language, code, exampleTests);
      const allPassed = res.every((r) => r.status === 'Accepted');
      setResults({ type: 'run', tests: res, accepted: allPassed });
    } catch (err) {
      setResults({ type: 'run', tests: [{ status: 'Error', error: err.message }] });
    }
    setRunning(false);
    setActiveTab('output');
  };

  // Submit Code
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setResults(null);
    try {
      const allTests = (problem.testCases || []).map((tc, i) => ({
        input: tc.input,
        output: tc.output,
        hidden: tc.hidden,
        label: tc.hidden ? `Hidden Test ${i + 1}` : `Test ${i + 1}`,
      }));
      const res = await runCode(language, code, allTests);
      const allPassed = res.every((r) => r.status === 'Accepted');
      const resultData = { type: 'submit', tests: res, accepted: allPassed };
      setResults(resultData);
      onSubmit?.({
        problemId: problem.id,
        passed: allPassed,
        results: res,
        language,
        timeSpent: Math.floor((Date.now() - startTime) / 1000),
        hintsUsed: usedHints.size,
        tabSwitches: tabSwitchCount,
      });
    } catch (err) {
      setResults({ type: 'submit', tests: [{ status: 'Error', error: err.message }], accepted: false });
    }
    setSubmitting(false);
    setActiveTab('output');
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!fullscreen) {
      editorContainerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setFullscreen(!fullscreen);
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const diffColor = getDifficultyBadgeColor(problem.difficulty);

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{problem.id}. {problem.title}</h2>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${diffColor}`}>
                {problem.difficulty}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap size={10} />
                {problem.xpReward} XP
              </span>
              {completionVisible && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  <CheckCircle size={12} />
                  Completed
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {(problem.tags || []).map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/50">
                  {tag}
                </span>
              ))}
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock size={12} />
                {formatTime(timeElapsed)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-slate-400 hover:text-white transition-colors"
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      <div className={`grid gap-4 ${fullscreen ? '' : 'lg:grid-cols-2'}`}>
        {/* Left Panel: Description */}
        <div className="space-y-4" ref={contentRef}>
          {/* Tab Navigation */}
          <div className="flex gap-1 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-1 overflow-x-auto">
            {['description', 'examples', 'hints', 'discussion'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {tab === 'hints' && <Lightbulb size={14} className="inline mr-1" />}
                {tab === 'discussion' && <MessageSquare size={14} className="inline mr-1" />}
                {tab}
              </button>
            ))}
          </div>

          {/* Description */}
          {activeTab === 'description' && (
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Problem Description</h3>
                <p className="text-slate-300 leading-relaxed text-sm">{problem.description}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Constraints</h3>
                <p className="text-slate-300 text-sm">{problem.constraints}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Input Format</h3>
                <div className="bg-slate-800/60 rounded-xl p-3">
                  <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">{problem.inputFormat}</pre>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Output Format</h3>
                <div className="bg-slate-800/60 rounded-xl p-3">
                  <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">{problem.outputFormat}</pre>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/40 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Time Complexity</p>
                  <p className="text-sm text-slate-300 font-mono">{problem.timeComplexity || 'N/A'}</p>
                </div>
                <div className="bg-slate-800/40 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Space Complexity</p>
                  <p className="text-sm text-slate-300 font-mono">{problem.spaceComplexity || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Examples */}
          {activeTab === 'examples' && (
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Examples</h3>
              {(problem.examples || []).map((ex, i) => {
                const isOpen = expandedExamples.has(i);
                return (
                  <div key={i} className="border border-slate-700/50 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedExamples((prev) => {
                        const next = new Set(prev);
                        next.has(i) ? next.delete(i) : next.add(i);
                        return next;
                      })}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
                    >
                      <span className="text-sm font-medium text-slate-300">Example {i + 1}</span>
                      {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </button>
                    {isOpen && (
                      <div className="p-4 space-y-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Input</p>
                          <pre className="bg-slate-800/80 rounded-lg p-3 text-sm text-slate-200 font-mono">{ex.input}</pre>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Output</p>
                          <pre className="bg-slate-800/80 rounded-lg p-3 text-sm text-emerald-400 font-mono">{ex.output}</pre>
                        </div>
                        {ex.explanation && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Explanation</p>
                            <p className="text-sm text-slate-400">{ex.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Hints */}
          {activeTab === 'hints' && (
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Hints</h3>
                <span className="text-xs text-slate-500">{hintRevealed.size}/{problem.hints?.length || 0} revealed</span>
              </div>
              {(problem.hints || []).length === 0 ? (
                <p className="text-sm text-slate-500">No hints available for this problem.</p>
              ) : (
                (problem.hints || []).map((hint, i) => (
                  <div key={i} className="border border-slate-700/50 rounded-xl overflow-hidden">
                    <button
                      onClick={() => {
                        if (!hintRevealed.has(i)) {
                          setHintRevealed((prev) => new Set(prev).add(i));
                          setUsedHints((prev) => new Set(prev).add(i));
                        }
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
                    >
                      <span className="text-sm font-medium text-slate-300">Hint {i + 1}</span>
                      {hintRevealed.has(i) ? (
                        <ChevronUp size={16} className="text-slate-400" />
                      ) : (
                        <Lightbulb size={16} className="text-slate-500" />
                      )}
                    </button>
                    {hintRevealed.has(i) && (
                      <div className="p-4">
                        <p className="text-sm text-slate-400">{hint}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Discussion */}
          {activeTab === 'discussion' && (
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Discussion</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {discussion.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-6">No discussion yet. Start the conversation!</p>
                )}
                {discussion.map((msg, i) => (
                  <div key={i} className="bg-slate-800/40 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-1">User #{msg.userId || 'Anonymous'}</p>
                    <p className="text-sm text-slate-300">{msg.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discussionInput}
                  onChange={(e) => setDiscussionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && discussionInput.trim()) {
                      setDiscussion((prev) => [...prev, { text: discussionInput.trim(), userId, timestamp: Date.now() }]);
                      setDiscussionInput('');
                    }
                  }}
                  placeholder="Share your thoughts..."
                  className="flex-1 px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <button
                  onClick={() => {
                    if (discussionInput.trim()) {
                      setDiscussion((prev) => [...prev, { text: discussionInput.trim(), userId, timestamp: Date.now() }]);
                      setDiscussionInput('');
                    }
                  }}
                  className="p-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Code Editor (fullscreen target) */}
        <div ref={editorContainerRef} className="skillup-editor-panel space-y-4">
          {/* Language + Actions */}
          <div className="flex items-center justify-between gap-2 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-2">
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-3 py-1.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <button
                onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRun}
                disabled={running}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
              >
                {running ? <Clock size={14} className="animate-spin" /> : <Play size={14} />}
                Run
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
              >
                {submitting ? <Clock size={14} className="animate-spin" /> : <Zap size={14} />}
                Submit
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="relative" onPaste={handlePaste}>
            <div className="rounded-2xl overflow-hidden border border-slate-700/50">
              <MonacoCdnEditor
                value={code}
                language={language}
                onChange={(val) => setCode(val)}
                height={fullscreen ? 'calc(100vh - 420px)' : '480px'}
              />
            </div>
            {pasteWarning && (
              <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-xl text-xs text-red-400 animate-pulse">
                <AlertTriangle size={12} />
                Pasting code is discouraged. Type it out to learn better!
              </div>
            )}
            {showTabWarning && (
              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-xs text-amber-400">
                <AlertTriangle size={12} />
                Tab switches detected: {tabSwitchCount}
              </div>
            )}
          </div>

          {/* Output Panel */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-400">
                {results ? (results.type === 'submit' ? 'Submission Results' : 'Run Results') : 'Output'}
              </h3>
              {results && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  results.accepted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {results.accepted ? 'Accepted' : 'Wrong Answer'}
                </span>
              )}
              {fullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs text-slate-400 hover:text-white transition-colors ml-2"
                >
                  <Minimize2 size={12} />
                  Exit Fullscreen
                </button>
              )}
            </div>
            <div className="p-4 max-h-48 overflow-y-auto space-y-2">
              {!results && (
                <p className="text-sm text-slate-500 text-center py-6">
                  Run or submit your code to see results here.
                </p>
              )}
              {results?.tests?.map((test, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-xl text-sm ${
                    test.status === 'Accepted' ? 'bg-emerald-500/5 border border-emerald-500/20' :
                    test.status === 'Error' ? 'bg-red-500/5 border border-red-500/20' :
                    'bg-red-500/5 border border-red-500/20'
                  }`}
                >
                  <div className="mt-0.5">
                    {test.status === 'Accepted' ? (
                      <CheckCircle size={16} className="text-emerald-400" />
                    ) : (
                      <XCircle size={16} className="text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        test.status === 'Accepted' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {test.label || `Test ${i + 1}`}
                        {test.hidden && !results?.accepted ? ' (Hidden)' : ''}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        test.status === 'Accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                        test.status === 'Error' ? 'bg-red-500/20 text-red-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {test.status === 'Accepted' ? 'Passed' : test.status === 'Error' ? 'Error' : 'Failed'}
                      </span>
                    </div>
                    {test.status !== 'Accepted' && test.actualOutput !== undefined && (
                      <div className="mt-1 space-y-0.5 text-xs">
                        <p className="text-slate-400">Expected: <span className="text-emerald-400 font-mono">{test.expectedOutput}</span></p>
                        <p className="text-slate-400">Actual: <span className="text-red-400 font-mono">{test.actualOutput}</span></p>
                      </div>
                    )}
                    {test.error && (
                      <p className="mt-1 text-xs text-red-400 font-mono">{test.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemDetail;
