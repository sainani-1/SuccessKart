import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Trophy,
  Lock,
  CheckCircle2,
  Clock,
  Code2,
  History,
  Loader2,
  ShieldCheck,
  Flag,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import {
  BADGE_THRESHOLDS,
  BADGE_LABELS,
  DCS_DIFFICULTIES,
  cleanProblemTitle,
  fetchLiveContest,
  fetchDailySchedule,
  fetchStreak,
  fetchMyAttempts,
  scoreFromJudgeResults,
} from '../utils/dcs';

const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';

const pad2 = (value) => String(Math.max(0, value)).padStart(2, '0');

// Daily drop time from the admin's recurring schedule; falls back to 10:00
// when the schedule row is missing or unreadable.
const dropTimeFrom = (schedule) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(schedule?.start_time || ''));
  const drop = new Date();
  if (match) {
    drop.setHours(Number(match[1]), Number(match[2]), 0, 0);
  } else {
    drop.setHours(10, 0, 0, 0);
  }
  return drop.getTime();
};

// Next drop per the admin's schedule: today if it is still ahead, otherwise
// tomorrow. Keeps the countdown meaningful in the evening instead of sitting
// at 00:00:00.
const nextDropMs = (schedule) => {
  const todayDrop = dropTimeFrom(schedule);
  return Date.now() < todayDrop ? todayDrop : todayDrop + 86400000;
};

const dropLabel = (targetMs) => {
  const target = new Date(targetMs);
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const day = sameDay(target, today) ? 'Today' : sameDay(target, tomorrow) ? 'Tomorrow' : target.toLocaleDateString('en-IN', { weekday: 'long' });
  const time = target.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return `${day} at ${time}`;
};

const splitDuration = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
};

// Dark, gold-accented live countdown ("Your daily contest starts in 02 : 59 : 07").
const CountdownCard = ({ targetMs, label, subLabel }) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => tick((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const remaining = targetMs - Date.now();
  const passed = remaining <= 0;
  const { hours, minutes, seconds } = splitDuration(remaining);

  const box = (value, unit) => (
    <div className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center">
      <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-white">{pad2(value)}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{unit}</span>
    </div>
  );
  const colon = <span className="text-2xl font-extrabold text-gold-500 pb-4">:</span>;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
      <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-800">
        <span className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
          <Flame className="text-gold-500" size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-gold-500">{label}</p>
          <p className="text-sm text-slate-300 truncate">
            {passed ? 'Starting shortly… refreshes automatically' : subLabel}
          </p>
        </div>
      </div>
      <div className="px-5 py-5 flex items-center justify-center gap-2 sm:gap-3">
        {box(hours, 'Hours')}
        {colon}
        {box(minutes, 'Mins')}
        {colon}
        {box(seconds, 'Secs')}
      </div>
    </div>
  );
};

const DailyCodingStreak = () => {
  const { user, profile } = useAuth();
  const [streak, setStreak] = useState(null);
  const [contest, setContest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [answers, setAnswers] = useState({});
  const [judgedResults, setJudgedResults] = useState({});
  const [myAttempt, setMyAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [schedule, setSchedule] = useState(null);

  const isAdmin = profile?.role === 'admin';

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [streakData, contestData, attemptData, scheduleData] = await Promise.all([
        fetchStreak(user.id),
        fetchLiveContest(),
        fetchMyAttempts(user.id, 20),
        fetchDailySchedule(),
      ]);
      setStreak(streakData);
      setContest(contestData.contest);
      setQuestions(contestData.questions || []);
      setAttempts(attemptData);
      setSchedule(scheduleData);
      const liveAttempt = (attemptData || []).find(
        (a) => a.contest_id === contestData.contest?.id
      );
      setMyAttempt(liveAttempt || null);
      // Restore the saved code only once: never overwrite what the student is
      // currently typing with the last saved copy.
      if (liveAttempt?.answers) {
        setAnswers((prev) => (Object.keys(prev).length ? prev : liveAttempt.answers));
      }
      // Persisted per-question judge summaries keep the green checks and the
      // score across refreshes.
      const savedResults = {};
      (liveAttempt?.test_results || []).forEach((result) => {
        if (result && result.questionId) savedResults[result.questionId] = result;
      });
      setJudgedResults(savedResults);
      if (contestData.contest?.status !== 'live') setNotice('');
    } catch {
      // keep last known state
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      refresh();
    }, 30000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const groupedQuestions = useMemo(
    () =>
      DCS_DIFFICULTIES.map((level) => ({
        ...level,
        items: questions
          .filter((q) => q.difficulty === level.key)
          .sort((a, b) => (a.position || 0) - (b.position || 0)),
      })).filter((group) => group.items.length > 0),
    [questions]
  );
  const allQuestions = useMemo(() => groupedQuestions.flatMap((group) => group.items), [groupedQuestions]);

  const todayActivity = streak?.last_activity_date === new Date().toLocaleDateString('en-CA');
  const earnedBadges = new Set(streak?.badges || []);
  const liveScore = useMemo(
    () =>
      scoreFromJudgeResults(
        questions,
        Object.entries(judgedResults).map(([questionId, result]) => ({
          questionId,
          accepted: !!result?.accepted,
        }))
      ),
    [questions, judgedResults]
  );

  // The fullscreen workspace (opened in a new tab) runs the judge and saves the
  // attempt; this page refreshes it whenever brought back into focus.
  const flagAttempt = async () => {
    if (!user?.id || !profile?.assigned_teacher_id || !contest?.id) return;
    const { error } = await supabase.from('plagiarism_reports').insert({
      student_id: user.id,
      teacher_id: profile.assigned_teacher_id,
      exam_title: contest.title || 'Daily Coding Streak',
      reason: 'Student flagged a DCS submission for review.',
      details: `Contest ${contest.contest_date}; attempt ${myAttempt?.id || 'current'}`,
    });
    setNotice(error ? error.message : 'Submission sent to your assigned teacher for review.');
  };

  const renderContestBody = () => {
    if (!contest) {
      const dropMs = nextDropMs(schedule);
      return (
        <div className="space-y-4 py-2">
          <CountdownCard
            targetMs={dropMs}
            label="Your daily contest starts in"
            subLabel={`${schedule?.title ? `${schedule.title} — ` : ''}Drops ${dropLabel(dropMs)}`}
          />
          <p className="text-center text-xs text-slate-400">
            No contest is scheduled yet — this page refreshes automatically and the challenge appears the
            moment it goes live.
          </p>
        </div>
      );
    }

    if (contest.status === 'scheduled' || contest.status === 'generating') {
      const startMs = contest.start_at ? new Date(contest.start_at).getTime() : dropTimeFrom(schedule);
      const startsSoon = startMs > Date.now();
      const targetMs = startsSoon ? startMs : nextDropMs(schedule);
      return (
        <div className="space-y-4 py-2">
          <CountdownCard
            targetMs={targetMs}
            label={
              contest.status === 'generating'
                ? 'Preparing today’s questions…'
                : 'Your daily contest starts in'
            }
            subLabel={
              startsSoon
                ? `Starts ${formatTime(contest.start_at)}`
                : `Scheduled for ${formatTime(contest.start_at)} — waiting to go live`
            }
          />
          {contest.status === 'generating' ? (
            <p className="text-center text-xs text-slate-400">
              The question set is being generated — this page refreshes automatically.
            </p>
          ) : null}
        </div>
      );
    }

    if (contest.status === 'live') {
      return (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE
            </span>
            <span className="text-slate-500">Ends {formatTime(contest.end_at)}</span>
          </div>

          {allQuestions.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Code2 className="mx-auto mb-3 text-slate-300" size={40} />
              <p className="font-medium">Questions are still being prepared…</p>
              <p className="text-sm mt-1">Refresh in a moment to see today’s challenge set.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedQuestions.map((group) => {
                const solvedInGroup = group.items.filter(
                  (question) => judgedResults[question.id]?.accepted
                ).length;
                return (
                  <section key={group.key}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
                            group.key === 'hard'
                              ? 'bg-rose-100 text-rose-700 border-rose-200'
                              : group.key === 'medium'
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {group.label}
                        </span>
                        <span className="font-normal text-slate-400">
                          {group.items.length} problems · {group.points} pts each
                        </span>
                      </h3>
                      <span className="text-xs font-semibold text-slate-500">
                        {solvedInGroup}/{group.items.length} solved
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                      {group.items.map((question) => {
                        const solved = !!judgedResults[question.id]?.accepted;
                        const attempted = !!answers[question.id];
                        const topics = Array.isArray(question.topics) ? question.topics.slice(0, 3) : [];
                        return (
                          <a
                            key={question.id}
                            href={`/dcs/problem/${question.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in a new tab — fullscreen LeetCode-style workspace"
                            className="group flex items-center gap-3 sm:gap-4 px-4 py-3 transition hover:bg-gold-50/70"
                          >
                            <span
                              className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold ${
                                solved
                                  ? 'bg-emerald-100 text-emerald-600'
                                  : attempted
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {solved ? (
                                <CheckCircle2 size={18} />
                              ) : attempted ? (
                                <Code2 size={17} />
                              ) : (
                                question.position || '—'
                              )}
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-800 group-hover:text-nani-dark truncate">
                                {cleanProblemTitle(question.title)}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {topics.map((topic) => (
                                  <span
                                    key={topic}
                                    className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-500"
                                  >
                                    {topic}
                                  </span>
                                ))}
                                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gold-100 text-amber-700">
                                  {group.points} pts
                                </span>
                              </div>
                            </div>

                            <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 group-hover:text-slate-700 transition">
                              Open
                              <ExternalLink size={13} />
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-800 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5">
              <Trophy size={15} className="text-gold-500" /> Score: {liveScore} pts
            </span>
            <span className="text-sm text-slate-500">
              {allQuestions.filter((question) => judgedResults[question.id]?.accepted).length}/{allQuestions.length} solved
            </span>
            {myAttempt && myAttempt.submission_status !== 'accepted' && profile?.assigned_teacher_id ? (
              <button onClick={flagAttempt} className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700">
                <Flag size={13} /> Flag for teacher review
              </button>
            ) : null}
            {notice ? (
              <span
                className={`text-sm font-medium ${
                  /not accepted|could not|write code/i.test(notice) ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {notice}
              </span>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-10 text-slate-500">
        <CheckCircle2 className="mx-auto mb-3 text-slate-400" size={40} />
        <p className="font-medium text-slate-700">Today’s contest has ended.</p>
        {myAttempt ? (
          <div className="mt-4 mx-auto max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <CheckCircle2 size={18} /> Completed successfully
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <div>
                <p className="text-xs text-emerald-600 uppercase font-semibold">Score</p>
                <p className="font-extrabold text-slate-900">{myAttempt.score} points</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600 uppercase font-semibold">Completed at</p>
                <p className="font-semibold text-slate-800">{formatTime(myAttempt.completed_at || myAttempt.updated_at)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 mx-auto max-w-md rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            You did not attempt it today — your streak has reset.
          </div>
        )}
        <p className="text-xs mt-4">Come back tomorrow for the next challenge.</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading daily coding streak…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Flame className="text-orange-500" size={26} /> Daily Coding Streak
          </h1>
          <p className="text-sm text-slate-500">
            Code every day. Never miss a day. Unlock streak badges.
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Link
              to="/app/admin/dcs-setup"
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700"
            >
              Setup Contest
            </Link>
            <Link
              to="/app/admin/track-dcs"
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold hover:bg-slate-50"
            >
              Track DCS
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-center gap-4">
          <Flame className="text-orange-500" size={36} />
          <div>
            <p className="text-xs font-bold text-orange-400 uppercase">Current Streak</p>
            <p className="text-3xl font-extrabold text-orange-600">
              {streak?.current_streak || 0} days
            </p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center gap-4">
          <Trophy className="text-blue-500" size={36} />
          <div>
            <p className="text-xs font-bold text-blue-400 uppercase">Longest Streak</p>
            <p className="text-3xl font-extrabold text-blue-600">
              {streak?.longest_streak || 0} days
            </p>
          </div>
        </div>
        <div
          className={`border rounded-2xl p-5 flex items-center gap-4 ${
            todayActivity
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          {todayActivity ? (
            <CheckCircle2 className="text-emerald-500" size={36} />
          ) : (
            <Clock className="text-slate-400" size={36} />
          )}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Today</p>
            <p
              className={`text-xl font-extrabold ${
                todayActivity ? 'text-emerald-600' : 'text-slate-500'
              }`}
            >
              {todayActivity ? 'Practiced ✓' : 'Not practiced yet'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <ShieldCheck size={18} /> Streak Badges
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {BADGE_THRESHOLDS.map((threshold) => {
            const earned = earnedBadges.has(threshold);
            return (
              <div
                key={threshold}
                className={`rounded-xl border p-3 text-center ${
                  earned
                    ? 'bg-gradient-to-b from-gold-50 to-white border-gold-300'
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
                title={BADGE_LABELS[threshold]}
              >
                {earned ? (
                  <Trophy className="mx-auto text-gold-500" size={22} />
                ) : (
                  <Lock className="mx-auto text-slate-400" size={20} />
                )}
                <p className="text-sm font-bold mt-1 text-slate-800">
                  {threshold === 900 ? 'Ultimate' : `${threshold} Days`}
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                  {earned ? 'Earned' : 'Locked'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Code2 size={18} />
          Today’s Challenge
          {contest?.title ? <span className="font-normal text-slate-500">— {contest.title}</span> : null}
        </h2>
        {renderContestBody()}
      </div>

      <div className="bg-white border rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <History size={18} /> Recent Attempts
        </h2>
        {attempts.length === 0 ? (
          <p className="text-sm text-slate-500">No attempts yet. Solve today’s challenge!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400 border-b">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Contest</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Completed at</th>
                  <th className="py-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 font-medium">
                      {attempt.dcs_contests?.contest_date || '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">
                      {attempt.dcs_contests?.title || 'Daily Challenge'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">
                        {attempt.dcs_contests?.status || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600 whitespace-nowrap">
                      {formatTime(attempt.completed_at || attempt.updated_at) || '—'}
                    </td>
                    <td className="py-2.5 font-bold text-slate-800">{attempt.score} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyCodingStreak;
