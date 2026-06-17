import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, CheckCircle, AlertCircle, User, Brain, RotateCcw, Plus, Minus, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminLWAILimitSettings = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [savingId, setSavingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [defaults, setDefaults] = useState({ minuteLimit: 10, dayLimit: 100 });
  const [existingOverrides, setExistingOverrides] = useState({});

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchDefaults();
      fetchOverrides();
      fetchUsers();
    }
  }, [profile]);

  const fetchDefaults = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['ai_rate_limit_per_minute', 'ai_rate_limit_per_day']);
      for (const row of data || []) {
        if (row.key === 'ai_rate_limit_per_minute') setDefaults((p) => ({ ...p, minuteLimit: parseInt(row.value, 10) || 10 }));
        if (row.key === 'ai_rate_limit_per_day') setDefaults((p) => ({ ...p, dayLimit: parseInt(row.value, 10) || 100 }));
      }
    } catch {}
  };

  const fetchOverrides = async () => {
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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: rateData, error: rateError } = await supabase
        .from('ai_rate_limits')
        .select('user_id, request_count, window_start, daily_count, daily_date');

      if (rateError) throw rateError;

      const userIds = (rateData || []).map((r) => r.user_id).filter(Boolean);
      if (userIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', userIds);

      const profileMap = {};
      for (const p of profilesData || []) {
        profileMap[p.id] = p;
      }

      const merged = (rateData || []).map((r) => {
        const override = existingOverrides[r.user_id] || {};
        const profile = profileMap[r.user_id] || {};
        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
        const today = formatter.format(new Date());
        return {
          id: r.user_id,
          full_name: profile.full_name || 'Unknown',
          email: profile.email || 'No email',
          dailyCount: r.daily_count || 0,
          dailyDate: r.daily_date || '',
          isToday: (r.daily_date || '') === today,
          minuteLimit: override.minuteLimit || defaults.minuteLimit,
          dayLimit: override.dayLimit || defaults.dayLimit,
        };
      });

      setUsers(merged);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load users.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetDaily = async (user) => {
    if (!window.confirm(`Reset daily AI usage for ${user.full_name}?`)) return;
    setSavingId(user.id);
    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase
        .from('ai_rate_limits')
        .update({ daily_count: 0, daily_date: '' })
        .eq('user_id', user.id);
      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, dailyCount: 0, dailyDate: '' } : u
        )
      );
      setMessage({ type: 'success', text: `Daily usage reset for ${user.full_name}.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Reset failed.' });
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateDayLimit = async (user, delta) => {
    const newVal = user.dayLimit + delta;
    if (newVal < 1 || newVal > 10000) return;
    setSavingId(user.id);
    setMessage({ type: '', text: '' });
    try {
      const nextOverrides = {
        ...existingOverrides,
        [user.id]: {
          minuteLimit: user.minuteLimit,
          dayLimit: newVal,
          updatedAt: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'user_ai_limits', value: JSON.stringify(nextOverrides) }, { onConflict: 'key' });
      if (error) throw error;

      setExistingOverrides(nextOverrides);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, dayLimit: newVal } : u
        )
      );
      setMessage({ type: 'success', text: `Daily limit updated to ${newVal} for ${user.full_name}.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Update failed.' });
    } finally {
      setSavingId(null);
    }
  };

  const filtered = searchTerm.trim()
    ? users.filter((u) =>
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : users;

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <p className="text-red-400 text-lg">Admins only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-700 p-6 rounded-xl text-white">
        <h1 className="text-2xl font-bold mb-1">LWAI Limit Settings</h1>
        <p className="text-emerald-200">Manage per-user Learn With AI daily limits and usage.</p>
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

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-700">User</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-700">Daily Usage</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-700">Daily Limit</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400">
                    {searchTerm ? 'No users matching your search.' : 'No users have used AI yet.'}
                  </td>
                </tr>
              ) : filtered.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Brain size={18} className="text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{user.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-lg font-bold ${user.dailyCount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {user.dailyCount}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {user.isToday ? 'Today' : user.dailyDate ? `Last: ${user.dailyDate}` : 'No activity'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateDayLimit(user, -10)}
                        disabled={savingId === user.id || user.dayLimit <= 10}
                        className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center disabled:opacity-40"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-bold text-lg text-slate-900 min-w-[4ch] text-center">{user.dayLimit}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateDayLimit(user, 10)}
                        disabled={savingId === user.id || user.dayLimit >= 10000}
                        className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center disabled:opacity-40"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleResetDaily(user)}
                        disabled={savingId === user.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 text-xs font-semibold disabled:opacity-50 transition-colors"
                      >
                        {savingId === user.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Note:</strong> Default daily limit is <strong>{defaults.dayLimit}</strong>. Per-user overrides are applied on top of defaults. Resetting sets daily_count to 0.
      </div>
    </div>
  );
};

export default AdminLWAILimitSettings;
