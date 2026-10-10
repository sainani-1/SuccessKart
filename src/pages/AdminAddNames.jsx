import { useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2, Eye, EyeOff, UserPlus } from 'lucide-react';
import { supabase } from '../supabaseClient';

const TEAM_KEY = 'about_team';

const emptyMember = { name: '', role: 'Founder', description: '', isVisible: true };

const initials = (name = '') =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

const AdminAddNames = () => {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', TEAM_KEY)
        .maybeSingle();
      try {
        const parsed = Array.isArray(JSON.parse(data?.value || '[]'))
          ? JSON.parse(data?.value || '[]')
          : [];
        setTeam(parsed.length ? parsed : [emptyMember]);
      } catch {
        setTeam([emptyMember]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const updateMember = (index, patch) =>
    setTeam((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    const cleaned = team
      .filter((member) => member?.name?.trim() && member?.role?.trim())
      .map((member) => ({
        ...member,
        name: member.name.trim(),
        role: member.role.trim(),
        description: String(member.description || '').trim(),
        isVisible: member.isVisible !== false,
      }));
    const { error: saveError } = await supabase
      .from('settings')
      .upsert({ key: TEAM_KEY, value: JSON.stringify(cleaned) }, { onConflict: 'key' });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setTeam(cleaned.length ? cleaned : [emptyMember]);
    setMessage('Team names saved. They now appear on the About page.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading team…
      </div>
    );
  }

  const visible = team.filter((member) => member?.isVisible !== false && member?.name?.trim());

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="text-amber-600" size={24} /> Add Names
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Add leaders like <span className="font-semibold">Founder</span>,{' '}
          <span className="font-semibold">Co-Founder</span> or any title and their name. They are
          shown neatly in the <span className="font-semibold">About</span> page team section.
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
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Eye size={17} /> Team members
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTeam((items) => [...items, { ...emptyMember }])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus size={15} /> Add Member
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving…' : 'Save Names'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {team.map((member, index) => (
            <div
              key={index}
              className={`rounded-xl border p-4 transition ${
                member?.isVisible !== false
                  ? 'border-slate-200 bg-white'
                  : 'border-dashed border-slate-300 bg-slate-50 opacity-80'
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-[160px_160px_1fr_auto_auto] gap-3 items-start">
                <input
                  value={member?.name || ''}
                  onChange={(e) => updateMember(index, { name: e.target.value })}
                  placeholder="Name"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
                <input
                  value={member?.role || ''}
                  onChange={(e) => updateMember(index, { role: e.target.value })}
                  placeholder="Title (Founder / Co-Founder / …)"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
                <input
                  value={member?.description || ''}
                  onChange={(e) => updateMember(index, { description: e.target.value })}
                  placeholder="Short description (optional)"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
                <button
                  type="button"
                  onClick={() => updateMember(index, { isVisible: member?.isVisible !== false ? false : true })}
                  title={member?.isVisible !== false ? 'Hide from About page' : 'Show on About page'}
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition ${
                    member?.isVisible !== false
                      ? 'border-amber-300 bg-amber-50 text-amber-700'
                      : 'border-slate-300 bg-white text-slate-400'
                  }`}
                >
                  {member?.isVisible !== false ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => setTeam((items) => items.filter((_, i) => i !== index))}
                  title="Remove"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                {member?.isVisible !== false
                  ? 'Visible on the About page'
                  : 'Hidden — not shown on the About page'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {visible.length ? (
        <div className="bg-white border rounded-2xl p-6">
          <h2 className="font-bold text-slate-900 mb-4">About page preview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((member) => (
              <div
                key={`${member.name}-${member.role}`}
                className="rounded-2xl border border-slate-200 bg-gradient-to-b from-amber-50/60 to-white p-5 text-center"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-lg font-extrabold text-amber-800">
                  {initials(member.name)}
                </div>
                <p className="mt-3 text-xs font-bold uppercase tracking-widest text-amber-700">
                  {member.role}
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">{member.name}</p>
                {member.description ? (
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">{member.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminAddNames;