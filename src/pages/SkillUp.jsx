import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Trophy, Code2, BarChart3, Flame, Zap, Target, Gem, Sparkles, Award, Route, Star, CheckCircle, Sparkle, BadgeCheck } from 'lucide-react';
import { CODING_PROBLEMS, DIFFICULTY_XP } from '../data/codingProblems';
import ProblemList from '../components/coding/ProblemList';
import ProblemDetail from '../components/coding/ProblemDetail';
import SkillUpDashboard from '../components/coding/SkillUpDashboard';
import { getLevelFromXp, generateHeatmapData, calculateStreak, checkBadges } from '../data/skillUpUtils';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import PremiumPlusUpgradeGate from '../components/PremiumPlusUpgradeGate';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'problems', label: 'Problems', icon: Code2 },
  { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
];

const COINS_MAP = [5, 10, 15, 15, 20, 25, 35, 40, 50, 60];
const STORAGE_KEY_PREFIX = 'skillup_state_v2_';
const LEGACY_CACHE_PREFIX = 'skillup_progress_cache_';
const LEGACY_SOLVED_PREFIX = 'skillup_solved_ids_';

const EMPTY_PROGRESS = {
  problemsSolved: 0,
  currentStreak: 0,
  longestStreak: 0,
  xp: 0,
  coins: 0,
  level: 1,
  solvedIds: [],
  totalSubmissions: 0,
  totalCodingHours: 0,
  accuracy: 0,
  acceptanceRate: 0,
  favoriteTopics: [],
  weakTopics: [],
  globalRank: 0,
  collegeRank: 0,
  friendsRank: 0,
  coinsToday: 0,
  submissions: [],
};

const getDifficultyLevelId = (difficulty) => {
  const map = {
    'Very Easy': 0,
    Easy: 1,
    Basic: 2,
    Beginner: 3,
    Intermediate: 4,
    Advanced: 5,
    Expert: 6,
    Hard: 7,
    'Very Hard': 8,
    'Competitive Programming': 9,
  };
  return map[difficulty] ?? 0;
};

const getProblemById = (id) => CODING_PROBLEMS.find((problem) => problem.id === id) || null;

const getStorageIds = (...ids) => [...new Set(ids.filter(Boolean))];

const readJson = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeJson = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
};

const readLegacyState = (profileId, userId, actorId) => {
  if (typeof window === 'undefined') return null;
  const ids = getStorageIds(actorId, profileId, userId);
  let merged = null;

  for (const id of ids) {
    const cache = readJson(`${LEGACY_CACHE_PREFIX}${id}`);
    const solvedIds = readJson(`${LEGACY_SOLVED_PREFIX}${id}`);
    if (!cache && !solvedIds) continue;

    const next = cache?.userProgress ? { ...cache.userProgress } : {};
    if (Array.isArray(cache?.recentActivity)) next.submissions = cache.recentActivity;
    if (Array.isArray(cache?.heatmapData)) next.heatmapData = cache.heatmapData;
    const candidates = [
      ...(Array.isArray(next.solvedIds) ? next.solvedIds : []),
      ...(Array.isArray(cache?.localSolvedIds) ? cache.localSolvedIds : []),
      ...(Array.isArray(cache?.sessionSolvedIds) ? cache.sessionSolvedIds : []),
      ...(Array.isArray(solvedIds) ? solvedIds : []),
    ];
    next.solvedIds = [...new Set(candidates.map(Number).filter(Number.isFinite))];
    merged = mergeProgressSnapshots(merged || EMPTY_PROGRESS, next);
  }

  return merged;
};

