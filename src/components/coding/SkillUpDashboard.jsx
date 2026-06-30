import React, { useMemo } from 'react';
import { Trophy, Zap, Flame, Target, TrendingUp, Award, Code2, Clock, Brain, Star, CheckCircle, XCircle, BookOpen, Medal, Sparkles, Gem, BarChart3, Users, Globe, Route, BadgeCheck, AlertTriangle, Layers, Percent, Activity } from 'lucide-react';
import { getLevelFromXp, getLevelProgress, getXpForNextLevel, getRankFromXp, generateHeatmapData, getHeatmapColor, calculateStreak, checkBadges, analyzeTopics } from '../../data/skillUpUtils';
import { CODING_PROBLEMS } from '../../data/codingProblems';

const WEEKDAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

const SkillUpDashboard = ({ userProgress = {}, recentActivity = [], heatmapData: externalHeatmapData }) => {
  const allProblems = useMemo(() => CODING_PROBLEMS || [], []);

  const stats = useMemo(() => ({
    problemsSolved: userProgress?.problemsSolved || 0,
    currentStreak: userProgress?.currentStreak || 0,
    longestStreak: userProgress?.longestStreak || 0,
    xp: userProgress?.xp || 0,
    coins: userProgress?.coins || 0,
    coinsToday: userProgress?.coinsToday || 0,
    level: userProgress?.level || getLevelFromXp(userProgress?.xp || 0),
    globalRank: userProgress?.globalRank || 'N/A',
    collegeRank: userProgress?.collegeRank || 'N/A',
    totalSubmissions: userProgress?.totalSubmissions || 0,
    totalCodingHours: userProgress?.totalCodingHours || 0,
    accuracy: userProgress?.accuracy || 0,
    acceptanceRate: userProgress?.acceptanceRate || 0,
  }), [userProgress]);

  const level = stats.level;
  const xp = stats.xp;
  const levelProgress = getLevelProgress(xp);
  const xpForNext = getXpForNextLevel(xp);
  const rank = getRankFromXp(xp);
  const acceptedCount = stats.problemsSolved;
  const accuracyPct = Math.min(100, Math.round(stats.acceptanceRate || (stats.totalSubmissions > 0 ? (acceptedCount / stats.totalSubmissions) * 100 : 0)));

  const heatmapData = useMemo(() => {
    return externalHeatmapData || generateHeatmapData(recentActivity);
  }, [externalHeatmapData, recentActivity]);

  const maxHeatmapCount = useMemo(() => Math.max(1, ...heatmapData.map((d) => d.count)), [heatmapData]);

  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      w.push(heatmapData.slice(i, i + 7));
    }
    return w;
  }, [heatmapData]);

  const weeklyData = useMemo(() => {
    const today = new Date();
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const entry = heatmapData.find((h) => h.date === key);
      data.push({ label: d.toLocaleString('default', { weekday: 'short' }), count: entry?.count || 0, date: key });
    }
    return data;
  }, [heatmapData]);

  const maxWeekly = Math.max(1, ...weeklyData.map((d) => d.count));

  const { strong, weak } = useMemo(() => {
    return analyzeTopics(userProgress, allProblems);
  }, [userProgress, allProblems]);

  const badges = useMemo(() => {
    return checkBadges(userProgress, allProblems);
  }, [userProgress, allProblems]);

  const recentSubs = useMemo(() => (recentActivity || []).slice(0, 10), [recentActivity]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <Code2 size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Solved</p>
              <p className="text-xl font-bold text-white">{stats.problemsSolved}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10">
              <Flame size={18} className="text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Streak</p>
              <p className="text-xl font-bold text-white">{stats.currentStreak}d</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10">
              <Zap size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">XP</p>
              <p className="text-xl font-bold text-white">{stats.xp.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10">
              <Trophy size={18} className="text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Level</p>
              <p className="text-xl font-bold text-white">{level}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <Medal size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Rank</p>
              <p className="text-xl font-bold text-white">{rank}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10">
              <Globe size={18} className="text-sky-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Global</p>
              <p className="text-xl font-bold text-white">#{stats.globalRank}</p>
            </div>
          </div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-400" />
            <span className="text-sm text-slate-300">Level {level} Progress</span>
          </div>
          <span className="text-xs text-slate-400">{xp % 500} / 500 XP ({Math.round(levelProgress)}%)</span>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${levelProgress}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">{xpForNext} XP needed for Level {level + 1}</p>
      </div>

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left + Middle */}
        <div className="lg:col-span-2 space-y-6">
          {/* Heatmap */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-300">Contribution Heatmap</h3>
              </div>
              <span className="text-xs text-slate-500">Last 365 days</span>
            </div>
            <div className="overflow-x-auto">
              <div className="flex gap-0.5 min-w-max">
                <div className="flex flex-col gap-0.5 mr-1">
                  {WEEKDAYS.map((day, i) => (
                    <div key={i} className="h-3 text-[8px] leading-3 text-slate-600">{day}</div>
                  ))}
                </div>
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-0.5">
                    {week.map((day, di) => (
                      <div
                        key={di}
                        className={`w-3 h-3 rounded-sm ${getHeatmapColor(day.count, maxHeatmapCount)}`}
                        title={`${day.date}: ${day.count} submissions`}
                      />
                    ))}
                    {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-3 h-3" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 justify-end">
              <span className="text-[10px] text-slate-600">Less</span>
              <div className="w-3 h-3 rounded-sm bg-slate-800/60" />
              <div className="w-3 h-3 rounded-sm bg-emerald-900/40" />
              <div className="w-3 h-3 rounded-sm bg-emerald-700/60" />
              <div className="w-3 h-3 rounded-sm bg-emerald-500/70" />
              <div className="w-3 h-3 rounded-sm bg-emerald-400/80" />
              <span className="text-[10px] text-slate-600">More</span>
            </div>
          </div>

          {/* Weekly Chart */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-300">This Week</h3>
              </div>
              <span className="text-xs text-slate-500">{weeklyData.reduce((s, d) => s + d.count, 0)} submissions</span>
            </div>
            <div className="flex items-end gap-2 h-24">
              {weeklyData.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] text-slate-500">{day.count}</span>
                  <div
                    className="w-full rounded-md bg-gradient-to-t from-amber-500 to-orange-400 transition-all duration-300"
                    style={{ height: `${(day.count / maxWeekly) * 100}%`, minHeight: day.count > 0 ? '4px' : '2px', opacity: day.count > 0 ? 1 : 0.2 }}
                  />
                  <span className="text-[10px] text-slate-600">{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Submissions */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-300">Recent Submissions</h3>
              </div>
              <span className="text-xs text-slate-500">Last 10</span>
            </div>
            <div className="space-y-2">
              {recentSubs.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No submissions yet. Start solving!</p>
              )}
              {recentSubs.map((sub, i) => {
                const problem = sub.problem_id ? allProblems.find(p => p.id === sub.problem_id) : null;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
                    <div>
                      {sub.status === 'Accepted' ? (
                        <CheckCircle size={16} className="text-emerald-400" />
                      ) : (
                        <XCircle size={16} className="text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 truncate font-medium">
                        {problem?.title || sub.title || `Problem #${sub.problemId || sub.problem_id || '?'}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {sub.language && (
                          <span className="inline-flex items-center gap-1 mr-2">
                            <Code2 size={10} />
                            {sub.language}
                          </span>
                        )}
                        <span>{formatDate(sub.created_at)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {sub.status === 'Accepted' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">Accepted</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">{sub.status || 'Failed'}</span>
                      )}
                      {sub.xp_earned > 0 && (
                        <span className="text-xs text-amber-400 flex items-center gap-0.5">
                          <Zap size={10} />+{sub.xp_earned}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Accuracy + Stats */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 text-center">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Accuracy</h3>
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="10" />
                <circle
                  cx="64" cy="64" r="54" fill="none" stroke="url(#accuracyGradient)"
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${accuracyPct * 3.39} 339`}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="accuracyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{accuracyPct}%</p>
                  <p className="text-xs text-slate-500">Acceptance</p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-800/40 rounded-xl p-2">
                <p className="text-lg font-bold text-white">{stats.totalSubmissions}</p>
                <p className="text-[10px] text-slate-500">Submissions</p>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-2">
                <p className="text-lg font-bold text-white">{stats.problemsSolved}</p>
                <p className="text-[10px] text-slate-500">Accepted</p>
              </div>
            </div>
            <div className="mt-3 text-[10px] text-slate-500">
              {acceptedCount} accepted / {stats.totalSubmissions} total submissions
            </div>
          </div>

          {/* Coding Hours & Stats Mini */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/40 rounded-xl p-3 text-center">
                <Clock size={16} className="mx-auto text-slate-400 mb-1" />
                <p className="text-lg font-bold text-white">{stats.totalCodingHours}h</p>
                <p className="text-[10px] text-slate-500">Coding Hours</p>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-3 text-center">
                <Layers size={16} className="mx-auto text-slate-400 mb-1" />
                <p className="text-lg font-bold text-white">{level}</p>
                <p className="text-[10px] text-slate-500">Current Level</p>
              </div>
            </div>
          </div>

          {/* Strong Areas */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star size={16} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-300">Strong Areas</h3>
            </div>
            {strong.length === 0 ? (
              <p className="text-xs text-slate-500">Solve more problems to identify your strengths.</p>
            ) : (
              <div className="space-y-2">
                {strong.slice(0, 5).map((topic, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center gap-2">
                      <BadgeCheck size={14} className="text-emerald-400" />
                      <span className="text-sm text-slate-300">{topic.name}</span>
                    </div>
                    <span className="text-xs text-emerald-400">{topic.solved} solved</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Needs Work */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-red-400" />
              <h3 className="text-sm font-semibold text-slate-300">Needs Work</h3>
            </div>
            {weak.length === 0 ? (
              <p className="text-xs text-slate-500">Keep solving to discover areas for improvement.</p>
            ) : (
              <div className="space-y-2">
                {weak.slice(0, 5).map((topic, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-red-400" />
                      <span className="text-sm text-slate-300">{topic.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-red-400">{topic.solved}/{topic.total}</span>
                      <span className="text-[10px] text-slate-500 ml-1">
                        ({Math.round((topic.accuracy || 0) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Badges & Achievements */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Award size={16} className="text-purple-400" />
              <h3 className="text-sm font-semibold text-slate-300">Badges & Achievements</h3>
            </div>
            {badges.length === 0 ? (
              <p className="text-xs text-slate-500">Earn badges by completing challenges and streaks.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {badges.map((badge, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-colors group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-lg shadow-lg group-hover:scale-110 transition-transform">
                      {badge.icon || '🏆'}
                    </div>
                    <span className="text-[10px] text-slate-400 text-center leading-tight group-hover:text-slate-300 transition-colors">{badge.name}</span>
                  </div>
                ))}
              </div>
            )}
            {badges.length > 0 && (
              <p className="text-[10px] text-slate-500 mt-3 text-center">{badges.length} badge{badges.length !== 1 ? 's' : ''} unlocked</p>
            )}
          </div>

          {/* Coins Earned Today */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
                <Gem size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-amber-400/80">Coins Earned Today</p>
                <p className="text-2xl font-bold text-white">{stats.coinsToday}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-400/60">
              <Sparkles size={12} />
              Complete problems to earn more coins
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillUpDashboard;