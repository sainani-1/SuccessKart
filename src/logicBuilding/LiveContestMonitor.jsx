import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Activity, Eye, EyeOff, RefreshCw, Search, Trophy, Clock, Code2, User, Filter, ChevronDown, ChevronUp, Zap, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { weeklyContest, isContestActive, getWeekKey } from './contestModel';
import { DIFFICULTY_CONFIG } from './generateQuestions';
import LoadingSpinner from '../components/LoadingSpinner';

const REFRESH_INTERVAL = 3000;

function LiveIndicator({ active }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
      <span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
      {active ? 'LIVE' : 'OFFLINE'}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color, pulse }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`text-2xl font-black ${pulse ? 'text-emerald-600' : 'text-slate-950'}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function SubmissionRow({ submission, questions, expanded, onToggle }) {
  const [showCode, setShowCode] = useState(false);
  const solved = submission.solved || {};
  const solvedCount = Object.keys(solved).filter(k => solved[k]).length;
  const totalQuestions = questions.length;
  const solvedList = Object.keys(solved).filter(k => solved[k]);

  return (
    <tr
      className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
      onClick={onToggle}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
            {(submission.username || submission.name || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{submission.username || submission.name || 'Unknown'}</p>
            <p className="text-xs text-slate-500">{submission.email || submission.user_id || ''}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-sm font-bold text-amber-700">
          <Trophy size={14} />
          {submission.score || 0}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-16 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${totalQuestions > 0 ? (solvedCount / totalQuestions) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-slate-700">{solvedCount}/{totalQuestions}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        {submission.complexity_label ? (
          <span className="inline-flex rounded-full bg-purple-50 px-2 py-1 text-xs font-bold text-purple-700">
            {submission.complexity_label}
          </span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-slate-600">
        {submission.last_solved_at ? new Date(submission.last_solved_at).toLocaleTimeString() : '-'}
      </td>
      <td className="px-4 py-3">
        {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </td>

      {expanded && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-slate-50">
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Solved Questions</h4>
                {solvedList.length === 0 ? (
                  <p className="text-sm text-slate-400">No questions solved yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {solvedList.map((qTitle) => {
                      const q = questions.find(qu => qu.title === qTitle);
                      const cfg = q ? DIFFICULTY_CONFIG[q.difficulty] : null;
                      return (
                        <span
                          key={qTitle}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white"
                          style={{ background: cfg?.color || '#6366f1' }}
                        >
                          {cfg?.label || '?'}: {qTitle}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {submission.code && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Last Submitted Code</h4>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowCode(!showCode); }}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300"
                    >
                      {showCode ? <EyeOff size={12} /> : <Eye size={12} />}
                      {showCode ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {showCode && (
                    <pre className="rounded-lg bg-slate-900 text-slate-100 p-4 text-xs overflow-x-auto max-h-48 font-mono">
                      {submission.code}
                    </pre>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="rounded-lg bg-white border border-slate-200 p-3">
                  <p className="font-semibold text-slate-500">User ID</p>
                  <p className="font-bold text-slate-900 truncate">{submission.user_id || submission.id || '-'}</p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-3">
                  <p className="font-semibold text-slate-500">First Solved</p>
                  <p className="font-bold text-slate-900">{submission.first_solved_at ? new Date(submission.first_solved_at).toLocaleString() : '-'}</p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-3">
                  <p className="font-semibold text-slate-500">Last Solved</p>
                  <p className="font-bold text-slate-900">{submission.last_solved_at ? new Date(submission.last_solved_at).toLocaleString() : '-'}</p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-3">
                  <p className="font-semibold text-slate-500">Complexity Score</p>
                  <p className="font-bold text-slate-900">{submission.complexity_score || 0}</p>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </tr>
  );
}

export default function LiveContestMonitor() {
  const [allScores, setAllScores] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [contestActive, setContestActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterQuestion, setFilterQuestion] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortField, setSortField] = useState('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadData = useCallback(async () => {
    try {
      await weeklyContest.load();
      setQuestions(weeklyContest.questions || []);
      const active = await isContestActive();
      setContestActive(active);
    } catch (e) {
      console.error('Failed to load contest config', e);
    }
  }, []);

  useEffect(() => {
    loadData();
    const loadInterval = setInterval(loadData, 30000);

    let unsubscribe = null;
    const scoresQuery = query(collection(db, 'logicBuildingScores'));
    unsubscribe = onSnapshot(scoresQuery, (snap) => {
      const rows = [];
      snap.forEach(doc => rows.push({ id: doc.id, ...doc.data() }));
      setAllScores(rows);
      setLastUpdate(new Date());
      setLoading(false);
    }, (err) => {
      console.error('Real-time scores listener error', err);
      setLoading(false);
    });

    return () => {
      clearInterval(loadInterval);
      if (unsubscribe) unsubscribe();
    };
  }, [loadData]);

  const enrichedScores = useMemo(() => {
    return allScores.map(s => {
      const solved = s.solved || {};
      const solvedCount = Object.keys(solved).filter(k => solved[k]).length;
      const solvedList = Object.keys(solved).filter(k => solved[k]);
      return { ...s, solvedCount, solvedList };
    });
  }, [allScores]);

  const filteredScores = useMemo(() => {
    let result = enrichedScores;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        (s.username || '').toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.user_id || '').toLowerCase().includes(q)
      );
    }

    if (filterQuestion) {
      result = result.filter(s => s.solved && s.solved[filterQuestion]);
    }

    result.sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case 'score':
          valA = Number(a.score) || 0;
          valB = Number(b.score) || 0;
          break;
        case 'solved':
          valA = a.solvedCount || 0;
          valB = b.solvedCount || 0;
          break;
        case 'time':
          valA = a.last_solved_at ? new Date(a.last_solved_at).getTime() : 0;
          valB = b.last_solved_at ? new Date(b.last_solved_at).getTime() : 0;
          break;
        case 'name':
          valA = (a.username || a.name || '').toLowerCase();
          valB = (b.username || b.name || '').toLowerCase();
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        default:
          valA = Number(a.score) || 0;
          valB = Number(b.score) || 0;
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [enrichedScores, search, filterQuestion, sortField, sortAsc]);

  const stats = useMemo(() => {
    const totalSubmissions = enrichedScores.length;
    const totalSolved = enrichedScores.reduce((sum, s) => sum + (s.solvedCount || 0), 0);
    const topScore = enrichedScores.length > 0
      ? Math.max(...enrichedScores.map(s => Number(s.score) || 0))
      : 0;
    const activeUsers = enrichedScores.filter(s => {
      if (!s.last_solved_at) return false;
      const diff = Date.now() - new Date(s.last_solved_at).getTime();
      return diff < 10 * 60 * 1000;
    }).length;
    return { totalSubmissions, totalSolved, topScore, activeUsers };
  }, [enrichedScores]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading live contest monitor..." />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-700 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
              <Activity size={14} />
              Live Contest Monitor
            </div>
            <h1 className="mt-3 text-3xl font-black">Real-Time Submissions</h1>
            <p className="mt-2 text-sm text-emerald-100">
              Watch every submission, score, and question solve in real-time.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <LiveIndicator active={contestActive} />
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${contestActive ? 'bg-emerald-500/20 text-emerald-100' : 'bg-white/10 text-white/70'}`}>
                {weeklyContest.day} {weeklyContest.startTime} - {weeklyContest.endTime}
              </span>
              <span className="text-xs text-emerald-200">
                Week: {getWeekKey(new Date())}
              </span>
            </div>
          </div>
          <div className="text-right">
            {lastUpdate && (
              <p className="text-xs text-emerald-200 mb-2">
                Last update: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 hover:bg-slate-100"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Participants" value={stats.totalSubmissions} color="bg-indigo-500" />
        <StatCard icon={Zap} label="Active Now" value={stats.activeUsers} color="bg-emerald-500" pulse />
        <StatCard icon={TrendingUp} label="Top Score" value={stats.topScore} color="bg-amber-500" />
        <StatCard icon={BarChart3} label="Total Solves" value={stats.totalSolved} color="bg-purple-500" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
                <Activity className="text-emerald-600" size={22} />
                All Submissions ({filteredScores.length})
              </h2>
              <p className="text-sm text-slate-500 mt-1">Click any row to expand details, view code, and see solved questions.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48"
                />
              </div>
              {questions.length > 0 && (
                <div className="relative">
                  <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={filterQuestion}
                    onChange={e => setFilterQuestion(e.target.value)}
                    className="pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none bg-white"
                  >
                    <option value="">All Questions</option>
                    {questions.map((q, idx) => (
                      <option key={idx} value={q.title}>{q.title} ({DIFFICULTY_CONFIG[q.difficulty]?.label || q.difficulty})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {questions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {questions.map((q, idx) => {
                const cfg = DIFFICULTY_CONFIG[q.difficulty] || DIFFICULTY_CONFIG.basic;
                const solveCount = enrichedScores.filter(s => s.solved && s.solved[q.title]).length;
                return (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold"
                    style={{ borderColor: cfg.color + '40', background: cfg.color + '10', color: cfg.color }}
                  >
                    <span>{cfg.label}</span>
                    <span className="text-slate-500">-</span>
                    <span className="text-slate-700">{q.title}</span>
                    <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{solveCount} solved</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700 select-none"
                  onClick={() => handleSort('score')}
                >
                  Score {sortField === 'score' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700 select-none"
                  onClick={() => handleSort('solved')}
                >
                  Solved {sortField === 'solved' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3">Complexity</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700 select-none"
                  onClick={() => handleSort('time')}
                >
                  Last Active {sortField === 'time' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filteredScores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Activity size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-semibold">No submissions yet</p>
                    <p className="text-xs text-slate-400 mt-1">Submissions will appear here in real-time as students solve questions.</p>
                  </td>
                </tr>
              ) : (
                filteredScores.map((score) => (
                  <SubmissionRow
                    key={score.id}
                    submission={score}
                    questions={questions}
                    expanded={expandedRow === score.id}
                    onToggle={() => setExpandedRow(expandedRow === score.id ? null : score.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
