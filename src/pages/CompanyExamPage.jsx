import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Clock, FileText, CheckCircle, XCircle, ArrowLeft, Trophy, ChevronRight, Lock, Award, BarChart3, Zap } from 'lucide-react';
import { COMPANIES, COMPANY_QUESTIONS } from '../data/companyExamQuestions';
import { setExamMode } from '../data/examMode';

const SECTION_COLORS = {
  Aptitude: 'from-blue-500 to-indigo-500',
  Verbal: 'from-emerald-500 to-teal-500',
  Reasoning: 'from-amber-500 to-orange-500',
  Coding: 'from-purple-500 to-pink-500',
};

const SECTION_ICONS = {
  Aptitude: '🔢',
  Verbal: '📝',
  Reasoning: '🧠',
  Coding: '💻',
};

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CompanyExamPage = () => {
  const { profile, isPremiumPlus } = useAuth();
  const navigate = useNavigate();
  const isPp = isPremiumPlus(profile);

  const [view, setView] = useState('list'); // list | exam | result
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [examResults, setExamResults] = useState(null);
  const [filteredSection, setFilteredSection] = useState('All');
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setExamMode(false);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  const getSectionQuestions = useCallback(() => {
    if (!selectedCompany) return [];
    const questions = COMPANY_QUESTIONS[selectedCompany.id] || [];
    if (filteredSection === 'All') return questions;
    return questions.filter(q => q.section === filteredSection);
  }, [selectedCompany, filteredSection]);

  const startExam = (company) => {
    setSelectedCompany(company);
    const questions = COMPANY_QUESTIONS[company.id] || [];
    const sections = [...new Set(questions.map(q => q.section))];
    setCurrentSection(0);
    setCurrentQuestion(0);
    setAnswers({});
    setFilteredSection('All');
    setTimeLeft(company.duration * 60);
    setShowExplanation(false);
    setExamResults(null);
    setView('exam');
    setExamMode(true);
    try { document.documentElement.requestFullscreen?.(); } catch {}

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const submitExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setExamMode(false);
    try { document.exitFullscreen?.().catch(() => {}); } catch {}
    const questions = COMPANY_QUESTIONS[selectedCompany.id] || [];
    let correct = 0;
    let total = questions.length;
    const sectionResults = {};

    questions.forEach(q => {
      if (!sectionResults[q.section]) sectionResults[q.section] = { total: 0, correct: 0 };
      sectionResults[q.section].total++;
      if (answers[q.id] === q.correct) {
        correct++;
        sectionResults[q.section].correct++;
      }
    });

    const percent = Math.round((correct / total) * 100);
    const passed = percent >= selectedCompany.passingPercent;

    setExamResults({
      correct,
      total,
      percent,
      passed,
      sectionResults,
      timeUsed: selectedCompany.duration * 60 - timeLeft,
    });
    setView('result');
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${m}:${String(sec).padStart(2,'0')}`;
  };

  // ---- PREMIUM GATE ----
  if (!isPp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="text-white" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Premium Plus Feature</h2>
          <p className="text-gray-600 mb-6">Company-specific exam preparation is available for Premium Plus members.</p>
          <button onClick={() => navigate('/app/payment')} className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-600 hover:to-blue-600 transition">
            Upgrade to Premium Plus
          </button>
        </div>
      </div>
    );
  }

  // ---- COMPANY LIST VIEW ----
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl">
                <Building2 className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Company Exam Practice</h1>
                <p className="text-sm text-gray-500">Prepare for top IT company recruitment drives</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {COMPANIES.map(company => {
              const qCount = (COMPANY_QUESTIONS[company.id] || []).length;
              return (
                <div key={company.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group">
                  <div className="p-6">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="text-3xl">{company.logo}</div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{company.name}</h3>
                        <p className="text-xs text-gray-400">{company.fullName}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{company.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {company.sections.map(s => (
                        <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                          {SECTION_ICONS[s]} {s}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                      <span className="flex items-center gap-1"><Clock size={12} /> {company.duration} min</span>
                      <span className="flex items-center gap-1"><FileText size={12} /> {qCount} questions</span>
                      <span className="flex items-center gap-1"><Award size={12} /> {company.passingPercent}% to pass</span>
                    </div>
                    <button
                      onClick={() => startExam(company)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold text-sm hover:from-indigo-600 hover:to-blue-600 transition-all group-hover:shadow-md flex items-center justify-center gap-2"
                    >
                      Start Practice <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ---- EXAM VIEW ----
  if (view === 'exam') {
    const allQuestions = COMPANY_QUESTIONS[selectedCompany.id] || [];
    const sections = [...new Set(allQuestions.map(q => q.section))];
    const sectionQuestions = filteredSection === 'All' ? allQuestions : allQuestions.filter(q => q.section === filteredSection);
    const totalAnswered = Object.keys(answers).length;
    const totalQuestions = allQuestions.length;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b shadow-sm sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { if(timerRef.current) clearInterval(timerRef.current); setExamMode(false); try { document.exitFullscreen?.().catch(() => {}); } catch {} setView('list'); }} className="p-2 rounded-lg hover:bg-gray-100 transition">
                <ArrowLeft size={18} className="text-gray-600" />
              </button>
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  {selectedCompany.logo} {selectedCompany.name} Exam Practice
                </h2>
                <p className="text-xs text-gray-400">{totalAnswered}/{totalQuestions} answered</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold ${timeLeft < 300 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
                <Clock size={14} />
                {formatTime(timeLeft)}
              </div>
              <button onClick={submitExam} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition">
                Submit
              </button>
            </div>
          </div>
          {/* Section Filter Tabs */}
          <div className="max-w-6xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto">
            <button
              onClick={() => { setFilteredSection('All'); setCurrentQuestion(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${filteredSection === 'All' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All ({allQuestions.length})
            </button>
            {sections.map(s => {
              const count = allQuestions.filter(q => q.section === s).length;
              return (
                <button
                  key={s}
                  onClick={() => { setFilteredSection(s); setCurrentQuestion(0); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${filteredSection === s ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {SECTION_ICONS[s]} {s} ({count})
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          {sectionQuestions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No questions in this section.</div>
          ) : (
            <>
              {/* Question Navigator */}
              <div className="flex flex-wrap gap-1.5 mb-6">
                {sectionQuestions.map((q, i) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isCurrent = i === currentQuestion;
                  return (
                    <button
                      key={q.id}
                      onClick={() => { setCurrentQuestion(i); setShowExplanation(false); }}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        isCurrent ? 'ring-2 ring-indigo-400 bg-indigo-500 text-white scale-110' :
                        isAnswered ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              {/* Current Question */}
              {(() => {
                const q = sectionQuestions[currentQuestion];
                const selected = answers[q.id];
                const hasAnswered = selected !== undefined;

                return (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r ${SECTION_COLORS[q.section]} text-white`}>
                        {q.section}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                        q.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-4">{q.question}</h3>
                    <div className="space-y-2">
                      {q.options.map((opt, i) => {
                        const isSelected = selected === i;
                        const isCorrect = i === q.correct;
                        let optStyle = 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50';
                        if (hasAnswered) {
                          if (isCorrect) optStyle = 'border-emerald-400 bg-emerald-50';
                          else if (isSelected && !isCorrect) optStyle = 'border-red-400 bg-red-50';
                          else optStyle = 'border-gray-200 opacity-60';
                        } else if (isSelected) {
                          optStyle = 'border-indigo-400 bg-indigo-50';
                        }

                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (!hasAnswered) {
                                setAnswers(prev => ({ ...prev, [q.id]: i }));
                              }
                            }}
                            disabled={hasAnswered}
                            className={`w-full text-left p-3 rounded-xl border-2 transition-all text-sm ${optStyle} flex items-center gap-3`}
                          >
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              hasAnswered && isCorrect ? 'bg-emerald-500 text-white' :
                              hasAnswered && isSelected ? 'bg-red-500 text-white' :
                              isSelected ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {hasAnswered && isCorrect ? <CheckCircle size={14} /> :
                               hasAnswered && isSelected ? <XCircle size={14} /> :
                               String.fromCharCode(65 + i)}
                            </span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {hasAnswered && q.explanation && (
                      <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800">
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                    {/* Navigation */}
                    <div className="flex justify-between mt-5">
                      <button
                        onClick={() => { setCurrentQuestion(Math.max(0, currentQuestion - 1)); setShowExplanation(false); }}
                        disabled={currentQuestion === 0}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition"
                      >
                        Previous
                      </button>
                      {currentQuestion < sectionQuestions.length - 1 ? (
                        <button
                          onClick={() => { setCurrentQuestion(currentQuestion + 1); setShowExplanation(false); }}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition"
                        >
                          Next
                        </button>
                      ) : (
                        <button onClick={submitExam} className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition">
                          Submit Exam
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- RESULT VIEW ----
  if (view === 'result' && examResults) {
    const { correct, total, percent, passed, sectionResults, timeUsed } = examResults;
    const allQuestions = COMPANY_QUESTIONS[selectedCompany.id] || [];

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-3xl mx-auto px-4 py-10">
          {/* Score Card */}
          <div className={`rounded-2xl shadow-xl p-8 mb-6 text-center ${passed ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
            <div className="text-5xl mb-3">{passed ? '🎉' : '💪'}</div>
            <h2 className="text-2xl font-bold text-white mb-1">{passed ? 'Congratulations!' : 'Keep Practicing!'}</h2>
            <p className="text-white/80 text-sm mb-4">{selectedCompany.name} Practice Exam {passed ? 'Passed' : 'Result'}</p>
            <div className="text-6xl font-black text-white mb-2">{percent}%</div>
            <p className="text-white/80 text-sm">{correct}/{total} correct answers</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 text-center border shadow-sm">
              <div className="text-2xl font-bold text-indigo-600">{correct}</div>
              <div className="text-xs text-gray-500">Correct</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border shadow-sm">
              <div className="text-2xl font-bold text-red-500">{total - correct}</div>
              <div className="text-xs text-gray-500">Wrong</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border shadow-sm">
              <div className="text-2xl font-bold text-gray-700">{Math.floor(timeUsed / 60)}m</div>
              <div className="text-xs text-gray-500">Time Used</div>
            </div>
          </div>

          {/* Section Breakdown */}
          <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 size={18} /> Section-wise Results
            </h3>
            <div className="space-y-3">
              {Object.entries(sectionResults).map(([section, data]) => {
                const secPercent = Math.round((data.correct / data.total) * 100);
                return (
                  <div key={section}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{SECTION_ICONS[section]} {section}</span>
                      <span className="text-gray-500">{data.correct}/{data.total} ({secPercent}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full bg-gradient-to-r ${SECTION_COLORS[section]}`} style={{ width: `${secPercent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={() => setView('list')} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> Back to Companies
            </button>
            <button onClick={() => startExam(selectedCompany)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold hover:from-indigo-600 hover:to-blue-600 transition flex items-center justify-center gap-2">
              <Zap size={16} /> Retry Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default CompanyExamPage;
