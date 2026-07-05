import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { KeyRound, Save, Users, Loader2, Search, X, UserCheck, Eye, EyeOff, Trash2 } from 'lucide-react';
import { getGroqApiKey, setGroqApiKey, getAuthorizedUsers, setAuthorizedUsers } from '../utils/ahi';

const AdminAHI = () => {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [authorizedIds, setAuthorizedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [key, users] = await Promise.all([getGroqApiKey(), getAuthorizedUsers()]);
      setApiKey(key || '');
      setSavedKey(key || '');
      setAuthorizedIds(users);
    } catch {
      setMsg({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = async () => {
    setSaving(true);
    setMsg({ type: '', text: '' });
    const err = await setGroqApiKey(apiKey);
    if (err) {
      setMsg({ type: 'error', text: err.message });
    } else {
      setSavedKey(apiKey);
      setMsg({ type: 'success', text: 'API key saved' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3000);
    }
    setSaving(false);
  };

  const handleSaveUsers = async () => {
    setSaving(true);
    setMsg({ type: '', text: '' });
    const err = await setAuthorizedUsers(authorizedIds);
    if (err) {
      setMsg({ type: 'error', text: err.message });
    } else {
      setMsg({ type: 'success', text: 'Authorized users saved' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3000);
    }
    setSaving(false);
  };

  const searchUsers = async (q) => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(10);
      setSearchResults(data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addUser = (user) => {
    if (!authorizedIds.find((u) => u.id === user.id)) {
      setAuthorizedIds([...authorizedIds, user]);
    }
    setUserSearch('');
    setSearchResults([]);
  };

  const removeUser = (userId) => {
    setAuthorizedIds(authorizedIds.filter((u) => u.id !== userId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Loader2 size={32} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-violet-500 flex items-center justify-center">
              <KeyRound size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">AHI Settings</h1>
              <p className="text-xs text-gray-500">AI Human Interview configuration</p>
            </div>
          </div>

          {msg.text && (
            <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${
              msg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {msg.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Groq API Key</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-10 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  onClick={handleSaveKey}
                  disabled={saving || !apiKey}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition disabled:opacity-50"
                >
                  <Save size={14} />
                  Save
                </button>
              </div>
              {savedKey && (
                <p className="text-xs text-emerald-600 mt-1">✓ Key is configured</p>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Authorized Users</label>
              <p className="text-xs text-gray-500 mb-3">Users listed here can access the AHI interview feature.</p>

              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  placeholder="Search users by name or email..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {userSearch && (
                  <button onClick={() => { setUserSearch(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              {searching && <p className="text-xs text-gray-400 mb-2">Searching...</p>}

              {searchResults.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg mb-3 max-h-48 overflow-y-auto">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => addUser(u)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left text-sm"
                    >
                      <UserCheck size={14} className="text-gray-400" />
                      <span className="font-medium text-gray-700">{u.full_name || 'Unknown'}</span>
                      <span className="text-gray-400 text-xs">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}

              {authorizedIds.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No users authorized yet</p>
              ) : (
                <div className="space-y-1.5">
                  {authorizedIds.map((u) => (
                    <div key={u.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">{u.full_name || 'Unknown'}</span>
                        <span className="text-xs text-gray-400">{u.email}</span>
                      </div>
                      <button onClick={() => removeUser(u.id)} className="text-gray-400 hover:text-red-500 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleSaveUsers}
                disabled={saving}
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition disabled:opacity-50"
              >
                <Save size={14} />
                Save Users
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAHI;
