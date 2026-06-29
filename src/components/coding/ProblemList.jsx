import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, X, Lock, CheckCircle, Circle, Clock, Zap, Trophy, BookOpen, Brain, Filter, ArrowUpDown } from 'lucide-react';
import { DIFFICULTY_LEVELS } from '../../data/codingProblems';
import { getUnlockedDifficulties, isDifficultyUnlocked, getDifficultyBadgeColor } from '../../data/skillUpUtils';

const PROBLEMS_PER_PAGE = 20;

const SORT_OPTIONS = [
  { id: 'difficulty-asc', label: 'Difficulty ↑' },
  { id: 'difficulty-desc', label: 'Difficulty ↓' },
  { id: 'xp-asc', label: 'XP ↑' },
  { id: 'xp-desc', label: 'XP ↓' },
  { id: 'title-asc', label: 'Title A-Z' },
  { id: 'title-desc', label: 'Title Z-A' },
];

const ProblemList = ({ problems, onSelectProblem, userProgress = {} }) => {
  const [search, setSearch] = useState('');
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('difficulty-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const totalXp = userProgress?.xp || 0;
  const solvedIds = new Set(userProgress?.solvedIds || []);
  const unlocked = getUnlockedDifficulties(totalXp);
  const unlockedNames = new Set(unlocked.map((d) => d.name));

  const allTags = useMemo(() => {
    const tagSet = new Set();
    for (let i = 0; i < Math.min(200, problems.length); i++) {
      const p = problems[i];
      (p.tags || []).forEach((t) => tagSet.add(t));
    }
    return [...tagSet].sort();
  }, [problems]);

  const filtered = useMemo(() => {
    let result = problems;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q));
    }

    if (selectedDifficulties.length > 0) {
      result = result.filter((p) => selectedDifficulties.includes(p.difficulty));
    }

    if (selectedTags.length > 0) {
      result = result.filter((p) => (p.tags || []).some((t) => selectedTags.includes(t)));
    }

    const [field, dir] = sortBy.split('-');
    result.sort((a, b) => {
      let cmp = 0;
      if (field === 'difficulty') cmp = (a.difficultyLevel || 0) - (b.difficultyLevel || 0);
      else if (field === 'xp') cmp = (a.xpReward || 0) - (b.xpReward || 0);
      else if (field === 'title') cmp = (a.title || '').localeCompare(b.title || '');
      if (cmp === 0) cmp = a.id - b.id;
      return dir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [problems, search, selectedDifficulties, selectedTags, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PROBLEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageProblems = filtered.slice((safePage - 1) * PROBLEMS_PER_PAGE, safePage * PROBLEMS_PER_PAGE);

  const toggleDifficulty = (name) => {
    setSelectedDifficulties((prev) =>
      prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name]
    );
    setCurrentPage(1);
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setCurrentPage(1);
  };

  const stats = useMemo(() => {
    const total = problems.length;
    const solvedCount = problems.filter((p) => solvedIds.has(p.id)).length;
    const xpEarned = problems
      .filter((p) => solvedIds.has(p.id))
      .reduce((sum, p) => sum + (p.xpReward || 0), 0);
    return { total, solvedCount, xpEarned };
  }, [problems, solvedIds]);

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <BookOpen size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Problems</p>
              <p className="text-xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <CheckCircle size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Solved</p>
              <p className="text-xl font-bold text-white">{stats.solvedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10">
              <Zap size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">XP Earned</p>
              <p className="text-xl font-bold text-white">{stats.xpEarned}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <Trophy size={18} className="text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Current Streak</p>
              <p className="text-xl font-bold text-white">{userProgress?.currentStreak || 0} days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search problems by title..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Difficulty Filter */}
          <div className="relative">
            <button
              onClick={() => setShowDifficultyDropdown(!showDifficultyDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm text-slate-300 hover:text-white transition-colors"
            >
              <Filter size={14} />
              Difficulty {selectedDifficulties.length > 0 && `(${selectedDifficulties.length})`}
              <ChevronDown size={14} />
            </button>
            {showDifficultyDropdown && (
              <>
                <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowDifficultyDropdown(false)} />
                <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">Select Difficulty</span>
                    <button onClick={() => setShowDifficultyDropdown(false)} className="text-slate-500 hover:text-white text-lg leading-none">&times;</button>
                  </div>
                  <div className="p-2 max-h-80 overflow-y-auto">
                    {DIFFICULTY_LEVELS.map((d) => {
                      const unlocked = unlockedNames.has(d.name);
                      return (
                        <label
                          key={d.id}
                          className={`flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer rounded-xl transition-colors ${
                            unlocked ? 'hover:bg-slate-800 text-slate-300' : 'text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedDifficulties.includes(d.name)}
                            onChange={() => unlocked && toggleDifficulty(d.name)}
                            disabled={!unlocked}
                            className="rounded border-slate-600 text-amber-500 focus:ring-amber-500/50"
                          />
                          <span className="flex-1">{d.name}</span>
                          {!unlocked && <Lock size={12} className="text-slate-600" />}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Tags Filter */}
          <div className="relative">
            <button
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm text-slate-300 hover:text-white transition-colors"
            >
              <Brain size={14} />
              Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
              <ChevronDown size={14} />
            </button>
            {showTagDropdown && (
              <>
                <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowTagDropdown(false)} />
                <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 max-h-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">Select Tags</span>
                    <button onClick={() => setShowTagDropdown(false)} className="text-slate-500 hover:text-white text-lg leading-none">&times;</button>
                  </div>
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {allTags.map((tag) => (
                      <label
                        key={tag}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 cursor-pointer rounded-xl transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag)}
                          onChange={() => toggleTag(tag)}
                          className="rounded border-slate-600 text-amber-500 focus:ring-amber-500/50"
                        />
                        {tag}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-sm text-slate-300 hover:text-white transition-colors"
            >
              <ArrowUpDown size={14} />
              {SORT_OPTIONS.find((o) => o.id === sortBy)?.label || 'Sort'}
              <ChevronDown size={14} />
            </button>
            {showSortDropdown && (
              <>
                <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowSortDropdown(false)} />
                <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">Sort By</span>
                    <button onClick={() => setShowSortDropdown(false)} className="text-slate-500 hover:text-white text-lg leading-none">&times;</button>
                  </div>
                  <div className="p-2">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => { setSortBy(opt.id); setShowSortDropdown(false); }}
                        className={`w-full text-left px-3 py-2.5 text-sm rounded-xl transition-colors ${
                          sortBy === opt.id ? 'text-amber-400 bg-slate-800' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Active filters display */}
          {(selectedDifficulties.length > 0 || selectedTags.length > 0 || search) && (
            <button
              onClick={() => { setSelectedDifficulties([]); setSelectedTags([]); setSearch(''); setCurrentPage(1); }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              <X size={14} />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Problem Cards */}
      {pageProblems.length === 0 ? (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-12 text-center">
          <Brain size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No problems match your filters. Try adjusting them.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {pageProblems.map((problem) => {
            const solved = solvedIds.has(problem.id);
            const unlocked = isDifficultyUnlocked(problem.difficulty, totalXp);
            const diffColor = getDifficultyBadgeColor(problem.difficulty);

            return (
              <button
                key={problem.id}
                onClick={() => unlocked && onSelectProblem?.(problem.id)}
                disabled={!unlocked}
                className={`w-full text-left bg-slate-900/80 backdrop-blur-xl border rounded-2xl p-4 transition-all duration-200 ${
                  unlocked
                    ? 'border-slate-700/50 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 cursor-pointer'
                    : 'border-slate-800/50 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className="mt-0.5">
                    {!unlocked ? (
                      <Lock size={18} className="text-slate-600" />
                    ) : solved ? (
                      <CheckCircle size={18} className="text-emerald-400" />
                    ) : (
                      <Circle size={18} className="text-slate-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-base font-semibold ${unlocked ? 'text-white' : 'text-slate-500'}`}>
                        {problem.id}. {problem.title}
                      </h3>
                      {solved && unlocked && (
                        <span className="text-xs text-emerald-400 font-medium">Solved</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${diffColor}`}>
                        {problem.difficulty}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Zap size={10} />
                        {problem.xpReward} XP
                      </span>
                      {(problem.tags || []).slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-slate-800 text-slate-400 border border-slate-700/50"
                        >
                          {tag}
                        </span>
                      ))}
                      {(problem.tags || []).length > 3 && (
                        <span className="text-xs text-slate-500">+{problem.tags.length - 3} more</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-500 hidden sm:block">
                    <div>#{problem.id}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-slate-300 disabled:opacity-40 hover:bg-slate-700/60 transition-colors"
          >
            Previous
          </button>
          {(() => {
            const pages = [];
            const start = Math.max(1, safePage - 2);
            const end = Math.min(totalPages, safePage + 2);
            if (start > 1) pages.push(1, '...');
            for (let i = start; i <= end; i++) pages.push(i);
            if (end < totalPages) pages.push('...', totalPages);
            return pages.map((page, idx) =>
              typeof page === 'number' ? (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                    safePage === page
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:bg-slate-700/60'
                  }`}
                >
                  {page}
                </button>
              ) : (
                <span key={idx} className="text-slate-600 px-1">...</span>
              )
            );
          })()}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-slate-300 disabled:opacity-40 hover:bg-slate-700/60 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Results count */}
      <div className="text-center text-xs text-slate-500">
        Showing {pageProblems.length} of {filtered.length} problems
        {filtered.length !== problems.length && ` (filtered from ${problems.length})`}
      </div>
    </div>
  );
};

export default ProblemList;
