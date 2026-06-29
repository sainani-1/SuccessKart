import React, { useState } from 'react';
import { Brain, Code2, ArrowRight, ChevronLeft, Clock, BarChart3 } from 'lucide-react';
import { QUIZ_QUESTIONS } from '../data/quizQuestions';
import QuizEngine from '../components/quiz/QuizEngine';
import QuizResult from '../components/quiz/QuizResult';

const LANGUAGES = [
  { key: 'python', label: 'Python', color: 'from-blue-500 to-blue-700' },
  { key: 'java', label: 'Java', color: 'from-red-500 to-orange-600' },
  { key: 'javascript', label: 'JavaScript', color: 'from-yellow-400 to-yellow-600' },
  { key: 'typescript', label: 'TypeScript', color: 'from-blue-600 to-indigo-700' },
  { key: 'c', label: 'C', color: 'from-slate-500 to-slate-700' },
  { key: 'cpp', label: 'C++', color: 'from-blue-600 to-blue-800' },
  { key: 'csharp', label: 'C#', color: 'from-purple-500 to-purple-700' },
  { key: 'go', label: 'Go', color: 'from-cyan-400 to-cyan-600' },
  { key: 'rust', label: 'Rust', color: 'from-orange-600 to-orange-800' },
  { key: 'kotlin', label: 'Kotlin', color: 'from-violet-500 to-violet-700' },
  { key: 'php', label: 'PHP', color: 'from-indigo-400 to-indigo-600' },
  { key: 'sql', label: 'SQL', color: 'from-emerald-500 to-emerald-700' },
  { key: 'dart', label: 'Dart', color: 'from-teal-400 to-teal-600' },
  { key: 'swift', label: 'Swift', color: 'from-orange-400 to-red-500' },
  { key: 'react', label: 'React', color: 'from-cyan-400 to-blue-500' },
  { key: 'nodejs', label: 'Node.js', color: 'from-green-500 to-green-700' },
];

const LEVELS = [
  {
    key: 'basic',
    label: 'Basic',
    description: 'Variables, Data Types, I/O, Operators, Conditions, Loops, Functions',
    icon: '🌱',
    time: '30 min',
    questions: 25,
  },
  {
    key: 'beginner',
    label: 'Beginner',
    description: 'Arrays, Strings, Searching, Sorting, OOP, Error Handling',
    icon: '🚀',
    time: '25 min',
    questions: 25,
  },
  {
    key: 'advanced',
    label: 'Advanced',
    description: 'DP, Trees, Graphs, Recursion, System Design, Optimization',
    icon: '🔥',
    time: '30 min',
    questions: 25,
  },
];

const KnowYourLevel = () => {
  const [selectedLang, setSelectedLang] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [quizState, setQuizState] = useState('select');
  const [quizResult, setQuizResult] = useState(null);

  if (quizState === 'playing') {
    return (
      <QuizEngine
        questions={QUIZ_QUESTIONS[selectedLang][selectedLevel]}
        language={selectedLang}
        level={selectedLevel}
        onComplete={(result) => {
          setQuizResult(result);
          setQuizState('result');
        }}
      />
    );
  }

  if (quizState === 'result') {
    return (
      <QuizResult
        result={quizResult}
        onRetry={() => {
          setQuizResult(null);
          setQuizState('playing');
        }}
        onBack={() => {
          setQuizResult(null);
          setSelectedLevel(null);
          setQuizState('select');
        }}
      />
    );
  }

  if (selectedLang && !selectedLevel) {
    const langLabel = LANGUAGES.find(l => l.key === selectedLang)?.label || selectedLang;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedLang(null)} className="p-2 rounded-xl hover:bg-slate-100 transition">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{langLabel}</h1>
            <p className="text-slate-500">Choose your assessment level</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {LEVELS.map((level) => (
            <button
              key={level.key}
              onClick={() => { setSelectedLevel(level.key); setQuizState('playing'); }}
              className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <div className="text-4xl mb-4">{level.icon}</div>
              <h3 className="text-xl font-bold text-slate-900">{level.label}</h3>
              <p className="mt-2 text-sm text-slate-500">{level.description}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1"><Clock size={14} />{level.time}</span>
                <span className="inline-flex items-center gap-1"><BarChart3 size={14} />{level.questions} Q</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-600 group-hover:text-emerald-700">
                Start Quiz <ArrowRight size={16} />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
            <Brain size={36} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">Assessment</p>
            <h1 className="text-3xl font-bold mt-1">Know Your Level</h1>
            <p className="mt-2 text-violet-100 max-w-2xl">
              Discover your programming proficiency before starting courses. 
              Choose a language and take a quick assessment quiz.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.key}
            onClick={() => {
              setSelectedLang(lang.key);
              setSelectedLevel(null);
            }}
            className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-2xl bg-gradient-to-br ${lang.color} p-3 text-white shadow-lg`}>
                <Code2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{lang.label}</h3>
                <p className="text-xs text-slate-400">3 levels · 75 questions</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-violet-600 opacity-0 transition-opacity group-hover:opacity-100">
              Start Assessment <ArrowRight size={14} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default KnowYourLevel;
