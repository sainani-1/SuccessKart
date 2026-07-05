import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Activity, Mail, Search, X, Loader2, RefreshCw, Clock, Monitor, Smartphone, Laptop, MapPin, Building2, Globe, AlertTriangle, User } from 'lucide-react';

const DeviceIcon = ({ ua }) => {
  if (!ua) return <Monitor size={14} />;
  const s = ua.toLowerCase();
  if (s.includes('iphone') || s.includes('ipad')) return <Smartphone size={14} />;
  if (s.includes('android')) return <Smartphone size={14} />;
  if (s.includes('windows') || s.includes('mac') || s.includes('linux')) return <Laptop size={14} />;
  return <Monitor size={14} />;
};

const formatDuration = (ms) => {
  if (!ms || ms < 0) return 'Unknown';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  if (days < 365) {
    const rem = days % 30;
    return `${months}mo${rem > 0 ? ` ${rem}d` : ''} ago`;
  }
  const rem = days % 365;
  const remMonths = Math.floor(rem / 30);
  return `${years}y${remMonths > 0 ? ` ${remMonths}mo` : ''} ago`;
};

const formatInactiveLabel = (ms) => {
  if (!ms || ms < 0) return { label: 'Unknown', color: 'text-gray-400' };
  const days = Math.floor(ms / 86400000);
  if (days < 1) return { label: 'Active now', color: 'text-emerald-600' };
  if (days < 3) return { label: '1-2 days', color: 'text-emerald-500' };
  if (days < 7) return { label: `${days} days`, color: 'text-amber-500' };
  if (days < 30) return { label: `${days} days`, color: 'text-orange-500' };
  if (days < 365) {
    const months = Math.floor(days / 30);
    return { label: `${months}mo ${days % 30}d`, color: 'text-red-500' };
  }
  const years = Math.floor(days / 365);
  const rem = Math.floor((days % 365) / 30);
  return { label: `${years}y ${rem}mo`, color: 'text-red-600' };
};

const AdminLastActive = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: logins, error: loginErr } = await supabase
        .from('login_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000);

      if (loginErr) throw loginErr;

      const latestPerUser = {};
      (logins || []).forEach((entry) => {
        if (entry.user_id && !latestPerUser[entry.user_id]) {
          latestPerUser[entry.user_id] = entry;
        }
      });

      const userIds = Object.keys(latestPerUser);
      if (userIds.length === 0) {
        setUsers([]);
        return;
      }

      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .in('id', userIds);

      if (profileErr) throw profileErr;

      const profileMap = {};
      (profiles || []).forEach((p) => {
        profileMap[p.id] = p;
      });

      const merged = userIds
        .map((id) => {
          const login = latestPerUser[id];
          const profile = profileMap[id] || {};
          return {
            id,
            full_name: profile.full_name || login.full_name || 'Unknown',
            email: profile.email || login.email || '',
            role: profile.role || 'user',
            lastActiveAt: login.created_at,
            action: login.action,
            device: login.device_name,
            ip: login.ip_address,
            city: login.city,
            region: login.region,
            country: login.country,
            isp: login.isp,
            org: login.org,
            timezone: login.timezone,
            userAgent: login.user_agent,
          };
        })
        .sort((a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt));

      setUsers(merged);
    } catch (err) {
      setError(err?.message || err || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.ip || '').toLowerCase().includes(q) ||
      (u.city || '').toLowerCase().includes(q) ||
      (u.country || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Loader2 size={32} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 shadow-lg p-8 max-w-md text-center">
          <AlertTriangle size={40} className="mx-auto mb-3 text-red-400" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Failed to Load</h2>
          <p className="text-sm text-red-600 mb-4 break-words">{error}</p>
          <p className="text-xs text-gray-500 mb-4">Make sure the login_history migration has been run in Supabase SQL editor.</p>
          <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition">
            <RefreshCw size={14} className="inline mr-2" />Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 md:p-6 border-b border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500 flex items-center justify-center">
                  <Activity size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-gray-800">Last Active</h1>
                  <p className="text-xs text-gray-500">{users.length} users tracked</p>
                </div>
              </div>
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>

            <div className="relative mt-4 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, IP, or location..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Activity size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No activity data found</p>
              <p className="text-xs text-gray-400 mt-1">User activity will appear here once they log in</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map((user) => {
                const now = Date.now();
                const lastActive = new Date(user.lastActiveAt).getTime();
                const inactiveMs = now - lastActive;
                const status = formatInactiveLabel(inactiveMs);

                return (
                  <div key={user.id} className="p-4 md:p-5 hover:bg-gray-50/50 transition">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center">
                        <User size={16} className="text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">
                                {user.full_name}
                              </span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color} bg-gray-100`}>
                                {status.label}
                              </span>
                              <span className="text-xs text-gray-400 hidden sm:inline">·</span>
                              <span className="text-xs text-gray-500 truncate max-w-[180px]">{user.email}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
                            <Clock size={11} />
                            <span>{formatDuration(inactiveMs)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <Clock size={11} className="text-gray-400" />
                            Last: {new Date(user.lastActiveAt).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                          <span className="text-gray-300 hidden sm:inline">|</span>
                          <span className="flex items-center gap-1.5">
                            <DeviceIcon ua={user.userAgent} />
                            {user.device || 'Unknown device'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs">
                          {user.ip && (
                            <span className="font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                              {user.ip}
                            </span>
                          )}
                          {(user.city || user.region || user.country) && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <MapPin size={11} />
                              {[user.city, user.region, user.country].filter(Boolean).join(', ')}
                            </span>
                          )}
                          {(user.isp || user.org) && (
                            <span className="flex items-center gap-1 text-gray-400">
                              <Building2 size={11} />
                              {user.isp || user.org}
                            </span>
                          )}
                          {user.timezone && (
                            <span className="flex items-center gap-1 text-gray-400">
                              <Globe size={11} />
                              {user.timezone}
                            </span>
                          )}
                        </div>

                        {user.userAgent && (
                          <div className="mt-1.5">
                            <span className="text-[11px] text-gray-400 font-mono truncate block max-w-full" title={user.userAgent}>
                              {user.userAgent}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {users.length > 0 && (
            <div className="px-4 md:px-5 py-3 border-t border-gray-100">
              <p className="text-center text-xs text-gray-400">Showing {filteredUsers.length} of {users.length} users sorted by most recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLastActive;
