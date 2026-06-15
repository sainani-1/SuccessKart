import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Save, Trash2, Brain, Mic, CheckCircle, XCircle, Clock, Mail, Users, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logAdminActivity } from '../utils/adminActivityLogger';

const TABS = [
  { key: 'access', label: 'Access', icon: Users },
  { key: 'requests', label: 'Requests', icon: Mail },
];

const AdminVMISettings = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('access');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [edits, setEdits] = useState({});

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <p className="text-red-400 text-lg">Admins only.</p>
      </div>
    );
  }

  useEffect(() => {
    if (activeTab === 'requests') fetchRequests();
  }, [activeTab]);

  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vmi_access_requests')
        .select('*, profiles:user_id(full_name, email, role)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load requests.' });
    } finally {
      setRequestsLoading(false);
    }
  };

  const searchUsers = async () => {
    const query = search.trim().toLowerCase();
    if (!query) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(50);
      if (error) throw error;

      const userIds = (profiles || []).map((p) => p.id);
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

      const merged = (profiles || []).map((p) => ({
        ...p,
        access: accessMap[p.id] || null,
      }));
      setUsers(merged);
      if (!merged.length) {
        setMessage({ type: 'info', text: 'No users found matching your search.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Search failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (userId, field) => {
    setEdits((prev) => {
      const current = users.find((u) => u.id === userId);
      const existingAccess = current?.access;
      const prevEdit = prev[userId];
      const base = prevEdit || existingAccess
        ? { ...(prevEdit || existingAccess) }
        : { ai_prep_enabled: false, talk_mock_enabled: false, access_limit: 'unlimited' };
      return { ...prev, [userId]: { ...base, [field]: !base[field] } };
    });
  };

  const handleLimitChange = (userId, value) => {
    setEdits((prev) => {
      const current = users.find((u) => u.id === userId);
      const existingAccess = current?.access;
      const prevEdit = prev[userId];
      const base = prevEdit || existingAccess
        ? { ...(prevEdit || existingAccess) }
        : { ai_prep_enabled: false, talk_mock_enabled: false, access_limit: 'unlimited' };
      return { ...prev, [userId]: { ...base, access_limit: value } };
    });
  };

  const handleSave = async (userId) => {
    const edit = edits[userId];
    if (!edit) return;
    setSavingId(userId);
    setMessage({ type: '', text: '' });
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const current = users.find((u) => u.id === userId);
      const hasExisting = !!current?.access;

      if (hasExisting) {
        const { error } = await supabase
          .from('vmi_access')
          .update({
            ai_prep_enabled: edit.ai_prep_enabled,
            talk_mock_enabled: edit.talk_mock_enabled,
            access_limit: edit.access_limit,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vmi_access')
          .insert({
            user_id: userId,
            ai_prep_enabled: edit.ai_prep_enabled,
            talk_mock_enabled: edit.talk_mock_enabled,
            access_limit: edit.access_limit,
            granted_by: user?.id || profile?.id,
          });
        if (error) throw error;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, access: { ...(u.access || {}), ...edit, user_id: userId } }
            : u
        )
      );
      setEdits((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });

      await logAdminActivity({
        adminId: user?.id || profile?.id,
        action: hasExisting ? 'Updated VMI access' : 'Granted VMI access',
        target: userId,
        details: {
          module: 'vmi-settings',
          ai_prep_enabled: edit.ai_prep_enabled,
          talk_mock_enabled: edit.talk_mock_enabled,
          access_limit: edit.access_limit,
        },
      });

      setMessage({ type: 'success', text: hasExisting ? 'Access updated.' : 'Access granted.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save.' });
    } finally {
      setSavingId(null);
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove all VMI access for this user?')) return;
    setSavingId(userId);
    setMessage({ type: '', text: '' });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('vmi_access')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, access: null } : u))
      );

      await logAdminActivity({
        adminId: user?.id || profile?.id,
        action: 'Revoked VMI access',
        target: userId,
        details: { module: 'vmi-settings' },
      });

      setMessage({ type: 'success', text: 'Access revoked.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to remove.' });
    } finally {
      setSavingId(null);
    }
  };

  const handleApproveRequest = async (request) => {
    setSavingId(request.id);
    setMessage({ type: '', text: '' });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user?.id || profile?.id;

      await supabase
        .from('vmi_access_requests')
        .update({ status: 'approved', reviewed_by: adminId, reviewed_at: new Date().toISOString() })
        .eq('id', request.id);

      const features = request.requested_feature === 'talk_mock'
        ? { talk_mock_enabled: true, ai_prep_enabled: false }
        : request.requested_feature === 'ai_prep'
          ? { ai_prep_enabled: true, talk_mock_enabled: false }
          : { ai_prep_enabled: true, talk_mock_enabled: true };

      const { data: existing } = await supabase
        .from('vmi_access')
        .select('id')
        .eq('user_id', request.user_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('vmi_access')
          .update({ ...features, updated_at: new Date().toISOString() })
          .eq('user_id', request.user_id);
      } else {
        await supabase
          .from('vmi_access')
          .insert({ user_id: request.user_id, ...features, access_limit: 'unlimited', granted_by: adminId });
      }

      await logAdminActivity({
        adminId,
        action: 'Approved VMI access request',
        target: request.user_id,
        details: { module: 'vmi-settings', request_id: request.id, ...features },
      });

      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      setMessage({ type: 'success', text: 'Request approved and access granted.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to approve.' });
    } finally {
      setSavingId(null);
    }
  };

  const handleDenyRequest = async (request) => {
    setSavingId(request.id);
    setMessage({ type: '', text: '' });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user?.id || profile?.id;

      await supabase
        .from('vmi_access_requests')
        .update({ status: 'denied', reviewed_by: adminId, reviewed_at: new Date().toISOString() })
        .eq('id', request.id);

      await logAdminActivity({
        adminId,
        action: 'Denied VMI access request',
        target: request.user_id,
        details: { module: 'vmi-settings', request_id: request.id },
      });

      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      setMessage({ type: 'success', text: 'Request denied.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to deny.' });
    } finally {
      setSavingId(null);
    }
  };

  const getEdit = (userId) => {
    const current = users.find((u) => u.id === userId);
    return edits[userId] || current?.access || null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-indigo-300/20 shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
              <Mic size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">VMI Settings</h1>
              <p className="text-indigo-300 text-sm">Manage access to Voice Mock Interviews (AI Prep &amp; Talk Mock Interviews).</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-2 border-b border-indigo-400/20">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const count = tab.key === 'requests' ? requests.length : null;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors rounded-t-xl ${
                    isActive
                      ? 'bg-white/10 text-white border-b-2 border-indigo-500'
                      : 'text-indigo-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                  {count > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </button>
              );
            })}
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

          {/* Access Tab */}
          {activeTab === 'access' && (
            <>
              <div className="mt-6 flex gap-3">
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

              <div className="mt-6 space-y-3">
                {loading ? (
                  <p className="text-center text-indigo-300 py-8">Searching...</p>
                ) : users.length === 0 ? (
                  <p className="text-center text-indigo-400 py-8">Search for students to manage their VMI access.</p>
                ) : users.map((user) => {
                  const edit = getEdit(user.id);
                  const hasChanges = !!edits[user.id];
                  const hasAccess = !!user.access;
                  const aiPrep = edit?.ai_prep_enabled ?? false;
                  const talkMock = edit?.talk_mock_enabled ?? false;
                  const limit = edit?.access_limit ?? 'unlimited';
                  return (
                    <div key={user.id} className="bg-white/5 rounded-xl border border-indigo-400/20 p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white truncate">{user.full_name || 'Unknown'}</p>
                            <p className="text-sm text-indigo-300 truncate">{user.email} • {user.role}</p>
                            {hasAccess && (
                              <span className="inline-block mt-1 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">Active</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <button
                              type="button"
                              onClick={() => handleToggle(user.id, 'ai_prep_enabled')}
                              className={`relative w-10 h-6 rounded-full transition-colors ${
                                aiPrep ? 'bg-indigo-600' : 'bg-slate-700'
                              }`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                                aiPrep ? 'translate-x-4' : ''
                              }`} />
                            </button>
                            <div className="flex items-center gap-1 text-sm">
                              <Brain size={14} className="text-indigo-300" />
                              <span className={aiPrep ? 'text-white' : 'text-slate-500'}>AI Prep</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <button
                              type="button"
                              onClick={() => handleToggle(user.id, 'talk_mock_enabled')}
                              className={`relative w-10 h-6 rounded-full transition-colors ${
                                talkMock ? 'bg-purple-600' : 'bg-slate-700'
                              }`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                                talkMock ? 'translate-x-4' : ''
                              }`} />
                            </button>
                            <div className="flex items-center gap-1 text-sm">
                              <Mic size={14} className="text-indigo-300" />
                              <span className={talkMock ? 'text-white' : 'text-slate-500'}>Talk Mock</span>
                            </div>
                          </label>

                          <select
                            value={limit}
                            onChange={(e) => handleLimitChange(user.id, e.target.value)}
                            className="bg-slate-800 border border-indigo-400/30 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="unlimited">Unlimited</option>
                            <option value="monthly_once">Monthly Once</option>
                          </select>

                          <div className="flex items-center gap-2 ml-auto">
                            {hasChanges ? (
                              <button
                                type="button"
                                onClick={() => handleSave(user.id)}
                                disabled={savingId === user.id}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
                              >
                                <Save size={14} /> Save
                              </button>
                            ) : null}
                            {hasAccess && (
                              <button
                                type="button"
                                onClick={() => handleRemove(user.id)}
                                disabled={savingId === user.id}
                                className="bg-red-600/20 hover:bg-red-600/40 text-red-400 px-3 py-1.5 rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"
                                title="Revoke all access"
                              >
                                <Trash2 size={14} /> Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="mt-6 space-y-3">
              {requestsLoading ? (
                <p className="text-center text-indigo-300 py-8 flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" /> Loading requests...
                </p>
              ) : requests.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle size={40} className="mx-auto text-emerald-400/60" />
                  <p className="mt-3 text-indigo-400 font-medium">No pending requests</p>
                  <p className="text-sm text-indigo-500 mt-1">Students requesting access will appear here.</p>
                </div>
              ) : (
                requests.map((req) => {
                  const userProfile = req.profiles || {};
                  return (
                    <div key={req.id} className="bg-white/5 rounded-xl border border-amber-400/20 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-amber-400" />
                            <p className="font-semibold text-white truncate">{userProfile.full_name || 'Unknown'}</p>
                          </div>
                          <p className="text-sm text-indigo-300 truncate mt-0.5">{userProfile.email || 'No email'} • {userProfile.role || 'student'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full capitalize">{req.requested_feature === 'both' ? 'AI Prep + Talk Mock' : req.requested_feature === 'ai_prep' ? 'AI Prep' : 'Talk Mock'}</span>
                            <span className="text-[11px] text-indigo-400">
                              {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveRequest(req)}
                            disabled={savingId === req.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {savingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDenyRequest(req)}
                            disabled={savingId === req.id}
                            className="bg-red-600/20 hover:bg-red-600/40 text-red-400 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <XCircle size={14} /> Deny
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          <div className="mt-8 bg-white/5 backdrop-blur-lg rounded-2xl border border-indigo-300/10 p-6">
            <h2 className="text-lg font-semibold text-white mb-3">How VMI access works</h2>
            <ul className="space-y-2 text-sm text-indigo-300">
              <li><strong className="text-white">AI Prep</strong> — Text-based AI interview preparation (10 questions, scored).</li>
              <li><strong className="text-white">Talk Mock Interviews</strong> — Voice-based mock interview using speech recognition.</li>
              <li><strong className="text-white">Unlimited</strong> — Student can use the feature any number of times.</li>
              <li><strong className="text-white">Monthly Once</strong> — Student can use the feature once per month. Usage resets on the 1st of each month.</li>
              <li><strong className="text-white">Requests</strong> — Students who try to access these features directly can request access. Approve them here.</li>
              <li>Only students with granted access will see these features in their sidebar.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminVMISettings;
