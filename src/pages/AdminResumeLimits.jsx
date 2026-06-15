import React, { useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Save, Infinity, RotateCcw } from 'lucide-react';

const AdminResumeLimits = () => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [edits, setEdits] = useState({});

  const searchUsers = async () => {
    const query = search.trim().toLowerCase();
    if (!query) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, resume_review_limit')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(50);
      if (error) throw error;
      setUsers(data || []);
      if (!data || data.length === 0) {
        setMessage({ type: 'info', text: 'No users found matching your search.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Search failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (userId) => {
    const value = edits[userId];
    if (value === undefined) return;
    setSavingId(userId);
    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ resume_review_limit: value })
        .eq('id', userId);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, resume_review_limit: value } : u)));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setMessage({ type: 'success', text: 'Limit updated.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save.' });
    } finally {
      setSavingId(null);
    }
  };

  const getLimitLabel = (value) => {
    if (value == null) return 'Default (1)';
    if (value === -1) return 'Unlimited';
    return String(value);
  };

  const handleEditChange = (userId, raw) => {
    if (raw === '' || raw === 'default') {
      setEdits((prev) => ({ ...prev, [userId]: null }));
    } else if (raw === 'unlimited') {
      setEdits((prev) => ({ ...prev, [userId]: -1 }));
    } else {
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num >= 0) {
        setEdits((prev) => ({ ...prev, [userId]: num }));
      }
    }
  };

  const filteredUsers = useMemo(() => {
    return users;
  }, [users]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-indigo-300/20 shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Resume Review Limits</h1>
          <p className="text-indigo-300 text-sm mb-6">Set per-user resume review limits. Default is 1 per month. Set to Unlimited or a custom number.</p>

          <div className="flex gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
              placeholder="Search by name or email..."
              className="flex-1 bg-white/10 border border-indigo-400/30 rounded-xl px-4 py-3 text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={searchUsers}
              disabled={loading || !search.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              <Search size={18} /> Search
            </button>
          </div>

          {message.text && (
            <div className={`mt-4 flex items-center gap-2 text-sm p-3 rounded-xl ${
              message.type === 'success'
                ? 'bg-green-900/50 text-green-200 border border-green-500/30'
                : message.type === 'error'
                ? 'bg-red-900/50 text-red-200 border border-red-500/30'
                : 'bg-blue-900/50 text-blue-200 border border-blue-500/30'
            }`}>
              {message.text}
            </div>
          )}

          <div className="mt-6 space-y-3">
            {loading ? (
              <p className="text-center text-indigo-300 py-8">Searching...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-indigo-400 py-8">Search for users to manage their limits.</p>
            ) : filteredUsers.map((user) => {
              const currentValue = user.resume_review_limit;
              const editValue = edits[user.id] !== undefined ? edits[user.id] : currentValue;
              const hasChanges = edits[user.id] !== undefined;
              return (
                <div key={user.id} className="bg-white/5 rounded-xl border border-indigo-400/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{user.full_name || 'Unknown'}</p>
                      <p className="text-sm text-indigo-300 truncate">{user.email} • {user.role}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={editValue === null ? 'default' : editValue === -1 ? 'unlimited' : String(editValue)}
                        onChange={(e) => handleEditChange(user.id, e.target.value)}
                        className="bg-slate-800 border border-indigo-400/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="default">Default (1)</option>
                        <option value="unlimited">Unlimited</option>
                        {[0, 2, 3, 4, 5, 10].map((n) => (
                          <option key={n} value={String(n)}>{n} per month</option>
                        ))}
                      </select>
                      <span className="text-xs text-indigo-400 w-16 text-right">
                        {getLimitLabel(currentValue)}
                      </span>
                      {hasChanges ? (
                        <button
                          type="button"
                          onClick={() => handleSave(user.id)}
                          disabled={savingId === user.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
                        >
                          <Save size={14} /> Save
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 bg-white/5 backdrop-blur-lg rounded-2xl border border-indigo-300/10 p-6">
            <h2 className="text-lg font-semibold text-white mb-3">How limits work</h2>
            <ul className="space-y-2 text-sm text-indigo-300">
              <li><strong className="text-white">Default (1)</strong> — Student gets 1 AI-powered resume review per month.</li>
              <li><strong className="text-white">Unlimited</strong> — Student can submit as many resume reviews as they want.</li>
              <li><strong className="text-white">Custom number</strong> — Override the default with a specific limit per month.</li>
              <li>Limits reset at the start of each calendar month.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminResumeLimits;
