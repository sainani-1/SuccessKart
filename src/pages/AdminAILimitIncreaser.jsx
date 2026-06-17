import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Save, Loader2, CheckCircle, AlertCircle, User } from 'lucide-react';

const AdminAILimitIncreaser = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [minuteLimit, setMinuteLimit] = useState(10);
  const [dayLimit, setDayLimit] = useState(100);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [existingOverrides, setExistingOverrides] = useState({});

  useEffect(() => {
    loadExistingOverrides();
  }, []);

  const loadExistingOverrides = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'user_ai_limits')
        .maybeSingle();
      if (data?.value) {
        const parsed = JSON.parse(data.value);
        setExistingOverrides(parsed || {});
      }
    } catch {}
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
    } catch (err) {
      setMessage({ type: 'error', text: 'Search failed.' });
    } finally {
      setSearching(false);
    }
  };

  const selectUser = (user) => {
    setSelectedUser(user);
    const overrides = existingOverrides[user.id];
    if (overrides) {
      setMinuteLimit(overrides.minuteLimit || 10);
      setDayLimit(overrides.dayLimit || 100);
    } else {
      setMinuteLimit(10);
      setDayLimit(100);
    }
    setMessage({ type: '', text: '' });
    setResults([]);
    setSearchTerm('');
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const nextOverrides = {
        ...existingOverrides,
        [selectedUser.id]: { minuteLimit, dayLimit, updatedAt: new Date().toISOString() },
      };

      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'user_ai_limits', value: JSON.stringify(nextOverrides) }, { onConflict: 'key' });

      if (error) throw error;

      setExistingOverrides(nextOverrides);
      setMessage({ type: 'success', text: `AI limits updated for ${selectedUser.full_name || selectedUser.email}. Minute: ${minuteLimit}, Day: ${dayLimit}` });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save limits.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-6 rounded-xl text-white">
        <h1 className="text-2xl font-bold mb-1">AI Limit Increaser</h1>
        <p className="text-slate-200">Set custom AI chat limits for specific users.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Search User</h2>
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
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
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
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <User size={20} className="text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{u.full_name || 'No name'}</p>
                  <p className="text-sm text-slate-500 truncate">{u.email} {u.phone ? `• ${u.phone}` : ''}</p>
                </div>
                <span className="ml-auto text-xs font-semibold uppercase text-slate-400">{u.role}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <User size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{selectedUser.full_name || 'User'}</h2>
              <p className="text-sm text-slate-500">{selectedUser.email} {selectedUser.phone ? `• ${selectedUser.phone}` : ''}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Rate Limit (prompts per minute)</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={120}
                  value={minuteLimit}
                  onChange={(e) => setMinuteLimit(parseInt(e.target.value, 10))}
                  className="flex-1 accent-purple-500"
                />
                <span className="text-slate-900 font-bold text-lg w-12 text-center">{minuteLimit}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Default: 10. Max per-minute prompts for this user.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Limit (prompts per day)</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={10}
                  max={5000}
                  step={10}
                  value={dayLimit}
                  onChange={(e) => setDayLimit(parseInt(e.target.value, 10))}
                  className="flex-1 accent-purple-500"
                />
                <span className="text-slate-900 font-bold text-lg w-16 text-center">{dayLimit}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Default: 100. Max daily prompts for this user.</p>
            </div>
          </div>

          {message.text && (
            <div className={`mt-4 flex items-center gap-2 text-sm p-3 rounded-xl ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 transition-all"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save AI Limits'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminAILimitIncreaser;
