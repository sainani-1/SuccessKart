import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, Flag, Copy, Eye, MousePointer } from 'lucide-react';

const STORAGE_KEY = 'kyl_quiz_state';

const getTimerDuration = (level) => {
  switch (level) {
    case 'basic': return 30 * 60;
    case 'beginner': return 25 * 60;
    case 'advanced': return 30 * 60;
    default: return 30 * 60;
  }
};

const QuizEngine = ({ questions: rawQuestions, language, level, onComplete }) => {
  const [questions] = useState(() => {
    const shuffled = [...rawQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 25);
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.language === language && parsed.level === level) {
          return parsed.answers || Array(25).fill(null);
        }
      }
    } catch {}
    return Array(25).fill(null);
  });

  const [selectedOption, setSelectedOption] = useState(null);
  const [timeSpent, setTimeSpent] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.timeSpent || Array(25).fill(0);
      }
    } catch {}
    return Array(25).fill(0);
  });

  const [markedForReview, setMarkedForReview] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.markedForReview || Array(25).fill(false);
      }
    } catch {}
    return Array(25).fill(false);
  });

  const [tabSwitches, setTabSwitches] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.tabSwitches || 0;
      }
    } catch {}
    return 0;
  });

  const [copyPasteAttempts, setCopyPasteAttempts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.copyPasteAttempts || 0;
      }
    } catch {}
    return 0;
  });

  const [timer, setTimer] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.language === language && parsed.level === level && parsed.timer != null) {
          return parsed.timer;
        }
      }
    } catch {}
    return getTimerDuration(level);
  });

  const [isFinished, setIsFinished] = useState(false);
  const [warning, setWarning] = useState(null);
  const [questionTimer, setQuestionTimer] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const questionTimerRef = useRef(null);
  const timerRef = useRef(null);
  const perQuestionTimerRef = useRef(null);
  const currentIndexRef = useRef(currentIndex);
  const answersRef = useRef(answers);
  const timeSpentRef = useRef(timeSpent);
  const markedForReviewRef = useRef(markedForReview);
  const tabSwitchesRef = useRef(tabSwitches);
  const copyPasteAttemptsRef = useRef(copyPasteAttempts);
  const timerRefVal = useRef(timer);
  const isFinishedRef = useRef(isFinished);
  const questionStartRef = useRef(Date.now());

  currentIndexRef.current = currentIndex;
  answersRef.current = answers;
  timeSpentRef.current = timeSpent;
  markedForReviewRef.current = markedForReview;
  tabSwitchesRef.current = tabSwitches;
  copyPasteAttemptsRef.current = copyPasteAttempts;
  timerRefVal.current = timer;
  isFinishedRef.current = isFinished;

  const persistState = useCallback(() => {
    const state = {
      language,
      level,
      answers: answersRef.current,
      timeSpent: timeSpentRef.current,
      markedForReview: markedForReviewRef.current,
      tabSwitches: tabSwitchesRef.current,
      copyPasteAttempts: copyPasteAttemptsRef.current,
      timer: timerRefVal.current,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [language, level]);

  const finishQuiz = useCallback(() => {
    if (isFinishedRef.current) return;
    setIsFinished(true);
    isFinishedRef.current = true;

    const currentAnswers = answersRef.current;
    const currentTimeSpent = timeSpentRef.current;

    const resultAnswers = questions.map((q, i) => ({
      questionId: q.id,
      selectedOption: currentAnswers[i],
      correct: currentAnswers[i] === q.correct,
      timeSpent: currentTimeSpent[i],
      markedForReview: markedForReviewRef.current[i],
    }));

    const correctCount = resultAnswers.filter((a) => a.correct).length;
    const totalTime = currentTimeSpent.reduce((sum, t) => sum + t, 0);

    const topicMap = {};
    questions.forEach((q, i) => {
      if (!topicMap[q.topic]) topicMap[q.topic] = { correct: 0, total: 0 };
      topicMap[q.topic].total += 1;
      if (currentAnswers[i] === q.correct) topicMap[q.topic].correct += 1;
    });

    const strengths = Object.entries(topicMap)
      .filter(([, v]) => v.total > 0 && (v.correct / v.total) >= 0.7)
      .map(([k]) => k);

    const weaknesses = Object.entries(topicMap)
      .filter(([, v]) => v.total > 0 && (v.correct / v.total) < 0.4)
      .map(([k]) => k);

    onComplete({
      language,
      level,
      answers: resultAnswers,
      score: correctCount,
      total: 25,
      percentage: Math.round((correctCount / 25) * 100),
      tabSwitches: tabSwitchesRef.current,
      copyPasteAttempts: copyPasteAttemptsRef.current,
      timeTaken: totalTime,
      strengths,
      weaknesses,
      topicBreakdown: topicMap,
    });

    localStorage.removeItem(STORAGE_KEY);
  }, [questions, language, level, onComplete]);

  useEffect(() => {
    const totalDuration = getTimerDuration(level);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        const next = prev - 1;
        timerRefVal.current = next;
        if (next <= 0) {
          clearInterval(timerRef.current);
          finishQuiz();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [level, finishQuiz]);

  useEffect(() => {
    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      if (perQuestionTimerRef.current) clearInterval(perQuestionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    questionStartRef.current = Date.now();
    setQuestionTimer(0);
    setSelectedOption(answers[currentIndex]);

    if (perQuestionTimerRef.current) clearInterval(perQuestionTimerRef.current);
    perQuestionTimerRef.current = setInterval(() => {
      setQuestionTimer((prev) => prev + 1);
    }, 1000);

    return () => {
      if (perQuestionTimerRef.current) clearInterval(perQuestionTimerRef.current);
    };
  }, [currentIndex, answers]);

  useEffect(() => {
    if (questionTimer > 90) {
      setWarning('You have spent over 90 seconds on this question. Consider moving on.');
    }
  }, [questionTimer]);

  useEffect(() => {
    persistState();
  }, [answers, timeSpent, markedForReview, tabSwitches, copyPasteAttempts, timer, persistState]);

  useEffect(() => {
    const handleCopy = (e) => {
      e.preventDefault();
      setCopyPasteAttempts((prev) => {
        const next = prev + 1;
        copyPasteAttemptsRef.current = next;
        setWarning('Copy-paste is disabled during the quiz. This attempt has been logged.');
        return next;
      });
    };

    const handlePaste = (e) => {
      e.preventDefault();
      setCopyPasteAttempts((prev) => {
        const next = prev + 1;
        copyPasteAttemptsRef.current = next;
        setWarning('Copy-paste is disabled during the quiz. This attempt has been logged.');
        return next;
      });
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => {
          const next = prev + 1;
          tabSwitchesRef.current = next;
          if (next >= 3) {
            setWarning(`Warning: Tab switch detected (${next} times). Further switches may be flagged.`);
          } else {
            setWarning(`Tab switch detected (${next}/3). Multiple switches may invalidate your quiz.`);
          }
          return next;
        });
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (transitioning) return;

      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < questions[currentIndex]?.options?.length) {
          setSelectedOption(idx);
          setShowConfirm(true);
        }
      }

      if (e.key === 'Enter' && selectedOption !== null && showConfirm) {
        confirmAnswer();
      }

      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        navigateQuestion(currentIndex - 1);
      }

      if (e.key === 'ArrowRight' && currentIndex < 24) {
        navigateQuestion(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, selectedOption, showConfirm, transitioning]);

  const confirmAnswer = useCallback(() => {
    if (selectedOption === null) return;

    const now = Date.now();
    const elapsed = Math.floor((now - questionStartRef.current) / 1000);

    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndexRef.current] = selectedOption;
      answersRef.current = next;
      return next;
    });

    setTimeSpent((prev) => {
      const next = [...prev];
      next[currentIndexRef.current] = (next[currentIndexRef.current] || 0) + elapsed;
      timeSpentRef.current = next;
      return next;
    });

    setShowConfirm(false);

    if (currentIndexRef.current < 24) {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setTransitioning(false);
      }, 300);
    }
  }, [selectedOption]);

  const navigateQuestion = (idx) => {
    if (transitioning) return;
    setWarning(null);
    setShowConfirm(false);
    setTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(idx);
      setTransitioning(false);
    }, 200);
  };

  const toggleMarkForReview = () => {
    setMarkedForReview((prev) => {
      const next = [...prev];
      next[currentIndexRef.current] = !next[currentIndexRef.current];
      markedForReviewRef.current = next;
      return next;
    });
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timer <= 60) return 'text-red-400';
    if (timer <= 300) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const totalAnswered = answers.filter((a) => a !== null).length;
  const isAllAnswered = totalAnswered === 25;

  if (isFinished) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
              <Clock size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 capitalize">{language} - {level}</h2>
              <p className="text-xs text-slate-500">Know Your Level Quiz</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800/50 ${getTimerColor()}`}>
            <Clock size={18} />
            <span className="text-xl font-mono font-bold">{formatTime(timer)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800/50 rounded-3xl p-6 md:p-8 shadow-2xl">
              {warning && (
                <div className="flex items-start gap-3 p-4 mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <p>{warning}</p>
                  <button onClick={() => setWarning(null)} className="ml-auto text-amber-400/60 hover:text-amber-300">✕</button>
                </div>
              )}

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/20 text-amber-300 text-sm font-semibold">
                    Question {currentIndex + 1} of 25
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                    {currentQuestion.topic}
                  </span>
                  {markedForReview[currentIndex] && (
                    <span className="px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-medium flex items-center gap-1">
                      <Flag size={12} /> Marked for Review
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {formatTime(questionTimer)}
                </div>
              </div>

              <p className="text-xl md:text-2xl font-medium text-slate-100 leading-relaxed mb-8">
                {currentQuestion.question}
              </p>

              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => { setSelectedOption(idx); setShowConfirm(true); }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                          : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          isSelected
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-700/60 text-slate-400'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className={`text-base ${isSelected ? 'text-emerald-100' : 'text-slate-300'}`}>
                          {option}
                        </span>
                        {isSelected && (
                          <span className="ml-auto text-emerald-400">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800/50">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleMarkForReview}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm ${
                      markedForReview[currentIndex]
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <Flag size={16} />
                    {markedForReview[currentIndex] ? 'Unmark Review' : 'Mark for Review'}
                  </button>
                  {showConfirm && selectedOption !== null && answers[currentIndex] === null && (
                    <button
                      onClick={confirmAnswer}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all"
                    >
                      Confirm & Next
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800/50 rounded-3xl p-5 shadow-2xl">
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 text-sm text-slate-400 mb-1">
                  <Copy size={14} />
                  <span>Progress</span>
                </div>
                <div className="text-2xl font-bold text-slate-100">{totalAnswered}/25</div>
                <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${(totalAnswered / 25) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                <div className="text-xs text-slate-500 font-medium mb-2">Question Navigator</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: 25 }, (_, i) => {
                    const answered = answers[i] !== null;
                    const marked = markedForReview[i];
                    const isCurrent = i === currentIndex;
                    let dotClass = 'bg-slate-800 border-slate-700';
                    if (answered && marked) dotClass = 'bg-sky-500/30 border-sky-400/50';
                    else if (answered) dotClass = 'bg-emerald-500/30 border-emerald-400/50';
                    else if (marked) dotClass = 'bg-sky-500/20 border-sky-500/30';
                    if (isCurrent) dotClass += ' ring-2 ring-amber-400/50';

                    return (
                      <button
                        key={i}
                        onClick={() => navigateQuestion(i)}
                        className={`w-full aspect-square rounded-lg border text-xs font-medium transition-all ${dotClass} ${
                          isCurrent ? 'scale-110' : ''
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-500 border-t border-slate-800/50 pt-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-400/50" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-sky-500/30 border border-sky-400/50" />
                  <span>Marked for Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700" />
                  <span>Unanswered</span>
                </div>
              </div>

              <div className="border-t border-slate-800/50 pt-4 mt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Copy attempts:</span>
                  <span className="text-slate-300 font-medium">{copyPasteAttempts}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Tab switches:</span>
                  <span className="text-slate-300 font-medium">{tabSwitches}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => navigateQuestion(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-300 hover:bg-slate-800/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <button
                  onClick={() => navigateQuestion(Math.min(24, currentIndex + 1))}
                  disabled={currentIndex === 24}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-slate-800/40 border border-slate-700/50 text-sm text-slate-300 hover:bg-slate-800/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {isAllAnswered && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={finishQuiz}
              className="px-10 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold text-lg shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] transition-all"
            >
              Submit Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizEngine;
