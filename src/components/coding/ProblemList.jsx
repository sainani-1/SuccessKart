import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Lock, Zap, BookOpen, Trophy, Star, Target, CheckCircle, Circle, Search, X, Brain, Code2, Route } from 'lucide-react';
import { CURRICULUM } from '../../data/codingProblems';
import { getDifficultyBadgeColor, getLevelFromXp, isDifficultyUnlocked } from '../../data/skillUpUtils';

const CURRICULUM_ORDER = ['beginner', 'easy', 'medium', 'hard', 'expert'];

const DIFFICULTY_SECTION_MAP = {
  beginner: ['Very Easy'],
  easy: ['Easy', 'Basic', 'Beginner'],
  medium: ['Intermediate'],
  hard: ['Advanced', 'Hard', 'Very Hard'],
  expert: ['Expert', 'Competitive Programming'],
};

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

const ProblemList = ({ problems, onSelectProblem, userProgress = {} }) => {
  const [search, setSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState(new Set(CURRICULUM_ORDER));
  const [expandedTopics, setExpandedTopics] = useState(new Set());

  const totalXp = userProgress?.xp || 0;
  const solvedIds = new Set(userProgress?.solvedIds || []);
  const level = getLevelFromXp(totalXp);

  const problemMap = useMemo(() => {
    const map = {};
    problems.forEach(p => { map[p.id] = p; });
    return map;
  }, [problems]);

  const curriculumStats = useMemo(() => {
    const stats = {};
    for (const sectionId of CURRICULUM_ORDER) {
      let sectionProblems;
      if (sectionId === 'beginner') {
        sectionProblems = problems.filter(p => p.id >= 1 && p.id <= 20);
      } else {
        const difficulties = DIFFICULTY_SECTION_MAP[sectionId] || [];
        sectionProblems = problems.filter(p => p.id > 20 && difficulties.includes(p.difficulty));
      }
      const solved = sectionProblems.filter(p => solvedIds.has(p.id)).length;
      stats[sectionId] = { solved, total: sectionProblems.length, xpGained: 0 };
    }
    return stats;
  }, [problems, solvedIds]);

  const sectionProblemsMap = useMemo(() => {
    const map = {};
    for (const sectionId of CURRICULUM_ORDER) {
      if (sectionId === 'beginner') {
        map[sectionId] = problems.filter(p => p.id >= 1 && p.id <= 20).sort((a, b) => a.id - b.id);
      } else {
        const difficulties = DIFFICULTY_SECTION_MAP[sectionId] || [];
        map[sectionId] = problems.filter(p => p.id > 20 && difficulties.includes(p.difficulty));
      }
    }
    return map;
  }, [problems]);

  const problemStats = useMemo(() => {
    const total = problems.length;
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
        const sectionProblems = sectionProblemsMap[section.id] || [];
        section.subSections.forEach(ss => {
          const tagLower = ss.topic.toLowerCase();
          const matching = sectionProblems.filter(p => {
            const pTags = (p.tags || []).map(t => t.toLowerCase());
            return pTags.some(t => {
              if (t === tagLower || t.includes(tagLower) || tagLower.includes(t)) return true;
              const normalizedTag = tagLower.replace(/[\s-]/g, '').toLowerCase();
              const normalizedT = t.replace(/[\s-]/g, '').toLowerCase();
              return normalizedT.includes(normalizedTag) || normalizedTag.includes(normalizedT);
            });
          });
          map[`${section.id}-${ss.topic}`] = matching;
        });
      }
    });
    return map;
  }, [sectionProblemsMap]);

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
    });
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
            className="w-full pl-9 pr-9 py-2.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="text-sm text-slate-400 mb-2">Search results ({results.length})</div>
        {results.length === 0 ? (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-12 text-center">
            <Brain size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">No problems match your search.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {results.slice(0, 50).map(problem => {
              const solved = solvedIds.has(problem.id);
              const unlocked = isDifficultyUnlocked(problem.difficulty, totalXp);
              const diffColor = getDifficultyBadgeColor(problem.difficulty);
              return (
                <button
                  key={problem.id}
                  onClick={() => unlocked && onSelectProblem?.(problem.id)}
                  disabled={!unlocked}
                  className={`w-full text-left bg-slate-900/80 backdrop-blur-xl border rounded-xl p-3 transition-all duration-200 ${
                    unlocked ? 'border-slate-700/50 hover:border-amber-500/30 hover:shadow-lg cursor-pointer' : 'border-slate-800/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {!unlocked ? <Lock size={16} className="text-slate-600" /> :
                       solved ? <CheckCircle size={16} className="text-emerald-400" /> :
                       <Circle size={16} className="text-slate-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${unlocked ? 'text-white' : 'text-slate-500'}`}>{problem.id}. {cleanTitle(problem.title)}</span>
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
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 border border-amber-500/20 rounded-[2rem] p-5 md:p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              <Route size={12} />
              50K+ Question Explorer
            </div>
            <h2 className="mt-3 text-2xl md:text-3xl font-black text-white">
              Basic to Expert, all in one learning path
            </h2>
            <p className="mt-2 text-sm md:text-base text-slate-300 max-w-xl">
              Practice structured problems, track what you have solved, and move from absolute basics to competitive programming with a clean roadmap.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:min-w-[340px]">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Total</p>
              <p className="mt-1 text-2xl font-bold text-white">{problemStats.total.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Solved</p>
              <p className="mt-1 text-2xl font-bold text-emerald-300">{problemStats.solved.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Unlocked</p>
              <p className="mt-1 text-2xl font-bold text-amber-300">{problemStats.unlocked.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Progress</p>
              <p className="mt-1 text-2xl font-bold text-white">{problemStats.completion}%</p>
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-500 transition-all duration-700"
            style={{ width: `${problemStats.completion}%` }}
          />
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Route size={20} className="text-amber-400" />
          <h2 className="text-lg font-bold text-white">Learning Roadmap</h2>
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
              className="pl-8 pr-3 py-1.5 bg-slate-800/60 border border-slate-600/50 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-48"
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
            <div key={sectionId} className={`bg-gradient-to-br ${colors.bg} rounded-2xl p-3 border ${colors.border}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{section?.label || sectionId}</p>
              <p className="text-xl font-bold text-white mt-1">{stats.solved}<span className="text-sm font-normal opacity-60">/{stats.total}</span></p>
              <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-white/40 rounded-full transition-all duration-500" style={{ width: stats.total > 0 ? `${(stats.solved / stats.total) * 100}%` : '0%' }} />
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
            <div key={sectionId} className={`bg-slate-900/80 backdrop-blur-xl border ${colors.border} rounded-2xl overflow-hidden transition-all duration-300 ${!isUnlocked ? 'opacity-60' : ''}`}>
              {/* Section Header */}
              <button
                onClick={() => isUnlocked && toggleSection(sectionId)}
                disabled={!isUnlocked}
                className={`w-full flex items-center gap-4 p-4 transition-colors ${isUnlocked ? 'hover:bg-slate-800/40 cursor-pointer' : 'cursor-not-allowed'}`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center text-lg`}>
                  {sectionIcons[sectionId]}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{section.label}</h3>
                    {!isUnlocked && <Lock size={14} className="text-slate-500" />}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs font-medium ${colors.text}`}>{stats.solved}/{stats.total} solved</span>
                    <div className="flex-1 max-w-[200px] h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${colors.bg}`}
                        style={{ width: stats.total > 0 ? `${(stats.solved / stats.total) * 100}%` : '0%' }} />
                    </div>
                    <span className="text-xs text-slate-500">{Math.round(stats.total > 0 ? (stats.solved / stats.total) * 100 : 0)}%</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                </div>
              </button>

              {/* Section Content */}
              {isExpanded && isUnlocked && (
                <div className="border-t border-slate-700/30">
                  {sectionId === 'beginner' ? (
                    /* Beginner: flat list with ⭕/✅ */
                    <div className="p-4 space-y-1">
                      {sectionProbs.slice(0, 20).map((problem, idx) => {
                        const solved = solvedIds.has(problem.id);
                        return (
                          <button
                            key={problem.id}
                            onClick={() => onSelectProblem?.(problem.id)}
                            className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                              solved ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10' : 'hover:bg-slate-700/40'
                            }`}
                          >
                            <span className="flex-shrink-0">
                              {solved ? <CheckCircle size={18} className="text-emerald-400" /> : <Circle size={18} className="text-slate-500" />}
                            </span>
                            <span className="text-sm text-slate-400 w-6 flex-shrink-0">{idx + 1}.</span>
                            <span className={`text-sm flex-1 min-w-0 ${solved ? 'text-emerald-300 font-medium' : 'text-slate-300 group-hover:text-white'}`}>
                              {problem.title}
                            </span>
                            {solved && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">
                                Solved
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Zap size={8} />{problem.xpReward} XP
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Easy/Medium/Hard/Expert: sub-section layout */
                    <div className="p-4 space-y-3">
                      {subSections.map((sub, subIdx) => {
                        const topicKey = `${sectionId}-${subIdx}`;
                        const isTopicExpanded = expandedTopics.has(topicKey);
                        const subProblems = subSectionProblemsMap[`${section.id}-${sub.topic}`] || [];
                        const subSolved = subProblems.filter(p => solvedIds.has(p.id)).length;
                        if (subProblems.length === 0) return null;
                        return (
                          <div key={subIdx} className="bg-slate-800/40 rounded-xl overflow-hidden border border-slate-700/30">
                            <button
                              onClick={() => toggleTopic(topicKey)}
                              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-700/30 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-300">{sub.topic}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${subSolved === subProblems.length ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
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
                                      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                                        unlocked ? 'hover:bg-slate-700/40 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                                      }`}
                                    >
                                      <span className="flex-shrink-0 text-sm">
                                        {!unlocked ? <Lock size={14} className="text-slate-600" /> :
                                         solved ? <CheckCircle size={14} className="text-emerald-400" /> :
                                         <Circle size={14} className="text-slate-600" />}
                                      </span>
                                      <span className={`text-sm flex-1 min-w-0 truncate ${solved ? 'text-emerald-300' : unlocked ? 'text-slate-300' : 'text-slate-600'}`}>
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