const uniqSubmissions = (submissions = []) => {
  const seen = new Set();
  const result = [];
  for (const submission of submissions) {
    if (!submission) continue;
    const key = submission.id
      ? `id:${submission.id}`
      : `${submission.problem_id ?? submission.problemId ?? 'x'}|${submission.status ?? 'x'}|${submission.created_at ?? submission.timestamp ?? 'x'}|${submission.language ?? 'x'}|${submission.xp_earned ?? 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(submission);
  }
  return result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
};

const normalizeIdList = (ids = []) => [...new Set(ids.map(Number).filter(Number.isFinite))];

const getCoinValueForProblem = (problemId) => {
  const problem = getProblemById(problemId);
  const diffIdx = getDifficultyLevelId(problem?.difficulty || 'Very Easy');
  return COINS_MAP[diffIdx] || 5;
};

const normalizeProgress = (progress = EMPTY_PROGRESS) => {
  const submissions = uniqSubmissions(progress.submissions || []);
  const solvedFromSubmissions = submissions
    .filter((item) => item?.status === 'Accepted' && item?.problem_id)
    .map((item) => Number(item.problem_id))
    .filter(Number.isFinite);
  const solvedIds = normalizeIdList([...(progress.solvedIds || []), ...solvedFromSubmissions]);
  const acceptedSubmissions = submissions.filter((item) => item?.status === 'Accepted');
  const acceptedCount = acceptedSubmissions.length;
  const totalSubmissions = Math.max(Number(progress.totalSubmissions || 0), submissions.length);
  const acceptedDates = acceptedSubmissions.map((item) => item.created_at).filter(Boolean);
  const computedStreak = calculateStreak(acceptedDates);
  const currentStreak = Math.max(Number(progress.currentStreak || 0), computedStreak);
  const longestStreak = Math.max(Number(progress.longestStreak || 0), currentStreak);
  const computedXp = acceptedSubmissions.reduce((sum, item) => sum + Number(item.xp_earned || 0), 0);
  const xp = Math.max(Number(progress.xp || 0), computedXp);
  const computedCoins = acceptedSubmissions.reduce((sum, item) => sum + getCoinValueForProblem(item.problem_id), 0);
  const coins = Math.max(Number(progress.coins || 0), computedCoins);
  const todayKey = new Date().toISOString().slice(0, 10);
  const coinsToday = acceptedSubmissions
    .filter((item) => item.created_at?.startsWith(todayKey))
    .reduce((sum, item) => sum + getCoinValueForProblem(item.problem_id), 0);
  const accuracy = totalSubmissions > 0 ? acceptedCount / totalSubmissions : 0;

  return {
    ...EMPTY_PROGRESS,
    ...progress,
    solvedIds,
    problemsSolved: Math.max(Number(progress.problemsSolved || 0), solvedIds.length),
    currentStreak,
    longestStreak,
    xp,
    coins,
    level: getLevelFromXp(xp),
    totalSubmissions,
    totalCodingHours: Number(progress.totalCodingHours || 0),
    accuracy,
    acceptanceRate: Math.round(accuracy * 100),
    coinsToday,
    submissions,
    recentActivity: submissions.slice(0, 10),
    heatmapData: generateHeatmapData(submissions),
  };
};

const mergeProgressSnapshots = (base, incoming) => {
  const left = normalizeProgress(base || EMPTY_PROGRESS);
  const right = normalizeProgress(incoming || EMPTY_PROGRESS);
  const mergedSubmissions = uniqSubmissions([...(left.submissions || []), ...(right.submissions || [])]);
  const merged = normalizeProgress({
    ...left,
    ...right,
    solvedIds: normalizeIdList([...(left.solvedIds || []), ...(right.solvedIds || [])]),
    submissions: mergedSubmissions,
    problemsSolved: Math.max(left.problemsSolved || 0, right.problemsSolved || 0),
    currentStreak: Math.max(left.currentStreak || 0, right.currentStreak || 0),
    longestStreak: Math.max(left.longestStreak || 0, right.longestStreak || 0),
    xp: Math.max(left.xp || 0, right.xp || 0),
    coins: Math.max(left.coins || 0, right.coins || 0),
    totalSubmissions: Math.max(left.totalSubmissions || 0, right.totalSubmissions || 0, mergedSubmissions.length),
    totalCodingHours: Math.max(left.totalCodingHours || 0, right.totalCodingHours || 0),
    globalRank: left.globalRank || right.globalRank || 0,
    collegeRank: left.collegeRank || right.collegeRank || 0,
    friendsRank: left.friendsRank || right.friendsRank || 0,
  });
  return merged;
};

const buildLocalKey = (actorId) => `${STORAGE_KEY_PREFIX}${actorId}`;

const readLocalSnapshot = (profileId, userId, actorId) => {
  if (typeof window === 'undefined' || !actorId) return null;
  const ids = getStorageIds(actorId, profileId, userId);
  for (const id of ids) {
    const current = readJson(buildLocalKey(id));
    if (current) return normalizeProgress(current);
  }
  return readLegacyState(profileId, userId, actorId);
};

const writeLocalSnapshot = (profileId, userId, actorId, progress) => {
  if (!actorId) return;
  const ids = getStorageIds(actorId, profileId, userId);
  const payload = normalizeProgress(progress);
  for (const id of ids) {
    writeJson(buildLocalKey(id), payload);
    writeJson(`${LEGACY_CACHE_PREFIX}${id}`, {
      savedAt: Date.now(),
      userProgress: payload,
      recentActivity: payload.recentActivity || [],
      heatmapData: payload.heatmapData || [],
    });
    writeJson(`${LEGACY_SOLVED_PREFIX}${id}`, payload.solvedIds || []);
  }
};

const emptyProgress = () => normalizeProgress(EMPTY_PROGRESS);

const SkillUp = () => {
  const { profile, user, isPremiumPlus } = useAuth();
  const actorId = profile?.id || user?.id || null;
  const hasAccess = isPremiumPlus(profile);
  const totalQuestions = CODING_PROBLEMS.length;
  const codingStartRef = useRef(Date.now());
  const loadSeqRef = useRef(0);
  const mountedRef = useRef(true);
  const [activeTab, setActiveTab] = useState('problems');
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [progress, setProgress] = useState(() => emptyProgress());
  const [badgeNotifications, setBadgeNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const solvedSet = useMemo(() => new Set(progress.solvedIds || []), [progress.solvedIds]);

  const displayProgress = useMemo(() => normalizeProgress(progress), [progress]);
  const recentActivity = useMemo(() => displayProgress.recentActivity || [], [displayProgress]);
  const heatmapData = useMemo(() => displayProgress.heatmapData || [], [displayProgress]);

  const persistProgress = useCallback((nextProgress) => {
    const normalized = normalizeProgress(nextProgress);
    setProgress(normalized);
    writeLocalSnapshot(profile?.id, user?.id, actorId, normalized);
  }, [actorId, profile?.id, user?.id]);

  const hydrateFromServer = useCallback(async () => {
    if (!actorId) {
      setLoading(false);
      return;
    }

    const seq = ++loadSeqRef.current;
    setLoading(true);
    try {
      const localSnapshot = readLocalSnapshot(profile?.id, user?.id, actorId) || emptyProgress();
      if (mountedRef.current) {
        setProgress(localSnapshot);
      }

      const [progressRes, submissionsRes] = await Promise.all([
        supabase.from('skillup_progress').select('*').eq('user_id', actorId).maybeSingle(),
        supabase.from('skillup_submissions').select('*').eq('user_id', actorId).order('created_at', { ascending: false }).limit(250),
      ]);

      if (progressRes.error && progressRes.error.code !== 'PGRST116') throw progressRes.error;
      if (submissionsRes.error) throw submissionsRes.error;

      const serverProgress = progressRes.data || {};
      const serverSubmissions = submissionsRes.data || [];
      const serverSnapshot = normalizeProgress({
        problemsSolved: Number(serverProgress.problems_solved || 0),
        currentStreak: Number(serverProgress.current_streak || 0),
        longestStreak: Number(serverProgress.longest_streak || 0),
        xp: Number(serverProgress.xp || 0),
        coins: Number(serverProgress.coins || 0),
        solvedIds: Array.isArray(serverProgress.solved_ids) ? serverProgress.solved_ids : [],
        totalSubmissions: Number(serverProgress.total_submissions || serverSubmissions.length || 0),
        totalCodingHours: Number(serverProgress.total_coding_hours || 0),
        globalRank: Number(serverProgress.global_rank || 0),
        collegeRank: Number(serverProgress.college_rank || 0),
        friendsRank: Number(serverProgress.friends_rank || 0),
        submissions: serverSubmissions,
      });

      const merged = mergeProgressSnapshots(localSnapshot, serverSnapshot);
      if (mountedRef.current && seq === loadSeqRef.current) {
        setProgress(merged);
        writeLocalSnapshot(profile?.id, user?.id, actorId, merged);
      }
    } catch (error) {
      console.warn('SkillUp hydration failed:', error?.message || error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [actorId, profile?.id, user?.id]);

  useEffect(() => {
    if (!actorId) {
      setProgress(emptyProgress());
      setLoading(false);
      return;
    }
    hydrateFromServer();
  }, [actorId, hydrateFromServer]);

  const handleSubmitProblem = useCallback(async (payloadOrProblemId, maybeResult) => {
    if (!actorId) return;

    const payload = (payloadOrProblemId && typeof payloadOrProblemId === 'object' && !Array.isArray(payloadOrProblemId))
      ? payloadOrProblemId
      : { problemId: payloadOrProblemId, ...(maybeResult || {}) };

    const problemId = Number(payload.problemId);
    const problem = getProblemById(problemId);
    const passed = Boolean(payload.passed);
    const status = passed ? 'Accepted' : (payload.results?.some((item) => item?.status === 'Error') ? 'Error' : 'Wrong Answer');
    const alreadySolved = solvedSet.has(problemId);
    const xpEarned = passed && !alreadySolved ? (DIFFICULTY_XP[problem?.difficulty]?.xp || problem?.xpReward || 10) : 0;
    const coinEarned = passed && !alreadySolved ? (COINS_MAP[getDifficultyLevelId(problem?.difficulty || 'Very Easy')] || 5) : 0;
    const now = new Date().toISOString();
    const sessionMinutes = (Date.now() - codingStartRef.current) / 60000;
    codingStartRef.current = Date.now();

    const submission = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: actorId,
      problem_id: problemId,
      status,
      language: payload.language || 'python',
      xp_earned: xpEarned,
      execution_time: payload.timeSpent || 0,
      memory_used: payload.memory || 0,
      created_at: now,
    };

    const nextProgress = normalizeProgress({
      ...progress,
      solvedIds: passed && !alreadySolved ? [...progress.solvedIds, problemId] : progress.solvedIds,
      problemsSolved: passed && !alreadySolved ? progress.problemsSolved + 1 : progress.problemsSolved,
      xp: progress.xp + xpEarned,
      coins: progress.coins + coinEarned,
      totalSubmissions: progress.totalSubmissions + 1,
      totalCodingHours: Number(progress.totalCodingHours || 0) + (sessionMinutes / 60),
      currentStreak: passed ? Math.max(progress.currentStreak || 0, calculateStreak([...(recentActivity || []).map((item) => item.created_at), now])) : progress.currentStreak,
      longestStreak: Math.max(progress.longestStreak || 0, progress.currentStreak || 0),
      coinsToday: progress.coinsToday + coinEarned,
      submissions: [submission, ...(progress.submissions || [])],
    });

    const prevBadges = checkBadges(displayProgress, CODING_PROBLEMS);
    const nextBadges = checkBadges(nextProgress, CODING_PROBLEMS);
    const newBadges = nextBadges.filter((badge) => !prevBadges.find((prev) => prev.id === badge.id));

    persistProgress(nextProgress);

    if (newBadges.length > 0) {
      setBadgeNotifications((prev) => [...prev, ...newBadges]);
      window.setTimeout(() => setBadgeNotifications([]), 4500);
    }

    setSyncing(true);
    try {
      const submissionRes = await supabase.from('skillup_submissions').insert({
        user_id: actorId,
        problem_id: problemId,
        status,
        language: submission.language,
        xp_earned: xpEarned,
        execution_time: submission.execution_time,
        memory_used: submission.memory_used,
      });
      if (submissionRes.error) throw submissionRes.error;

      const progressRes = await supabase.rpc('upsert_skillup_progress', {
        p_user_id: actorId,
        p_xp_earned: xpEarned,
        p_coins_earned: coinEarned,
        p_problem_id: problemId,
        p_passed: passed,
        p_last_active: now.slice(0, 10),
        p_session_minutes: sessionMinutes,
      });
      if (progressRes.error) throw progressRes.error;
    } catch (error) {
      console.warn('SkillUp save failed:', error?.message || error);
    } finally {
      setSyncing(false);
      hydrateFromServer();
    }
  }, [actorId, displayProgress, hydrateFromServer, persistProgress, progress, recentActivity, solvedSet]);

  const handleSelectProblem = useCallback((id) => {
    setSelectedProblem(id);
  }, []);

  const heroBadges = useMemo(() => [
    'Instant solved ticks',
    'Live dashboard updates',
    'Beginner to Expert',
    '38K+ generated questions',
  ], []);

  if (!hasAccess) {
    return (
      <PremiumPlusUpgradeGate
        profile={profile}
        title="Premium Plus Required"
        message="SkillUp coding challenges with 38,000+ unique problems is a Premium Plus feature. Upgrade to unlock the full coding practice platform."
        inline={true}
      />
    );
  }

  if (selectedProblem) {
    const problem = getProblemById(selectedProblem);
    if (!problem) {
      return (
        <div className="p-12 text-center">
          <p className="text-slate-500">Problem not found.</p>
          <button onClick={() => setSelectedProblem(null)} className="mt-4 text-emerald-600 font-semibold">
            Back to Problems
          </button>
        </div>
      );
    }

    return (
      <ProblemDetail
        problem={problem}
        onBack={() => setSelectedProblem(null)}
        onSubmit={handleSubmitProblem}
        userProgress={displayProgress}
        userId={actorId}
        allProblems={CODING_PROBLEMS}
        onSelectProblem={handleSelectProblem}
      />
    );
  }

  return (
    <div className="space-y-6 relative">
      {badgeNotifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {badgeNotifications.map((badge, index) => (
            <div key={`${badge.id}-${index}`} className="bg-gradient-to-r from-amber-500/95 to-orange-500/95 backdrop-blur-xl border border-amber-300/40 rounded-2xl p-4 shadow-2xl flex items-center gap-3 min-w-[280px]">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                {badge.icon || '🏆'}
              </div>
              <div>
                <p className="text-sm font-bold text-white">Achievement Unlocked</p>
                <p className="text-xs text-amber-100">{badge.name}</p>
              </div>
              <Sparkles size={20} className="text-yellow-200 animate-pulse ml-auto" />
            </div>
          ))}
        </div>
      )}

      <div className="relative overflow-hidden rounded-[2rem] border border-amber-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 md:p-8 shadow-2xl">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(251,191,36,0.25), transparent 30%), radial-gradient(circle at 80% 10%, rgba(16,185,129,0.18), transparent 25%), radial-gradient(circle at 70% 80%, rgba(249,115,22,0.16), transparent 28%)' }} />
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                <Route size={12} />
                SkillUp Rebuilt
              </div>
              <h1 className="mt-4 text-3xl md:text-5xl font-black text-white leading-tight">
                Train from basic to expert with a clean 38K+ problem engine.
              </h1>
              <p className="mt-3 max-w-2xl text-sm md:text-base text-slate-300">
                Accepted submissions now update your solved tick, summary cards, and dashboard immediately, then sync back to storage without wiping your progress.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-0 lg:w-[380px]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Total Questions</p>
                <p className="mt-1 text-2xl font-bold text-white">{totalQuestions.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Solved</p>
                <p className="mt-1 text-2xl font-bold text-emerald-300">{displayProgress.problemsSolved}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Level</p>
                <p className="mt-1 text-2xl font-bold text-white">{displayProgress.level}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Streak</p>
                <p className="mt-1 text-2xl font-bold text-white inline-flex items-center gap-1">
                  {displayProgress.currentStreak}
                  <Flame size={18} className="text-orange-300" />
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {heroBadges.map((item) => (
              <span key={item} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-amber-100/90">
                <BadgeCheck size={12} />
                {item}
              </span>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-400">XP</p>
              <p className="mt-1 text-2xl font-bold text-white">{displayProgress.xp.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-400">Coins</p>
              <p className="mt-1 text-2xl font-bold text-white">{displayProgress.coins.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-400">Acceptance</p>
              <p className="mt-1 text-2xl font-bold text-white">{displayProgress.acceptanceRate}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-400">Today</p>
              <p className="mt-1 text-2xl font-bold text-white">{displayProgress.coinsToday}</p>
            </div>
          </div>

          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-500 transition-all duration-700"
              style={{ width: `${Math.min(100, Math.round((displayProgress.problemsSolved / totalQuestions) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-semibold transition ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 border border-b-white border-slate-200 -mb-[3px] shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
          Syncing your solved problems and dashboard...
          {syncing ? ' Saving latest submission...' : ''}
        </div>
      )}

      {activeTab === 'dashboard' && (
        <SkillUpDashboard
          userProgress={displayProgress}
          recentActivity={recentActivity}
          heatmapData={heatmapData}
        />
      )}

      {activeTab === 'problems' && (
        <ProblemList
          problems={CODING_PROBLEMS}
          onSelectProblem={handleSelectProblem}
          userProgress={displayProgress}
          allProblems={CODING_PROBLEMS}
        />
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm">
          <Target size={48} className="mx-auto text-amber-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Leaderboard Coming Soon</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Global, college, and friends rankings will appear here as more students join the challenge.
          </p>
        </div>
      )}
    </div>
  );
};

export default SkillUp;
