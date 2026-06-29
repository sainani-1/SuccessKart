import React from 'react';
import { AlertTriangle, Target, Clock, Brain, BookOpen, TrendingUp, ArrowLeft, RefreshCw, Award, Star, Zap, ShieldAlert } from 'lucide-react';
import { TOPIC_COURSE_MAP } from '../../data/courseRecommendations';

const getLevelInfo = (percentage) => {
  if (percentage < 40) return { label: 'Beginner', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: <Star size={20} /> };
  if (percentage < 70) return { label: 'Intermediate', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: <TrendingUp size={20} /> };
  if (percentage < 90) return { label: 'Advanced', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: <Award size={20} /> };
  return { label: 'Expert', color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: <Zap size={20} /> };
};

const getPerformanceLabel = (percentage) => {
  if (percentage < 40) return { label: 'Needs Improvement', color: 'text-red-400' };
  if (percentage < 70) return { label: 'Good', color: 'text-amber-400' };
  if (percentage < 90) return { label: 'Great', color: 'text-emerald-400' };
  return { label: 'Excellent!', color: 'text-amber-300' };
};

const ScoreCircle = ({ percentage }) => {
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const strokeColor = percentage < 40 ? '#f87171' : percentage < 70 ? '#fbbf24' : percentage < 90 ? '#34d399' : '#f59e0b';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="180" height="180" className="transform -rotate-90">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(148, 163, 184, 0.12)" strokeWidth="10" />
        <circle
          cx="90" cy="90" r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-slate-100">{percentage}%</span>
        <span className="text-xs text-slate-500 mt-1">Score</span>
      </div>
    </div>
  );
};

const QuizResult = ({ result, onRetry, onBack }) => {
  const { score, total, percentage, timeTaken, tabSwitches, copyPasteAttempts, strengths, weaknesses, topicBreakdown, language, level } = result;

  const levelInfo = getLevelInfo(percentage);
  const perfInfo = getPerformanceLabel(percentage);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const hasAntiCheatWarning = tabSwitches > 3 || copyPasteAttempts > 0;

  const weakTopics = weaknesses.slice(0, 5);
  const recommendations = weakTopics.map((topic) => {
    const rec = TOPIC_COURSE_MAP[topic];
    return rec ? { topic, ...rec } : null;
  }).filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Brain size={32} className="text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Quiz Complete!</h1>
          <p className="text-slate-500 capitalize">{language} - {level}</p>
        </div>

        {hasAntiCheatWarning && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/5 border border-red-500/20">
            <div className="flex items-start gap-3">
              <ShieldAlert size={20} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-medium text-sm">Anti-Cheat Violations Detected</p>
                <p className="text-red-400/70 text-xs mt-1">
                  {tabSwitches > 3 && `${tabSwitches} tab switches detected. `}
                  {copyPasteAttempts > 0 && `${copyPasteAttempts} copy/paste attempt(s) detected.`}
                  {' '}Results may be flagged for review.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800/50 rounded-3xl p-6 md:p-8 shadow-2xl mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="flex flex-col items-center">
              <ScoreCircle percentage={percentage} />
              <p className="text-xl font-semibold text-slate-200 mt-4">
                You scored <span className="text-amber-400">{score}/{total}</span> ({percentage}%)
              </p>
              <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mt-3 ${perfInfo.color} bg-slate-800/60`}>
                {perfInfo.label}
              </span>
            </div>
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl ${levelInfo.bg} border ${levelInfo.border}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${levelInfo.bg}`}>
                    {levelInfo.icon}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Your Level</p>
                    <p className={`text-lg font-bold ${levelInfo.color}`}>{levelInfo.label}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                <Clock size={20} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Time Taken</p>
                  <p className="text-sm font-semibold text-slate-200">{formatTime(timeTaken)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                <Target size={20} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Accuracy</p>
                  <p className="text-sm font-semibold text-slate-200">{percentage}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {strengths.length > 0 && (
            <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800/50 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Award size={18} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">Strengths</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {strengths.map((topic) => (
                  <span key={topic} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {weaknesses.length > 0 && (
            <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800/50 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className="text-red-400" />
                <h3 className="text-sm font-semibold text-slate-200">Weaknesses</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {weaknesses.map((topic) => (
                  <span key={topic} className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800/50 rounded-3xl p-6 md:p-8 shadow-2xl mb-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">Topic Breakdown</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(topicBreakdown).map(([topic, data]) => {
              const pct = data.total > 0 ? (data.correct / data.total) * 100 : 0;
              const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
              return (
                <div key={topic}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-medium">{topic}</span>
                    <span className="text-slate-500">{data.correct}/{data.total}</span>
                  </div>
                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {recommendations.length > 0 && (
          <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-800/50 rounded-3xl p-6 md:p-8 shadow-2xl mb-6">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen size={18} className="text-sky-400" />
              <h3 className="text-sm font-semibold text-slate-200">Recommended Courses</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.topic}
                  className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/5 to-sky-600/5 border border-sky-500/15 hover:border-sky-500/30 transition-all"
                >
                  <p className="text-xs text-sky-400/70 font-medium mb-1">{rec.topic}</p>
                  <p className="text-sm text-slate-200 font-semibold">{rec.course}</p>
                  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    rec.level === 'Beginner' ? 'bg-emerald-500/10 text-emerald-400' :
                    rec.level === 'Intermediate' ? 'bg-amber-500/10 text-amber-400' :
                    rec.level === 'Advanced' ? 'bg-red-500/10 text-red-400' :
                    'bg-sky-500/10 text-sky-400'
                  }`}>
                    {rec.level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 font-medium text-sm hover:bg-slate-800/80 transition-all"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-bold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.02] transition-all"
          >
            <RefreshCw size={16} />
            Retry Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizResult;
