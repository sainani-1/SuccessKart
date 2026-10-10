import React, { useEffect, useState } from 'react';
import { Github, Linkedin, Save, ExternalLink } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const PLATFORMS = ['codechef', 'leetcode', 'hackerrank', 'codeforces', 'linkedin', 'github'];

const CodingAccounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('coding_accounts').select('platform, handle, url').eq('user_id', user.id)
      .then(({ data }) => {
        setAccounts(Object.fromEntries((data || []).map((row) => [row.platform, { handle: row.handle || '', url: row.url || '' }])));
        setLoading(false);
      });
  }, [user?.id]);

  const update = (platform, field, value) => setAccounts((prev) => ({ ...prev, [platform]: { ...(prev[platform] || {}), [field]: value } }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true); setMessage('');
    const rows = PLATFORMS.filter((platform) => accounts[platform]?.handle || accounts[platform]?.url)
      .map((platform) => ({ user_id: user.id, platform, handle: accounts[platform].handle || '', url: accounts[platform].url || '', updated_at: new Date().toISOString() }));
    const { error } = await supabase.from('coding_accounts').upsert(rows, { onConflict: 'user_id,platform' });
    setMessage(error ? error.message : 'Coding profiles saved.');
    setSaving(false);
  };

  if (loading) return <div className="text-slate-500">Loading coding profiles…</div>;
  return <div className="max-w-4xl mx-auto space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Coding Profiles</h1><p className="text-sm text-slate-500 mt-1">Keep your coding-platform handles and professional profiles in one place.</p></div>
    <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
      {PLATFORMS.map((platform) => <label key={platform} className="rounded-2xl border bg-white p-5 block"><span className="font-semibold capitalize text-slate-800">{platform}</span><input value={accounts[platform]?.handle || ''} onChange={(e) => update(platform, 'handle', e.target.value)} placeholder={platform === 'linkedin' || platform === 'github' ? 'Username or profile name' : 'Handle'} className="mt-3 w-full border rounded-lg px-3 py-2" /><input value={accounts[platform]?.url || ''} onChange={(e) => update(platform, 'url', e.target.value)} placeholder="Profile URL (optional)" className="mt-2 w-full border rounded-lg px-3 py-2 text-sm" /></label>)}
      <div className="md:col-span-2 flex items-center gap-3"><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-5 py-2.5 font-semibold"><Save size={16} />{saving ? 'Saving…' : 'Save Profiles'}</button>{message && <span className="text-sm text-emerald-600">{message}</span>}</div>
    </form>
    <div className="rounded-2xl border bg-slate-50 p-5 text-sm text-slate-600 flex gap-2"><ExternalLink size={16} /> Links are used for your learner profile and teacher review; they do not grant SuccessKart access to external accounts.</div>
  </div>;
};

export default CodingAccounts;
