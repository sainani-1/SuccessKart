import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Trophy, Flame, Users, BarChart3, ShieldAlert } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import AttemptsPanel from '../components/dcs/AttemptsPanel';
import { BADGE_THRESHOLDS, BADGE_LABELS, fetchAllStreaks, runDcsScheduler } from '../utils/dcs';

const AdminTrackDCS = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const teacherId = isAdmin ? null : profile?.id || null;
  const [streaks, setStreaks] = useState([]);
  const [contests, setContests] = useState([]);
  const [stats, setStats] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedContest, setSelectedContest] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [busyUserId, setBusyUserId] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      await runDcsScheduler({ allowGenerate: false });
      const [streakData, contestData] = await Promise.all([
        fetchAllStreaks({ teacherId }),
        supabase
          .from('dcs_contests')
          .select('id, contest_date, title, status, auto_mode, dcs_attempts(id, score)')
          .order('contest_date', { ascending: false })
          .limit(30),
      ]);
      setStreaks(streakData);
      setContests(contestData.data || []);
      setStats(
        (contestData.data || []).map((contest) => {
          const attempts = contest.dcs_attempts || [];
          const scores = attempts.map((a) => Number(a.score || 0));
          return {
            id: contest.id,
            date: contest.contest_date,
            title: contest.title,
            status: contest.status,
            attempts: attempts.length,
            avg: scores.length
              ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
              : 0,
            top: scores.length ? Math.max(...scores) : 0,
          };
        })
      );
      setReloadToken((token) => token + 1);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!selectedContest) {
      setSelectedQuestions([]);
      return;
    }
    let cancelled = false;
    supabase
      .from('dcs_questions')
      .select('id, title, difficulty, position')
      .eq('contest_id', selectedContest.id)
      .order('position', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setSelectedQuestions(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedContest]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return streaks;
    return streaks.filter((row) => {
      const profile = row.profiles || {};
      return [profile.full_name, profile.email, profile.username]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [streaks, search]);

  const totalActive = streaks.filter((row) => Number(row.current_streak || 0) > 0).length;
  const maxStreak = streaks.reduce((max, row) => Math.max(max, Number(row.current_streak || 0)), 0);

  // Confirmed plagiarism: reset the student's streak to zero and leave a
  // plagiarism report in their assigned teacher's queue.
  const breakStreak = async (row) => {
    const student = row.profiles || {};
    const name = student.full_name || student.email || 'this student';
    const current = Number(row.current_streak || 0);
    if (
      !window.confirm(
        current > 0
          ? `Flag ${name} for plagiarism and break their ${current}-day streak?\nA plagiarism report will be created.`
          : `Flag ${name} for plagiarism?\nA plagiarism report will be created (their streak is already 0).`
      )
    ) {
      return;
    }
    setBusyUserId(row.user_id);
    setNotice('');
    try {
      if (current > 0) {
        const { error: streakError } = await supabase
          .from('dcs_streaks')
          .update({ current_streak: 0, badges: [], updated_at: new Date().toISOString() })
          .eq('user_id', row.user_id);
        if (streakError) throw streakError;
      }
      const { error: reportError } = await supabase.from('plagiarism_reports').insert({
        student_id: row.user_id,
        teacher_id: profile?.id || null,
        exam_title: 'Daily Coding Streak',
        suspect_name: student.full_name || null,
        suspect_email: student.email || null,
        reason: 'Plagiarism confirmed — streak broken by teacher.',
        details: current > 0 ? `Streak of ${current} days reset on ${new Date().toLocaleString()}.` : `Flagged on ${new Date().toLocaleString()}.`,
      });
      if (reportError) throw reportError;
      setNotice(
        `${name}: streak ${current > 0 ? 'broken (0 days)' : 'unchanged (already 0)'} and plagiarism report created.`
      );
      await load();
    } catch (err) {
      setNotice(
        err?.message ||
          'Could not complete the action. Apply the 20261012_coding_profile_visibility.sql migration in Supabase so teachers can reset streaks and raise reports.'
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const nextBadge = (streak) =>
    BADGE_THRESHOLDS.find((threshold) => Number(streak || 0) < threshold);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading track DCS…
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 size={24} /> Track DCS
        </h1>
        <p className="text-sm text-slate-500">
          Daily Coding Streak leaderboard and contest participation
          {teacherId ? ' for your assigned students.' : ' across all students.'}
        </p>
      </div>

      {notice ? (
        <div className="text-sm rounded-xl px-4 py-3 border bg-blue-50 border-blue-200 text-blue-700">
          {notice}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-center gap-4">
          <Flame className="text-orange-500" size={32} />
          <div>
            <p className="text-xs font-bold uppercase text-orange-400">Active Streaks</p>
            <p className="text-3xl font-extrabold text-orange-600">{totalActive}</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center gap-4">
          <Trophy className="text-blue-500" size={32} />
          <div>
            <p className="text-xs font-bold uppercase text-blue-400">Longest Streak</p>
            <p className="text-3xl font-extrabold text-blue-600">{maxStreak} days</p>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4">
          <Users className="text-emerald-500" size={32} />
          <div>
            <p className="text-xs font-bold uppercase text-emerald-400">Tracked Users</p>
            <p className="text-3xl font-extrabold text-emerald-600">{streaks.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-bold text-lg">Streak Leaderboard</h2>
          <label className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / email / username"
              className="pl-9 pr-3 py-2 border rounded-lg text-sm w-72"
            />
          </label>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500">No streak data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400 border-b">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Current</th>
                  <th className="py-2 pr-4">Longest</th>
                  <th className="py-2 pr-4">Last Active</th>
                  <th className="py-2 pr-4">Badges</th>
                  <th className="py-2 pr-4">Next Badge</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, index) => {
                  const profile = row.profiles || {};
                  const badges = row.badges || [];
                  const next = nextBadge(row.current_streak);
                  return (
                    <tr key={row.user_id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 text-slate-400">{index + 1}</td>
                      <td className="py-2.5 pr-4">
                        <p className="font-semibold text-slate-800">{profile.full_name || '—'}</p>
                        <p className="text-xs text-slate-400">
                          {profile.email}
                          {profile.username ? ` · ${profile.username}` : ''}
                        </p>
                      </td>
                      <td className="py-2.5 pr-4 font-bold text-orange-600">
                        {row.current_streak || 0}d
                      </td>
                      <td className="py-2.5 pr-4 font-semibold text-blue-600">
                        {row.longest_streak || 0}d
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500">{row.last_activity_date || '—'}</td>
                      <td className="py-2.5 pr-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-gold-50 text-gold-700 border border-gold-200 font-semibold">
                          {badges.length} earned
                        </span>
                      </td>
                      <td className="py-2.5 text-xs text-slate-500">
                        {next ? `${BADGE_LABELS[next]} in ${next - (row.current_streak || 0)} days` : 'Ultimate reached!'}
                      </td>
                      <td className="py-2.5">
                        <button
                          type="button"
                          onClick={() => breakStreak(row)}
                          disabled={busyUserId === row.user_id}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                          title="Flag plagiarism and break the student's streak"
                        >
                          {busyUserId === row.user_id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <ShieldAlert size={13} />
                          )}
                          Flag Plagiarism
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-bold text-lg">Contest Participation</h2>
          <p className="text-xs text-slate-400">Select a row to view student scores and code.</p>
        </div>
        {stats.length === 0 ? (
          <p className="text-sm text-slate-500">No contests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400 border-b">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Contest</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Attempts</th>
                  <th className="py-2 pr-4">Avg Score</th>
                  <th className="py-2">Top Score</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() =>
                      setSelectedContest((current) =>
                        current?.id === row.id
                          ? null
                          : contests.find((contest) => contest.id === row.id) || { id: row.id, contest_date: row.date, title: row.title }
                      )
                    }
                    className={`border-b last:border-0 cursor-pointer hover:bg-slate-50 ${
                      selectedContest?.id === row.id ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <td className="py-2.5 pr-4 font-medium">{row.date}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{row.title || 'Daily Challenge'}</td>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase font-bold">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-semibold">{row.attempts}</td>
                    <td className="py-2.5 pr-4">{row.avg}</td>
                    <td className="py-2.5 font-bold text-emerald-600">{row.top}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>

      {selectedContest ? (
        <AttemptsPanel
          contestId={selectedContest.id}
          questions={selectedQuestions}
          teacherId={teacherId}
          reloadToken={reloadToken}
        />
      ) : null}
    </div>
  );
};

export default AdminTrackDCS;
