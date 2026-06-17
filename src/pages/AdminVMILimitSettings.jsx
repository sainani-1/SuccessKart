import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Save, Loader2, CheckCircle, AlertCircle, User, Brain, Mic, RotateCcw, Infinity, Plus, Minus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminVMILimitSettings = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (profile?.role === 'admin') fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role')
        .eq('role', 'student');

      if (profilesError) throw profilesError;

      const userIds = (profilesData || []).map((p) => p.id);

      let accessMap = {};
      if (userIds.length > 0) {
        const { data: accessRows } = await supabase
          .from('vmi_access')
          .select('*')
          .in('user_id', userIds);
        if (accessRows) {
          accessRows.forEach((r) => { accessMap[r.user_id] = r; });
        }
      }

      let usageMap = {};
      if (userIds.length > 0) {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' });
        const currentMonth = formatter.format(now).slice(0, 7);
        const { data: usageRows } = await supabase
          .from('vmi_usage')
          .select('*')
          .in('user_id', userIds)
          .eq('month', currentMonth);
        if (usageRows) {
          usageRows.forEach((r) => {
            if (!usageMap[r.user_id]) usageMap[r.user_id] = {};
            usageMap[r.user_id][r.feature] = r.used_count;
          });
        }
      }

      let overrides = {};
      const { data: overrideData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'user_vmi_limits')
        .maybeSingle();
      if (overrideData?.value) {
        try { overrides = JSON.parse(overrideData.value); } catch {}
      }

      let defaults = { aiPrepLimit: 5, talkMockLimit: 5 };
      const { data: settingsData } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['vmi_ai_prep_monthly_limit', 'vmi_talk_mock_monthly_limit']);
      for (const row of settingsData || []) {
        if (row.key === 'vmi_ai_prep_monthly_limit') defaults.aiPrepLimit = parseInt(row.value, 10) || 5;
        if (row.key === 'vmi_talk_mock_monthly_limit') defaults.talkMockLimit = parseInt(row.value, 10) || 5;
      }

      const merged = (profilesData || [])
        .filter((p) => accessMap[p.id])
        .map((p) => {
          const access = accessMap[p.id];
          const userOverride = overrides[p.id] || {};
          return {
            ...p,
            access,
            aiPrepLimit: userOverride.aiPrepLimit != null ? userOverride.aiPrepLimit : defaults.aiPrepLimit,
            talkMockLimit: userOverride.talkMockLimit != null ? userOverride.talkMockLimit : defaults.talkMockLimit,
            aiPrepUsed: usageMap[p.id]?.ai_prep || 0,
            talkMockUsed: usageMap[p.id]?.talk_mock || 0,
            isPermanent: access.access_limit === 'unlimited',
          };
        });

      setUsers(merged);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (user) => {
    if (!window.confirm(`Reset VMI usage for ${user.full_name || user.email}?`)) return;
    setSavingId(user.id);
    setMessage({ type: '', text: '' });
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' });
      const currentMonth = formatter.format(now).slice(0, 7);

      await supabase
        .from('vmi_usage')
        .delete()
        .eq('user_id', user.id)
        .eq('month', currentMonth);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, aiPrepUsed: 0, talkMockUsed: 0 } : u
        )
      );
      setMessage({ type: 'success', text: `Usage reset for ${user.full_name || user.email}.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Reset failed.' });
    } finally {
      setSavingId(null);
    }
  };

  const handleMakePermanent = async (user, setPermanent) => {
    setSavingId(user.id);
    setMessage({ type: '', text: '' });
    try {
      const newLimit = setPermanent ? 'unlimited' : 'monthly_once';
      const { error } = await supabase
        .from('vmi_access')
        .update({ access_limit: newLimit, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isPermanent: setPermanent, access: { ...u.access, access_limit: newLimit } } : u
        )
      );
      setMessage({ type: 'success', text: setPermanent ? `${user.full_name || user.email} now has unlimited access.` : `Permanent removed for ${user.full_name || user.email}.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Update failed.' });
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateLimit = async (user, field, delta) => {
    const newVal = user[field] + delta;
    if (newVal < 1 || newVal > 999) return;
    setSavingId(user.id);
    setMessage({ type: '', text: '' });
    try {
      const { data: overrideData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'user_vmi_limits')
        .maybeSingle();

      let overrides = {};
      if (overrideData?.value) { try { overrides = JSON.parse(overrideData.value); } catch {} }

      const limitKey = field === 'aiPrepLimit' ? 'aiPrepLimit' : 'talkMockLimit';
      overrides[user.id] = {
        ...overrides[user.id],
        [limitKey]: newVal,
        updatedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'user_vmi_limits', value: JSON.stringify(overrides) }, { onConflict: 'key' });
      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, [field]: newVal } : u
        )
      );
      setMessage({ type: 'success', text: `${field === 'aiPrepLimit' ? 'AI Prep' : 'Talk Mock'} limit updated to ${newVal} for ${user.full_name || user.email}.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Update failed.' });
    } finally {
      setSavingId(null);
    }
  };

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
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 p-6 rounded-xl text-white">
        <h1 className="text-2xl font-bold mb-1">VMI Limit Settings</h1>
        <p className="text-indigo-200">Manage per-user VMI credits, usage, and access levels.</p>
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-700">User</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Access</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-700">AI Prep</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-700">Talk Mock</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">No users with VMI access found.</td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <User size={18} className="text-indigo-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{user.full_name || 'No name'}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
                        user.access?.ai_prep_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Brain size={12} /> {user.access?.ai_prep_enabled ? 'Enabled' : 'Off'}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
                        user.access?.talk_mock_enabled ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Mic size={12} /> {user.access?.talk_mock_enabled ? 'Enabled' : 'Off'}
                      </span>
                      {user.isPermanent && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit bg-amber-100 text-amber-700">
                          <Infinity size={12} /> Permanent
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateLimit(user, 'aiPrepLimit', -1)}
                          disabled={savingId === user.id || user.aiPrepLimit <= 1}
                          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center disabled:opacity-40"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-bold text-lg text-slate-900 min-w-[3ch] text-center">{user.aiPrepLimit}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateLimit(user, 'aiPrepLimit', 1)}
                          disabled={savingId === user.id || user.aiPrepLimit >= 999}
                          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center disabled:opacity-40"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="text-xs text-slate-500">
                        Used: <strong className={user.aiPrepUsed >= user.aiPrepLimit ? 'text-red-500' : 'text-emerald-600'}>{user.aiPrepUsed}</strong> / {user.aiPrepLimit}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateLimit(user, 'talkMockLimit', -1)}
                          disabled={savingId === user.id || user.talkMockLimit <= 1}
                          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center disabled:opacity-40"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-bold text-lg text-slate-900 min-w-[3ch] text-center">{user.talkMockLimit}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateLimit(user, 'talkMockLimit', 1)}
                          disabled={savingId === user.id || user.talkMockLimit >= 999}
                          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center disabled:opacity-40"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="text-xs text-slate-500">
                        Used: <strong className={user.talkMockUsed >= user.talkMockLimit ? 'text-red-500' : 'text-emerald-600'}>{user.talkMockUsed}</strong> / {user.talkMockLimit}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleReset(user)}
                        disabled={savingId === user.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 text-xs font-semibold disabled:opacity-50 transition-colors"
                        title="Reset monthly usage"
                      >
                        {savingId === user.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMakePermanent(user, !user.isPermanent)}
                        disabled={savingId === user.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors ${
                          user.isPermanent
                            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                            : 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100'
                        }`}
                        title={user.isPermanent ? 'Remove permanent access' : 'Make permanent (unlimited)'}
                      >
                        {savingId === user.id ? <Loader2 size={12} className="animate-spin" /> : <Infinity size={12} />}
                        {user.isPermanent ? 'Remove Perm' : 'Perm'}
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
        <strong>Note:</strong> Showing only users who have been granted VMI access. Use <strong>VMI Settings</strong> to grant/revoke access. Limits shown are per-user overrides or system defaults.
      </div>
    </div>
  );
};

export default AdminVMILimitSettings;
