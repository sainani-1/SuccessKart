import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Save, Loader2, CheckCircle, AlertCircle, Sliders, User, Brain, Mic } from 'lucide-react';

const AdminVMILimits = () => {
  const [aiPrepLimit, setAiPrepLimit] = useState(5);
  const [talkMockLimit, setTalkMockLimit] = useState(5);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userAiPrepLimit, setUserAiPrepLimit] = useState('');
  const [userTalkMockLimit, setUserTalkMockLimit] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [existingOverrides, setExistingOverrides] = useState({});

  useEffect(() => {
    loadSettings();
    loadExistingOverrides();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['vmi_ai_prep_monthly_limit', 'vmi_talk_mock_monthly_limit']);

      for (const row of data || []) {
        if (row.key === 'vmi_ai_prep_monthly_limit') setAiPrepLimit(parseInt(row.value, 10) || 5);
        if (row.key === 'vmi_talk_mock_monthly_limit') setTalkMockLimit(parseInt(row.value, 10) || 5);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load settings.' });
    } finally {
      setLoading(false);
    }
  };

  const loadExistingOverrides = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'user_vmi_limits')
        .maybeSingle();
      if (data?.value) {
        const parsed = JSON.parse(data.value);
        setExistingOverrides(parsed || {});
      }
    } catch {}
  };

  const handleSaveBasic = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const upserts = [
        { key: 'vmi_ai_prep_monthly_limit', value: String(aiPrepLimit) },
        { key: 'vmi_talk_mock_monthly_limit', value: String(talkMockLimit) },
      ];

      for (const setting of upserts) {
        const { error } = await supabase
          .from('settings')
          .upsert(setting, { onConflict: 'key' });
        if (error) throw error;
      }

      setMessage({ type: 'success', text: `Basic VMI limits saved. AI Prep: ${aiPrepLimit}/month, Talk Mock: ${talkMockLimit}/month` });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save basic limits.' });
    } finally {
      setSaving(false);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role')
        .or(`full_name.ilike.%${searchTerm.trim()}%,email.ilike.%${searchTerm.trim()}%`)
        .limit(20);

      if (error) throw error;
      setResults(data || []);
    } catch {
      setMessage({ type: 'error', text: 'Search failed.' });
    } finally {
      setSearching(false);
    }
  };

  const selectUser = (user) => {
    setSelectedUser(user);
    const overrides = existingOverrides[user.id];
    setUserAiPrepLimit(overrides?.aiPrepLimit != null ? String(overrides.aiPrepLimit) : '');
    setUserTalkMockLimit(overrides?.talkMockLimit != null ? String(overrides.talkMockLimit) : '');
    setMessage({ type: '', text: '' });
    setResults([]);
    setSearchTerm('');
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setSavingUser(true);
    setMessage({ type: '', text: '' });

    try {
      const nextOverrides = {
        ...existingOverrides,
        [selectedUser.id]: {
          aiPrepLimit: userAiPrepLimit ? parseInt(userAiPrepLimit, 10) : null,
          talkMockLimit: userTalkMockLimit ? parseInt(userTalkMockLimit, 10) : null,
          updatedAt: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'user_vmi_limits', value: JSON.stringify(nextOverrides) }, { onConflict: 'key' });

      if (error) throw error;

      setExistingOverrides(nextOverrides);
      setMessage({ type: 'success', text: `VMI limits updated for ${selectedUser.full_name || selectedUser.email}.` });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save user limits.' });
    } finally {
      setSavingUser(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 p-6 rounded-xl text-white">
        <h1 className="text-2xl font-bold mb-1">VMI Limits</h1>
        <p className="text-indigo-200">Set monthly usage limits for AI Prep and Talk Mock Interviews. These are separate from AI chat limits.</p>
      </div>

      {message.text && (
        <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Basic VMI Limits (Default for All Users)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Brain size={16} className="text-indigo-500" /> AI Prep (sessions per month)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={100}
                value={aiPrepLimit}
                onChange={(e) => setAiPrepLimit(parseInt(e.target.value, 10))}
                className="flex-1 accent-indigo-600"
              />
              <span className="text-slate-900 font-bold text-lg w-12 text-center">{aiPrepLimit}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Default: 5. Max sessions per month per user.</p>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Mic size={16} className="text-indigo-500" /> Talk Mock Interviews (sessions per month)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={100}
                value={talkMockLimit}
                onChange={(e) => setTalkMockLimit(parseInt(e.target.value, 10))}
                className="flex-1 accent-indigo-600"
              />
              <span className="text-slate-900 font-bold text-lg w-12 text-center">{talkMockLimit}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Default: 5. Max sessions per month per user.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveBasic}
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-700 to-indigo-500 px-6 py-3 text-sm font-semibold text-white hover:from-indigo-800 hover:to-indigo-600 disabled:opacity-60 transition-all"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Basic VMI Limits'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Per-User VMI Limit Override</h2>
        <p className="text-sm text-slate-500 mb-4">Search for a user to set custom monthly limits that override the defaults above.</p>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
            className="flex-1 p-3 border border-slate-300 rounded-lg text-sm"
          />
          <button
            type="button"
            onClick={searchUsers}
            disabled={searching || !searchTerm.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-4 space-y-2">
            {results.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => selectUser(u)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-left transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <User size={20} className="text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{u.full_name || 'No name'}</p>
                  <p className="text-sm text-slate-500 truncate">{u.email} {u.phone ? `\u2022 ${u.phone}` : ''}</p>
                </div>
                <span className="ml-auto text-xs font-semibold uppercase text-slate-400">{u.role}</span>
              </button>
            ))}
          </div>
        )}

        {selectedUser && (
          <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center">
                <User size={20} className="text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{selectedUser.full_name || 'User'}</p>
                <p className="text-sm text-slate-500">{selectedUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">AI Prep (per month)</label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={userAiPrepLimit}
                  onChange={(e) => setUserAiPrepLimit(e.target.value)}
                  placeholder={`Default: ${aiPrepLimit}`}
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Talk Mock (per month)</label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={userTalkMockLimit}
                  onChange={(e) => setUserTalkMockLimit(e.target.value)}
                  placeholder={`Default: ${talkMockLimit}`}
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveUser}
              disabled={savingUser}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-700 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:from-indigo-800 hover:to-indigo-600 disabled:opacity-60 transition-all"
            >
              {savingUser ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {savingUser ? 'Saving...' : 'Save User Limits'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Note:</strong> VMI limits are separate from AI chat (Learn with AI) limits. These control how many AI Prep and Talk Mock Interview sessions a user can complete per month. Per-user overrides replace the basic defaults.
      </div>
    </div>
  );
};

export default AdminVMILimits;
