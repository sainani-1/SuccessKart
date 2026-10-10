import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  Plus,
  Trash2,
  Loader2,
  Wand2,
  Play,
  StopCircle,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Wrench,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import AttemptsPanel from '../components/dcs/AttemptsPanel';
import {
  VISIBLE_TEST_COUNT,
  HIDDEN_TEST_COUNT,
  FALLBACK_POOL,
  buildPoolQuestion,
} from '../utils/dcsPool';
import {
  DCS_DIFFICULTIES,
  cleanProblemTitle,
  hasFillerContent,
  todayKey,
  runDcsScheduler,
  generateQuestionsForContest,
} from '../utils/dcs';

const emptyForm = () => ({
  contest_date: todayKey(),
  title: '',
  start_time: '10:00',
  end_time: '23:59',
  auto_mode: true,
});

const emptyQuestion = () => ({
  difficulty: 'easy',
  title: '',
  description: '',
  sample_input: '',
  sample_output: '',
  expected_answer: '',
  constraints: '',
});

const statusBadge = (status) => {
  const map = {
    scheduled: 'bg-slate-100 text-slate-600',
    generating: 'bg-amber-100 text-amber-700',
    ready: 'bg-blue-100 text-blue-700',
    live: 'bg-emerald-100 text-emerald-700',
    ended: 'bg-rose-100 text-rose-600',
  };
  return map[status] || map.scheduled;
};

// Curated pool questions, indexed by their cleaned title, so the repair pass
// can rebuild rows whose statement was written as filler (for example the old
// "Sum of Digits" rows whose sample output was the placeholder 5152).
const POOL_BY_TITLE = new Map();
Object.values(FALLBACK_POOL).forEach((entries) =>
  (entries || []).forEach((entry) => {
    const key = cleanProblemTitle(entry.title).toLowerCase();
    if (key && !POOL_BY_TITLE.has(key)) POOL_BY_TITLE.set(key, entry);
  })
);

// Shared repair pass: rebuilds pool-matched filler questions from the curated
// pool, backfills missing test cases and cleans contest noise out of titles.
// Returns per-question patches so callers can update local state without a
// second round trip. Used by the manual "Repair Data" button and by the
// silent auto-repair that runs after every question load.
const repairRows = async (contestId, rows) => {
  let fixed = 0;
  let rebuilt = 0;
  const updatedById = new Map();
  for (const question of rows) {
    const cleanTitle = cleanProblemTitle(question.title);
    const patch = {};
    const hasRealTests = (Array.isArray(question.test_cases) ? question.test_cases : []).some(
      (test) => test && typeof test === 'object' && !Array.isArray(test) && !!String(test?.input || '').trim()
    );
    const sampleOutput = String(question.sample_output || '').trim();
    const filler = hasFillerContent(question.description);
    const poolEntry = POOL_BY_TITLE.get(cleanTitle.toLowerCase());

    if (poolEntry && (filler || !hasRealTests || !sampleOutput)) {
      const rebuiltQuestion = buildPoolQuestion(poolEntry);
      const { data, error } = await supabase
        .from('dcs_questions')
        .update({
          ...rebuiltQuestion,
          difficulty: question.difficulty,
          position: question.position,
          source: 'pool',
        })
        .eq('id', question.id)
        .select();
      if (error) throw error;
      rebuilt += 1;
      if (data?.[0]) updatedById.set(question.id, data[0]);
      continue;
    }

    if (!hasRealTests && sampleOutput) {
      const baseTest = {
        input: String(question.sample_input || '').trim(),
        output: sampleOutput,
      };
      patch.test_cases = [
        ...Array.from({ length: VISIBLE_TEST_COUNT }, () => ({ ...baseTest, hidden: false })),
        ...Array.from({ length: HIDDEN_TEST_COUNT }, () => ({ ...baseTest, hidden: true })),
      ];
      fixed += 1;
    }
    if (cleanTitle !== String(question.title || '').trim()) {
      patch.title = cleanTitle;
      fixed += 1;
    }
    if (Object.keys(patch).length) {
      const { data, error } = await supabase
        .from('dcs_questions')
        .update(patch)
        .eq('id', question.id)
        .select();
      if (error) throw error;
      if (data?.[0]) updatedById.set(question.id, data[0]);
    }
  }
  return { fixed, rebuilt, updatedById };
};

