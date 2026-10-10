import { useEffect, useMemo, useState } from 'react';
import { Brain, CheckCircle2, Loader2, Save, Search, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const ACCESS_KEY = 'ai_summary_enabled_users';

const AdminAISummaries = () => {
  const [students, setStudents] = useState([]);
  const [allowed, setAllowed] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [studentsRes, settingRes, summariesRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('role', 'student').order('full_name'),
      supabase.from('settings').select('value').eq('key', ACCESS_KEY).maybeSingle(),
      supabase.from('ai_test_summaries').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setStudents(studentsRes.data || []);
    try {
      setAllowed(JSON.parse(settingRes.data?.value || '[]'));
    } catch {
      setAllowed([]);
    }
    const rows = summariesRes.data || [];
    setSummaries(rows);
    const ids = [...new Set(rows.map((row) => row.user_id))];
    if (ids.length) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);
      setProfiles(profileRows || []);
    } else {
      setProfiles([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (student) =>
        (student.full_name || '').toLowerCase().includes(q) ||
        (student.email || '').toLowerCase().includes(q)
    );
  }, [students, query]);

  const toggle = (id) =>
    setAllowed((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    const { error: saveError } = await supabase
      .from('settings')
      .upsert({ key: ACCESS_KEY, value: JSON.stringify(allowed) }, { onConflict: 'key' });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setMessage(
      `Saved. ${allowed.length} student${allowed.length === 1 ? '' : 's'} now receive an AI mistake summary after each test.`
    );
  };

  const removeSummary = async (id) => {
    const { error } = await supabase.from('ai_test_summaries').delete().eq('id', id);
    if (!error) load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Brain className="text-violet-600" size={24} /> AI Test Summaries
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Turn on AI mistake summaries for only a few students. When they finish a test, the AI
          writes a short summary of what they got wrong and what to review.
        </p>
      </div>

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="bg-white border rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-bold text-slate-900">
            Students with AI summary access{' '}
            <span className="ml-1 text-xs font-semibold text-slate-400">({allowed.length} enabled)</span>
          </h2>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving…' : 'Save Access'}
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students by name or email…"
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>

        <div className="max-h-[420px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No students match your search.</p>
          ) : (
            filtered.map((student) => {
              const enabled = allowed.includes(student.id);
              return (
                <label
                  key={student.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggle(student.id)}
                    className="h-4 w-4 accent-violet-600"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-slate-800 truncate">
                      {student.full_name || 'Unnamed student'}
                    </span>
                    <span className="block text-xs text-slate-500 truncate">{student.email}</span>
                  </span>
                  {enabled ? (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-1">
                      <Sparkles size={12} /> AI summary ON
                    </span>
                  ) : null}
                </label>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-6">
        <h2 className="font-bold text-slate-900 mb-4">Recent generated summaries</h2>
        {summaries.length === 0 ? (
          <p className="text-sm text-slate-500">
            No AI summaries yet. Once a student with access finishes a test it will appear here.
          </p>
        ) : (
          <div className="space-y-3">
            {summaries.map((summary) => {
              const profile = profileById.get(summary.user_id);
              return (
                <div key={summary.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-800 truncate">
                          {profile?.full_name || '—'}
                        </p>
                        <span className="text-xs text-slate-400">{profile?.email}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {summary.test_title || 'Assessment'} · {summary.score_percent}% ·{' '}
                        {summary.details?.correct}/{summary.details?.total} correct ·{' '}
                        {new Date(summary.created_at).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSummary(summary.id)}
                      title="Delete summary"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="mt-2 rounded-lg bg-violet-50 border border-violet-100 px-4 py-3 text-sm text-slate-700 leading-6">
                    <p className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 uppercase tracking-wide">
                      <CheckCircle2 size={13} /> AI summary
                    </p>
                    <p className="mt-1">{summary.summary}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAISummaries;