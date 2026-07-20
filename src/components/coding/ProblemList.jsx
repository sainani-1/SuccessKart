import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Lock, Zap, BookOpen, Trophy, Star, Target, CheckCircle, Circle, Search, X, Brain, Code2, Route } from 'lucide-react';
import { CURRICULUM } from '../../data/codingProblems';
import { getDifficultyBadgeColor, getLevelFromXp, isDifficultyUnlocked } from '../../data/skillUpUtils';

const CURRICULUM_ORDER = ['beginner', 'easy', 'medium', 'hard', 'expert'];

function cleanTitle(title) {
  return title
    .replace(/\s+\d+$/, '')
    .replace(/- Variant \d+$/, '')
    .replace(/Challenge \d+$/, '')
    .replace(/\[Practice \d+\]$/, '')
    .replace(/\(Level \d+\)$/, '')
    .replace(/#\d+$/, '')
    .replace(/Exercise \d+$/, '')
    .replace(/^Solve /, '')
    .replace(/^Problem: /, '')
    .replace(/^Task: /, '')
    .trim();
}

function getVariantNumber(title) {
  const m = title.match(/- Variant (\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

const ProblemList = ({ problems, onSelectProblem, userProgress = {}, allProblems = [] }) => {
  const [search, setSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState(new Set(CURRICULUM_ORDER));
  const [expandedTopics, setExpandedTopics] = useState(new Set());

  const totalXp = userProgress?.xp || 0;
  const solvedIds = new Set(userProgress?.solvedIds || []);
  const level = getLevelFromXp(totalXp);

  // Use pre-populated CURRICULUM data instead of filtering all problems
  const curriculumStats = useMemo(() => {
    const stats = {};
    for (const sectionId of CURRICULUM_ORDER) {
      const section = CURRICULUM.find(s => s.id === sectionId);
      if (!section) continue;
      const ids = section.problemIds || [];
      const solved = ids.filter(id => solvedIds.has(id)).length;
      stats[sectionId] = { solved, total: ids.length, xpGained: 0 };
    }
    return stats;
  }, [solvedIds]);

  const problemByIdMap = useMemo(() => {
    const map = new Map();
    allProblems.forEach(p => map.set(p.id, p));
    return map;
  }, [allProblems]);

  const sectionProblemsMap = useMemo(() => {
    const map = {};
    for (const sectionId of CURRICULUM_ORDER) {
      const section = CURRICULUM.find(s => s.id === sectionId);
      if (!section) continue;
      const ids = section.problemIds || [];
      map[sectionId] = ids.map(id => problemByIdMap.get(id)).filter(Boolean).sort((a, b) => a.id - b.id);
    }
    return map;
  }, [problemByIdMap]);

  const problemStats = useMemo(() => {
    const total = CURRICULUM.reduce((sum, s) => sum + (s.problemIds?.length || 0), 0);
    const solved = solvedIds.size;
    const unlocked = problems.filter((problem) => isDifficultyUnlocked(problem.difficulty, totalXp)).length;
    return {
      total,
      solved,
      unlocked,
      completion: total > 0 ? Math.round((solved / total) * 100) : 0,
    };
  }, [problems, solvedIds, totalXp]);

  const subSectionProblemsMap = useMemo(() => {
    const map = {};
    CURRICULUM.forEach(section => {
      if (section.subSections && section.id !== 'beginner') {
        section.subSections.forEach(ss => {
          const ids = ss.problems || [];
          map[`${section.id}-${ss.topic}`] = ids.map(id => problemByIdMap.get(id)).filter(Boolean).sort((a, b) => a.id - b.id);
        });
      }
    });
    return map;
  }, [problemByIdMap]);

  const toggleSection = (id) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTopic = (key) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const sectionIcons = {
    beginner: '🌱', easy: '📘', medium: '📗', hard: '📕', expert: '🏅',
  };

  const sectionColors = {
    beginner: { bg: 'from-emerald-600 to-teal-700', border: 'border-emerald-500/30', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    easy: { bg: 'from-green-600 to-emerald-700', border: 'border-green-500/30', text: 'text-green-300', badge: 'bg-green-500/20 text-green-300 border-green-500/30' },
    medium: { bg: 'from-amber-600 to-orange-700', border: 'border-amber-500/30', text: 'text-amber-300', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    hard: { bg: 'from-red-600 to-rose-700', border: 'border-red-500/30', text: 'text-red-300', badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
    expert: { bg: 'from-purple-600 to-fuchsia-700', border: 'border-purple-500/30', text: 'text-purple-300', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  };

  const filteredProblems = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return problems.filter(p => {
      const clean = cleanTitle(p.title).toLowerCase();
      return clean.includes(q) || p.title.toLowerCase().includes(q);
    }).slice(0, 200);
  }, [problems, search]);

  if (search.trim()) {
    const results = filteredProblems || [];
    return (
      <div className="space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems..."
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
          <div className="text-sm text-slate-500 mb-2">Search results ({results.length}{results.length >= 200 ? ' (showing first 200)' : ''})</div>
        {results.length === 0 ? (
          <div className="bg-white backdrop-blur-xl border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <Brain size={48} className="mx-auto text-slate-400 mb-4" />
            <p className="text-slate-500">No problems match your search.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {results.map(problem => {
              const solved = solvedIds.has(problem.id);
              const unlocked = isDifficultyUnlocked(problem.difficulty, totalXp);
              const diffColor = getDifficultyBadgeColor(problem.difficulty);
              return (
                <button
                  key={problem.id}
                  onClick={() => unlocked && onSelectProblem?.(problem.id)}
                  disabled={!unlocked}
                className={`w-full text-left bg-white backdrop-blur-xl border rounded-xl p-3 transition-all duration-200 shadow-sm ${
                    unlocked ? 'border-slate-200 hover:border-amber-300 hover:shadow-md cursor-pointer' : 'border-slate-200 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {!unlocked ? <Lock size={16} className="text-slate-600" /> :
                       solved ? <CheckCircle size={16} className="text-emerald-400" /> :
                       <Circle size={16} className="text-slate-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${unlocked ? 'text-slate-900' : 'text-slate-500'}`}>{problem.id}. {problem.title}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${diffColor}`}>{problem.difficulty}</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Zap size={8} />{problem.xpReward} XP
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-amber-200 bg-gradient-to-br from-white via-sky-50 to-amber-50 p-5 md:p-7 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="absolute inset-0 opacity-100" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(16,185,129,0.14), transparent 28%), radial-gradient(circle at top right, rgba(251,191,36,0.18), transparent 24%), radial-gradient(circle at 30% 80%, rgba(59,130,246,0.10), transparent 26%)' }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
              <Route size={12} />
              {problemStats.total.toLocaleString()} Unique Questions
            </div>
            <h2 className="mt-4 text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              A clear path from basics to expert mastery
            </h2>
            <p className="mt-3 max-w-2xl text-sm md:text-base leading-7 text-slate-600">
              Search, open, solve, and track progress in one calm workspace. The roadmap below keeps beginner problems visible, unlocks new difficulty bands in order, and marks solved problems instantly.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[360px]">
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Total</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{problemStats.total.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Solved</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{problemStats.solved.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Unlocked</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{problemStats.unlocked.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Progress</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{problemStats.completion}%</p>
            </div>
          </div>
        </div>
        <div className="relative mt-5">
          <div className="h-2 rounded-full bg-white overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-500 transition-all duration-700"
              style={{ width: `${problemStats.completion}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm">Beginner stays visible</span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm">Solved problems stay checked</span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm">Unlocks follow your level</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Route size={20} className="text-amber-400" />
          <h2 className="text-lg font-bold text-slate-900">Learning Roadmap</h2>
          <span className="text-xs text-slate-500">Tap a section to expand</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search problems..."
              className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-56 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {CURRICULUM_ORDER.map(sectionId => {
          const section = CURRICULUM.find(s => s.id === sectionId);
          const stats = curriculumStats[sectionId] || { solved: 0, total: 0 };
          const colors = sectionColors[sectionId];
          return (
            <div key={sectionId} className="relative overflow-hidden rounded-2xl p-4 border border-slate-200 bg-white shadow-sm">
              <div className="absolute inset-0 bg-white/5 opacity-40" />
              <div className="relative">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-80">{section?.label || sectionId}</p>
                  <span className="text-[10px] rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{Math.round(stats.total > 0 ? (stats.solved / stats.total) * 100 : 0)}%</span>
                </div>
                <p className="text-xl font-bold text-slate-900 mt-1">{stats.solved}<span className="text-sm font-normal text-slate-500">/{stats.total}</span></p>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-500" style={{ width: stats.total > 0 ? `${(stats.solved / stats.total) * 100}%` : '0%' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Curriculum Roadmap */}
      <div className="space-y-4">
        {CURRICULUM_ORDER.map((sectionId, sectionIndex) => {
          const section = CURRICULUM.find(s => s.id === sectionId);
          if (!section) return null;
          const colors = sectionColors[sectionId];
          const stats = curriculumStats[sectionId] || { solved: 0, total: 0 };
          const isExpanded = expandedSections.has(sectionId);
          const prevSolved = sectionIndex > 0 ? (curriculumStats[CURRICULUM_ORDER[sectionIndex - 1]]?.solved || 0) : 1;
          const isUnlocked = sectionIndex === 0 || prevSolved >= 1;

          const subSections = section.subSections || [];
          const sectionProbs = sectionProblemsMap[sectionId] || [];

          return (
            <div key={sectionId} className={`overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition-all duration-300 ${!isUnlocked ? 'opacity-60' : ''}`}>
              {/* Section Header */}
              <button
                onClick={() => isUnlocked && toggleSection(sectionId)}
                disabled={!isUnlocked}
                className={`w-full flex items-center gap-4 p-4 md:p-5 transition-colors ${isUnlocked ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-not-allowed'}`}
              >
                <div className={`flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br ${colors.bg} flex items-center justify-center text-lg shadow-lg`}>
                  {sectionIcons[sectionId]}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base md:text-lg font-bold text-slate-900">{section.label}</h3>
                    {!isUnlocked && <Lock size={14} className="text-slate-400" />}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className={`text-xs font-medium ${colors.text}`}>{stats.solved}/{stats.total} solved</span>
                    <div className="flex-1 min-w-[120px] max-w-[260px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${colors.bg}`} style={{ width: stats.total > 0 ? `${(stats.solved / stats.total) * 100}%` : '0%' }} />
                    </div>
                    <span className="text-xs text-slate-500">{Math.round(stats.total > 0 ? (stats.solved / stats.total) * 100 : 0)}%</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {isExpanded ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
                </div>
              </button>

              {/* Section Content */}
              {isExpanded && isUnlocked && (
                <div className="border-t border-slate-100">
                  {sectionId === 'beginner' ? (
                    /* Beginner: flat list with ⭕/✅ */
                    <div className="p-4 md:p-5 space-y-1">
                      {sectionProbs.slice(0, 20).map((problem, idx) => {
                        const solved = solvedIds.has(problem.id);
                        return (
                          <button
                            key={problem.id}
                            onClick={() => onSelectProblem?.(problem.id)}
                            className={`w-full text-left flex items-center gap-3 px-3 md:px-4 py-3 rounded-2xl transition-all group ${
                              solved ? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200' : 'hover:bg-slate-50 border border-transparent'
                            }`}
                          >
                            <span className="flex-shrink-0">
                              {solved ? <CheckCircle size={18} className="text-emerald-400" /> : <Circle size={18} className="text-slate-500" />}
                            </span>
                            <span className="text-sm text-slate-400 w-6 flex-shrink-0">{idx + 1}.</span>
                            <span className={`text-sm md:text-[15px] flex-1 min-w-0 ${solved ? 'text-emerald-700 font-medium' : 'text-slate-700 group-hover:text-slate-900'}`}>
                              {cleanTitle(problem.title)}
                            </span>
                            {solved && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium">
                                Solved
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-amber-100 text-amber-700 border border-amber-200">
                              <Zap size={8} />{problem.xpReward} XP
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Easy/Medium/Hard/Expert: sub-section layout */
                    <div className="p-4 md:p-5 space-y-3">
                      {subSections.map((sub, subIdx) => {
                        const topicKey = `${sectionId}-${subIdx}`;
                        const isTopicExpanded = expandedTopics.has(topicKey);
                        const subProblems = subSectionProblemsMap[`${section.id}-${sub.topic}`] || [];
                        const subSolved = subProblems.filter(p => solvedIds.has(p.id)).length;
                        if (subProblems.length === 0) return null;
                        return (
                          <div key={subIdx} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            <button
                              onClick={() => toggleTopic(topicKey)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm md:text-[15px] font-medium text-slate-800">{sub.topic}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${subSolved === subProblems.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {subSolved}/{subProblems.length}
                                </span>
                              </div>
                              {isTopicExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                            </button>
                            {isTopicExpanded && (
                              <div className="px-2 pb-2 space-y-1">
                                {subProblems.map(problem => {
                                  const solved = solvedIds.has(problem.id);
                                  const unlocked = isDifficultyUnlocked(problem.difficulty, totalXp);
                                  const diffColor = getDifficultyBadgeColor(problem.difficulty);
                                  return (
                                    <button
                                      key={problem.id}
                                      onClick={() => unlocked && onSelectProblem?.(problem.id)}
                                      disabled={!unlocked}
                                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                                        unlocked ? 'hover:bg-white cursor-pointer' : 'opacity-50 cursor-not-allowed'
                                      }`}
                                    >
                                      <span className="flex-shrink-0 text-sm">
                                        {!unlocked ? <Lock size={14} className="text-slate-600" /> :
                                         solved ? <CheckCircle size={14} className="text-emerald-500" /> :
                                         <Circle size={14} className="text-slate-400" />}
                                      </span>
                                      <span className={`text-sm flex-1 min-w-0 truncate ${solved ? 'text-emerald-700' : unlocked ? 'text-slate-700' : 'text-slate-500'}`}>
                                        {cleanTitle(problem.title)}
                                      </span>
                                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${diffColor} flex-shrink-0`}>
                                        {problem.difficulty}
                                      </span>
                                      <span className="text-xs text-amber-400/80 flex items-center gap-0.5 flex-shrink-0">
                                        <Zap size={8} />{problem.xpReward}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center text-xs text-slate-500 pt-2">
        <Code2 size={14} className="inline mr-1 mb-0.5" />
        Follow the roadmap from top to bottom. Complete each section to unlock the next.
      </div>
    </div>
  );
};

export default ProblemList;