const repairSummary = (fixed, rebuilt) => {
  const parts = [];
  if (rebuilt) parts.push(`${rebuilt} rebuilt from the curated pool`);
  if (fixed) parts.push(`${fixed} patched (tests/titles)`);
  return parts.join(' and ');
};

const AdminDCS = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [contests, setContests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [form, setForm] = useState(emptyForm());
  const [questionForm, setQuestionForm] = useState(emptyQuestion());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [repeatDaily, setRepeatDaily] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const autoRepairingRef = useRef(false);

  const notify = (type, text) => setMessage({ type, text });

  const loadContests = useCallback(async () => {
    const { data } = await supabase
      .from('dcs_contests')
      .select('*')
      .order('contest_date', { ascending: false })
      .limit(60);
    setContests(data || []);
    setLoading(false);
    return data || [];
  }, []);

  const loadDetail = useCallback(async (contestId) => {
    if (!contestId) {
      setQuestions([]);
      setAttemptCount(0);
      return;
    }
    const [{ data: qData }, { count }] = await Promise.all([
      supabase
        .from('dcs_questions')
        .select('*')
        .eq('contest_id', contestId)
        .order('position', { ascending: true }),
      supabase
        .from('dcs_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('contest_id', contestId),
    ]);
    const rows = qData || [];
    setQuestions(rows);
    setAttemptCount(Number(count || 0));

    // Silent auto-repair: broken rows (filler statements, missing tests, dirty
    // titles) are fixed immediately so nobody has to click "Repair Data".
    if (rows.length && !autoRepairingRef.current) {
      autoRepairingRef.current = true;
      try {
        const { fixed, rebuilt, updatedById } = await repairRows(contestId, rows);
        if (fixed || rebuilt) {
          setQuestions((prev) =>
            prev.map((question) =>
              updatedById.has(question.id) ? { ...question, ...updatedById.get(question.id) } : question
            )
          );
          notify('success', `Auto-repaired: ${repairSummary(fixed, rebuilt)}.`);
        }
      } catch {
        // Auto-repair is best-effort; the manual button remains available.
      } finally {
        autoRepairingRef.current = false;
      }
    }
  }, []);

  const tick = useCallback(async () => {
    await runDcsScheduler({ allowGenerate: true });
    const data = await loadContests();
    if (selected) {
      const fresh = data.find((c) => c.id === selected.id);
      if (fresh) setSelected(fresh);
      await loadDetail(selected.id);
    }
    setReloadToken((token) => token + 1);
  }, [loadContests, loadDetail, selected]);

  useEffect(() => {
    (async () => {
      await tick();
    })();
    const interval = setInterval(tick, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDetail(selected?.id);
  }, [selected?.id, loadDetail]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setBusy(true);
    notify('info', '');
    try {
      // A recurring schedule is date-independent. Use today only for the
      // optional first instance that is shown in the admin contest list.
      const contestDate = repeatDaily ? todayKey() : form.contest_date;
      const payload = {
        contest_date: contestDate,
        title: form.title.trim() || 'Daily Coding Challenge',
        start_at: new Date(`${contestDate}T${form.start_time}`).toISOString(),
        end_at: new Date(`${contestDate}T${form.end_time}`).toISOString(),
        generation_deadline_at: new Date(new Date(`${contestDate}T${form.start_time}`).getTime() - 10 * 60000).toISOString(),
        auto_mode: !!form.auto_mode,
        status: 'scheduled',
        created_by: null,
      };
      if (new Date(payload.end_at) <= new Date(payload.start_at)) {
        throw new Error('End time must be after start time.');
      }
      const { error: scheduleError } = await supabase.from('dcs_recurring_schedules').upsert({
        schedule_key: 'default',
        title: payload.title,
        start_time: form.start_time,
        end_time: form.end_time,
        auto_mode: form.auto_mode,
        enabled: repeatDaily,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'schedule_key' });
      if (scheduleError) throw scheduleError;

      const { data, error } = await supabase
        .from('dcs_contests')
        .insert(payload)
        .select()
        .maybeSingle();
      if (error) {
        if (String(error.message || '').includes('idx_dcs_contests_date')) {
          if (repeatDaily) {
            const { data: existing } = await supabase
              .from('dcs_contests')
              .select('*')
              .eq('contest_date', contestDate)
              .maybeSingle();
            notify('success', 'Daily schedule updated. Today\'s contest already exists.');
            await loadContests();
            if (existing) {
              setSelected(existing);
              await loadDetail(existing.id);
            }
            return;
          }
          throw new Error('A contest already exists for this date.');
        }
        throw error;
      }
      notify('success', repeatDaily ? 'Daily schedule saved and today\'s contest created.' : 'Contest created.');
      setForm(emptyForm());
      await loadContests();
      setSelected(data);
    } catch (err) {
      notify('error', err?.message || 'Failed to create contest.');
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (contestId, status) => {
    setBusy(true);
    const { error } = await supabase
      .from('dcs_contests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', contestId);
    setBusy(false);
    if (error) return notify('error', error.message);
    notify('success', `Contest marked as ${status}.`);
    await tick();
  };

  const handleGenerate = async () => {
    if (!selected) return;
    setBusy(true);
    notify('info', 'Generating questions…');
    try {
      // Regenerate means replace the existing daily set, including old
      // placeholder questions created by an earlier scheduler version.
      await supabase.from('dcs_questions').delete().eq('contest_id', selected.id);
      await supabase
        .from('dcs_contests')
        .update({ status: 'generating', generation_status: 'running' })
        .eq('id', selected.id);
      await generateQuestionsForContest(selected.id, null);
      await supabase
        .from('dcs_contests')
        .update({
          status: 'ready',
          generation_status: 'done',
          generation_error: null,
          updated_at: new Date().toISOString(),
            })
        .eq('id', selected.id);
      notify('success', 'Questions generated.');
      await tick();
    } catch (err) {
      await supabase
        .from('dcs_contests')
        .update({ status: 'scheduled', generation_status: 'failed', generation_error: String(err?.message || err) })
        .eq('id', selected.id);
      notify('error', err?.message || 'Generation failed.');
      await tick();
    } finally {
      setBusy(false);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!selected) return;
    if (!questionForm.title.trim() || !questionForm.description.trim() || !questionForm.expected_answer.trim()) {
      return notify('error', 'Title, description and expected answer are required.');
    }
    setBusy(true);
    const position = questions.length + 1;
    const baseTest = { input: questionForm.sample_input.trim(), output: questionForm.sample_output.trim() };
    const { error } = await supabase.from('dcs_questions').insert({
      contest_id: selected.id,
      difficulty: questionForm.difficulty,
      position,
      title: questionForm.title.trim(),
      description: questionForm.description.trim(),
      sample_input: questionForm.sample_input.trim(),
      sample_output: questionForm.sample_output.trim(),
      expected_answer: questionForm.expected_answer.trim(),
      constraints: questionForm.constraints.trim(),
      test_cases: [
        ...Array.from({ length: 6 }, () => ({ ...baseTest, hidden: false })),
        ...Array.from({ length: 35 }, () => ({ ...baseTest, hidden: true })),
      ],
      source: 'manual',
    });
    setBusy(false);
    if (error) return notify('error', error.message);
    setQuestionForm(emptyQuestion());
    notify('success', 'Question added.');
    await loadDetail(selected.id);
  };

  const deleteQuestion = async (questionId) => {
    setBusy(true);
    await supabase.from('dcs_questions').delete().eq('id', questionId);
    setBusy(false);
    await loadDetail(selected.id);
  };

  const repairData = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const { fixed, rebuilt } = await repairRows(selected.id, questions);
      notify(
        'success',
        fixed || rebuilt
          ? `Repaired: ${repairSummary(fixed, rebuilt)}.`
          : 'Everything looks fine — cleaned titles, test cases and the curated pool all match.'
      );
      await loadDetail(selected.id);
    } catch (err) {
      notify('error', err?.message || 'Repair failed.');
    } finally {
      setBusy(false);
    }
  };

  const deleteContest = async (contestId) => {
    const target = contests.find((contest) => contest.id === contestId) || selected;
    const affectsSchedule =
      !!target && String(target.contest_date || '') >= todayKey();
    if (
      !window.confirm(
        affectsSchedule
          ? 'Delete this contest and all its questions/attempts?\nThe daily recurring schedule will also be disabled so the contest is not recreated.'
          : 'Delete this contest and all its questions/attempts?'
      )
    ) {
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('dcs_contests').delete().eq('id', contestId);
    if (error) {
      setBusy(false);
      return notify('error', `Delete failed: ${error.message}`);
    }
    let scheduleOff = false;
    if (affectsSchedule) {
      const { error: scheduleError } = await supabase
        .from('dcs_recurring_schedules')
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq('schedule_key', 'default');
      scheduleOff = !scheduleError;
    }
    setBusy(false);
    setSelected(null);
    notify(
      'success',
      affectsSchedule
        ? scheduleOff
          ? 'Contest deleted and the daily schedule disabled — it will not be recreated. Tick "Repeat every day" again when creating a contest to re-enable it.'
          : 'Contest deleted, but the daily schedule could not be disabled — turn it off manually if the contest reappears.'
        : 'Contest deleted.'
    );
    await tick();
  };

  const grouped = useMemo(
    () =>
      DCS_DIFFICULTIES.map((level) => ({
        ...level,
        items: questions.filter((q) => q.difficulty === level.key),
      })).filter((g) => g.items.length),
    [questions]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarClock size={24} /> Daily Coding Streak — Setup
          </h1>
          <p className="text-sm text-slate-500">
            Schedule the daily contest, generate or manually write 10 questions (4 easy · 3 medium · 3 hard).
            {!isAdmin ? ' Read-only: contests can only be changed by an admin.' : ''}
          </p>
        </div>
        {isAdmin ? (
          <button
            onClick={tick}
            disabled={busy}
            className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            Run Scheduler Now
          </button>
        ) : null}
      </div>

      {message?.text ? (
        <div
          className={`text-sm rounded-xl px-4 py-3 border ${
            message.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {isAdmin ? (
      <form onSubmit={handleCreate} className="bg-white border rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-lg">Schedule New Contest</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {!repeatDaily ? (
            <label className="block text-sm">
              <span className="font-medium">Date</span>
              <input
                type="date"
                value={form.contest_date}
                onChange={(e) => setForm({ ...form, contest_date: e.target.value })}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                required
              />
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="font-medium">Start Time</span>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">End Time</span>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Title (optional)</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Daily Coding Challenge"
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Mode</span>
            <select
              value={form.auto_mode ? 'auto' : 'manual'}
              onChange={(e) => setForm({ ...form, auto_mode: e.target.value === 'auto' })}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              <option value="auto">Auto (AI generates)</option>
              <option value="manual">Manual (I write)</option>
            </select>
          </label>
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={repeatDaily} onChange={(e) => setRepeatDaily(e.target.checked)} />
          Repeat this contest every day automatically
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 bg-nani-dark text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-nani-dark/90 disabled:opacity-50"
        >
          <Plus size={16} /> Create Contest
        </button>
      </form>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="bg-white border rounded-2xl p-5 lg:col-span-2">
          <h2 className="font-bold text-lg mb-3">Contests</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500 py-6">
              <Loader2 className="animate-spin" size={16} /> Loading…
            </div>
          ) : contests.length === 0 ? (
            <p className="text-sm text-slate-500">No contests yet.</p>
          ) : (
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {contests.map((contest) => (
                <button
                  key={contest.id}
                  onClick={() => setSelected(contest)}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition ${
                    selected?.id === contest.id
                      ? 'border-gold-400 bg-gold-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">{contest.contest_date}</span>
                    <span
                      className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${statusBadge(
                        contest.status
                      )}`}
                    >
                      {contest.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{contest.title || 'Daily Challenge'}</p>
                  <p className="text-[11px] text-slate-400">
                    {contest.auto_mode ? 'Auto (AI)' : 'Manual'} ·{' '}
                    {new Date(contest.start_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    →{' '}
                    {new Date(contest.end_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-2xl p-5 lg:col-span-3">
          {!selected ? (
            <div className="text-center py-12 text-slate-400">
              <Code2 className="mx-auto mb-2" size={36} />
              <p className="text-sm">Select a contest to manage its questions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold text-lg">{selected.title || 'Daily Challenge'}</h2>
                  <p className="text-xs text-slate-500">
                    {selected.contest_date} ·{' '}
                    <span className={`font-bold uppercase ${statusBadge(selected.status)}`}>
                      {selected.status}
                    </span>{' '}
                    · {questions.length} questions · {attemptCount} attempts ·{' '}
                    {selected.auto_mode ? 'Auto' : 'Manual'}
                  </p>
                  {selected.generation_status === 'failed' ? (
                    <p className="text-xs text-rose-600 flex items-center gap-1 mt-1">
                      <AlertTriangle size={12} /> {selected.generation_error || 'Generation failed'}
                    </p>
                  ) : null}
                </div>
                {isAdmin ? (
                <div className="flex flex-wrap gap-2">
                  {selected.auto_mode ? (
                    <button
                      onClick={handleGenerate}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Wand2 size={14} /> {questions.length ? 'Regenerate' : 'Generate Now'}
                    </button>
                  ) : null}
                  {selected.status !== 'live' ? (
                    <button
                      onClick={() => updateStatus(selected.id, 'live')}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Play size={14} /> Go Live
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus(selected.id, 'ended')}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                    >
                      <StopCircle size={14} /> End Now
                    </button>
                  )}
                  <button
                    onClick={repairData}
                    disabled={busy || !questions.length}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                    title="Backfill missing test cases from the sample and strip contest noise from titles"
                  >
                    <Wrench size={14} /> Repair Data
                  </button>
                  <button
                    onClick={() => deleteContest(selected.id)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 text-rose-600 text-xs font-semibold hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
                ) : null}
              </div>

              {grouped.map((group) => (
                <div key={group.key}>
                  <p className="text-xs font-bold uppercase text-slate-400 mb-1">
                    {group.label} ({group.items.length}/{group.count})
                  </p>
                  <div className="space-y-2">
                    {group.items.map((question) => (
                      <div key={question.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{question.title}</p>
                            <p className="text-xs text-slate-500 whitespace-pre-line line-clamp-2">
                              {question.description}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Answer: <span className="font-mono font-semibold">{question.expected_answer}</span>{' '}
                              · {question.source === 'manual' ? 'Manual' : 'AI'}
                            </p>
                          </div>
                          {isAdmin ? (
                          <button
                            onClick={() => deleteQuestion(question.id)}
                            disabled={busy}
                            className="text-rose-500 hover:text-rose-700 disabled:opacity-40"
                            title="Delete question"
                          >
                            <Trash2 size={15} />
                          </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {isAdmin ? (
              <form onSubmit={handleAddQuestion} className="border border-dashed border-slate-300 rounded-xl p-4 space-y-3">
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  <Plus size={14} /> Add Question Manually
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={questionForm.difficulty}
                    onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                    className="border rounded-lg px-3 py-2 text-sm"
                  >
                    {DCS_DIFFICULTIES.map((level) => (
                      <option key={level.key} value={level.key}>
                        {level.label} ({level.count})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Title"
                    value={questionForm.title}
                    onChange={(e) => setQuestionForm({ ...questionForm, title: e.target.value })}
                    className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
                  />
                </div>
                <textarea
                  placeholder="Question description"
                  value={questionForm.description}
                  onChange={(e) => setQuestionForm({ ...questionForm, description: e.target.value })}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Sample input"
                    value={questionForm.sample_input}
                    onChange={(e) => setQuestionForm({ ...questionForm, sample_input: e.target.value })}
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Sample output"
                    value={questionForm.sample_output}
                    onChange={(e) => setQuestionForm({ ...questionForm, sample_output: e.target.value })}
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Expected answer (required)"
                    value={questionForm.expected_answer}
                    onChange={(e) => setQuestionForm({ ...questionForm, expected_answer: e.target.value })}
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Constraints"
                    value={questionForm.constraints}
                    onChange={(e) => setQuestionForm({ ...questionForm, constraints: e.target.value })}
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Add Question
                </button>
              </form>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {selected ? (
        <AttemptsPanel
          contestId={selected.id}
          questions={questions}
          teacherId={isAdmin ? null : profile?.id || null}
          reloadToken={reloadToken}
        />
      ) : null}
    </div>
  );
};

export default AdminDCS;
