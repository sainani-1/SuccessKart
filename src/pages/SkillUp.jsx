import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Trophy, Code2, BarChart3, Flame, Zap, Target } from 'lucide-react';
import { CODING_PROBLEMS } from '../data/codingProblems';
import ProblemList from '../components/coding/ProblemList';
import ProblemDetail from '../components/coding/ProblemDetail';
import SkillUpDashboard from '../components/coding/SkillUpDashboard';
import { getLevelFromXp, generateHeatmapData, calculateStreak } from '../data/skillUpUtils';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'problems', label: 'Problems', icon: Code2 },
  { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
];

const SkillUp = () => {
  const { profile, user } = useAuth();
  const actorId = profile?.id || user?.id || null;
  const [activeTab, setActiveTab] = useState('problems');
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [userProgress, setUserProgress] = useState({
    problemsSolved: 0, currentStreak: 0, longestStreak: 0, xp: 0, coins: 0, level: 1,
    solvedIds: [], totalSubmissions: 0, totalCodingHours: 0, accuracy: 0,
    acceptanceRate: 0, favoriteTopics: [], weakTopics: [], globalRank: 0,
    collegeRank: 0, friendsRank: 0, coinsToday: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const refreshingRef = useRef(false);

  const loadProgress = useCallback(async () => {
    if (!actorId || refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const [progressRes, submissionsRes, solvedRes] = await Promise.all([
        supabase.from('skillup_progress').select('*').eq('user_id', actorId).maybeSingle(),
        supabase.from('skillup_submissions').select('*').eq('user_id', actorId).order('created_at', { ascending: false }).limit(50),
        supabase.from('skillup_submissions').select('problem_id').eq('user_id', actorId).eq('status', 'Accepted'),
      ]);

      if (progressRes.error && progressRes.error.code !== 'PGRST116') throw progressRes.error;

      const skillData = progressRes.data;
      const submissions = submissionsRes.data || [];
      const solvedIds = (solvedRes.data || []).map(s => s.problem_id);

      const dates = submissions.map(s => s.created_at?.split('T')[0]).filter(Boolean);
      const heatmap = generateHeatmapData(dates);
      const streak = calculateStreak(dates);

      let totalSubmissions = submissions.length;
      let totalXp = 0;
      let totalCoins = 0;
      let acceptedCount = 0;
      submissions.forEach(s => {
        if (s.status === 'Accepted') {
          acceptedCount++;
          totalXp += s.xp_earned || 0;
          totalCoins += Math.floor((s.xp_earned || 0) / 2);
        }
      });

      if (skillData) {
        totalXp = skillData.xp || totalXp;
        totalCoins = skillData.coins || totalCoins;
      }

      const today = new Date().toISOString().split('T')[0];
      const coinsToday = submissions
        .filter(s => s.created_at?.startsWith(today) && s.status === 'Accepted')
        .reduce((sum, s) => sum + Math.floor((s.xp_earned || 0) / 2), 0);

      const accuracy = totalSubmissions > 0 ? acceptedCount / totalSubmissions : 0;

      setUserProgress({
        problemsSolved: solvedIds.length,
        currentStreak: streak,
        longestStreak: skillData?.longest_streak || streak,
        xp: totalXp,
        coins: totalCoins,
        level: getLevelFromXp(totalXp),
        solvedIds,
        totalSubmissions,
        totalCodingHours: skillData?.total_coding_hours || 0,
        accuracy,
        acceptanceRate: Math.round(accuracy * 100),
        favoriteTopics: [],
        weakTopics: [],
        globalRank: skillData?.global_rank || 0,
        collegeRank: skillData?.college_rank || 0,
        friendsRank: skillData?.friends_rank || 0,
        coinsToday,
      });

      setRecentActivity(submissions.slice(0, 10));
      setHeatmapData(heatmap);
    } catch (e) {
      console.warn('SkillUp loadProgress error:', e?.message || e);
    } finally {
      refreshingRef.current = false;
      setLoading(false);
    }
  }, [actorId]);

  useEffect(() => {
    if (!actorId) { setLoading(false); return; }
    loadProgress();
  }, [actorId, loadProgress]);

  const handleSubmitProblem = useCallback(async (problemId, result) => {
    if (!actorId) return;
    const problem = CODING_PROBLEMS.find(p => p.id === problemId);
    const passed = result.passed;
    const xpEarned = passed ? (problem?.xpReward || 10) : 2;

    // Optimistic UI update
    if (passed) {
      setUserProgress(prev => {
        if (prev.solvedIds.includes(problemId)) return prev;
        return {
          ...prev,
          problemsSolved: prev.problemsSolved + 1,
          xp: prev.xp + xpEarned,
          coins: prev.coins + Math.floor(xpEarned / 2),
          coinsToday: prev.coinsToday + Math.floor(xpEarned / 2),
          level: getLevelFromXp(prev.xp + xpEarned),
          totalSubmissions: prev.totalSubmissions + 1,
          solvedIds: [...prev.solvedIds, problemId],
        };
      });
    }

    try {
      if (passed) {
        const { data: existing } = await supabase
          .from('skillup_submissions')
          .select('id')
          .eq('user_id', actorId)
          .eq('problem_id', problemId)
          .eq('status', 'Accepted')
          .maybeSingle();

        if (!existing) {
          await supabase.from('skillup_submissions').insert({
            user_id: actorId, problem_id: problemId, status: 'Accepted',
            language: result.language, xp_earned: xpEarned,
            execution_time: result.timeSpent, memory_used: result.memory || 0,
          });
        }
      } else {
        await supabase.from('skillup_submissions').insert({
          user_id: actorId, problem_id: problemId,
          status: result.results?.some(r => r?.status === 'Error') ? 'Error' : 'Wrong Answer',
          language: result.language, xp_earned: 0,
        });
      }

      const today = new Date().toISOString().split('T')[0];
      await supabase.rpc('upsert_skillup_progress', {
        p_user_id: actorId,
        p_xp_earned: passed ? xpEarned : 0,
        p_coins_earned: passed ? Math.floor(xpEarned / 2) : 0,
        p_problem_id: problemId,
        p_passed: passed,
        p_last_active: today,
      }).catch(async () => {
        const { data: cur } = await supabase.from('skillup_progress').select('*').eq('user_id', actorId).maybeSingle();
        const curSolved = new Set(cur?.solved_ids || []);
        if (passed) curSolved.add(problemId);
        const now = new Date().toISOString();
        await supabase.from('skillup_progress').upsert({
          user_id: actorId,
          problems_solved: curSolved.size,
          xp: (cur?.xp || 0) + (passed ? xpEarned : 0),
          coins: (cur?.coins || 0) + (passed ? Math.floor(xpEarned / 2) : 0),
          current_streak: cur?.current_streak || 0,
          longest_streak: cur?.longest_streak || 0,
          total_submissions: (cur?.total_submissions || 0) + 1,
          total_coding_hours: cur?.total_coding_hours || 0,
          solved_ids: [...curSolved],
          last_active: today,
          updated_at: now,
        }, { onConflict: 'user_id' });
      });
    } catch (e) {
      console.warn('SkillUp save failed:', e);
    }
    await loadProgress();
  }, [actorId, loadProgress]);

  const handleSelectProblem = useCallback((id) => {
    setSelectedProblem(id);
  }, []);

  if (selectedProblem) {
    const problem = CODING_PROBLEMS.find(p => p.id === selectedProblem);
    if (!problem) {
      return (
        <div className="p-12 text-center">
          <p className="text-slate-500">Problem not found.</p>
          <button onClick={() => setSelectedProblem(null)} className="mt-4 text-emerald-600 font-semibold">Back to Problems</button>
        </div>
      );
    }
    return (
      <ProblemDetail
        problem={problem}
        onBack={() => { setSelectedProblem(null); loadProgress(); }}
        onSubmit={handleSubmitProblem}
        userProgress={userProgress}
        userId={actorId}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-600 to-orange-700 p-8 rounded-3xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
            <Zap size={36} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Coding Practice</p>
            <h1 className="text-3xl font-bold mt-1">SkillUp Yourself</h1>
            <p className="mt-2 text-amber-100 max-w-2xl">
              Solve 1000+ coding challenges, earn XP, unlock achievements, and climb the leaderboard.
            </p>
          </div>
        </div>
        {userProgress.xp > 0 && (
          <div className="mt-6 flex flex-wrap gap-6">
            <div className="rounded-2xl bg-white/10 backdrop-blur px-5 py-3">
              <p className="text-xs text-amber-200">Level</p>
              <p className="text-2xl font-bold">{userProgress.level}</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur px-5 py-3">
              <p className="text-xs text-amber-200">XP</p>
              <p className="text-2xl font-bold">{userProgress.xp.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur px-5 py-3">
              <p className="text-xs text-amber-200">Solved</p>
              <p className="text-2xl font-bold">{userProgress.problemsSolved}</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur px-5 py-3">
              <p className="text-xs text-amber-200">Streak</p>
              <p className="text-2xl font-bold inline-flex items-center gap-1">{userProgress.currentStreak} <Flame size={20} className="text-orange-300" /></p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {TABS.map(tab => (
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

      {activeTab === 'dashboard' && (
        <SkillUpDashboard
          userProgress={userProgress}
          recentActivity={recentActivity}
          heatmapData={heatmapData}
        />
      )}

      {activeTab === 'problems' && (
        <ProblemList
          problems={CODING_PROBLEMS}
          onSelectProblem={handleSelectProblem}
          userProgress={userProgress}
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
