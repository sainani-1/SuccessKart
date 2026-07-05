import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Clock, Mail, LogIn, LogOut, AlertTriangle, Monitor, RefreshCw, Loader2, Search, X, MapPin, Globe, Building2, Shield, Smartphone, Laptop } from 'lucide-react';

const ACTION_CONFIG = {
  login: { icon: LogIn, label: 'Login', color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  logout: { icon: LogOut, label: 'Logout', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', dot: 'bg-slate-400' },
  session_takeover: { icon: RefreshCw, label: 'Takeover', color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200', dot: 'bg-amber-500' },
  session_expired: { icon: AlertTriangle, label: 'Expired', color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200', dot: 'bg-red-500' },
};

const DeviceIcon = ({ ua }) => {
  if (!ua) return <Monitor size={14} />;
  const s = ua.toLowerCase();
  if (s.includes('iphone') || s.includes('ipad')) return <Smartphone size={14} />;
  if (s.includes('android')) return <Smartphone size={14} />;
  if (s.includes('windows') || s.includes('mac') || s.includes('linux')) return <Laptop size={14} />;
  return <Monitor size={14} />;
};

const AdminLoginHistory = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('login_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      setError(err?.message || err || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const filteredEntries = entries.filter((e) => {
    if (actionFilter !== 'all' && e.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchesUser = (e.full_name || '').toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q);
      const matchesDevice = (e.device_name || '').toLowerCase().includes(q);
      const matchesAction = (ACTION_CONFIG[e.action]?.label || '').toLowerCase().includes(q);
      const matchesIp = (e.ip_address || '').toLowerCase().includes(q);
      const matchesLocation = [e.city, e.region, e.country, e.isp, e.org].some((v) => (v || '').toLowerCase().includes(q));
      if (!matchesUser && !matchesDevice && !matchesAction && !matchesIp && !matchesLocation) return false;
    }
    return true;
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
          <button onClick={fetchHistory} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition">
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
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Clock size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-gray-800">Login History</h1>
                  <p className="text-xs text-gray-500">{entries.length} event{entries.length !== 1 ? 's' : ''} recorded</p>
                </div>
              </div>
              <button
                onClick={fetchHistory}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>

            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, device, IP, or location..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'login', label: 'Login' },
                  { value: 'logout', label: 'Logout' },
                  { value: 'session_takeover', label: 'Takeover' },
                  { value: 'session_expired', label: 'Expired' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setActionFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                      actionFilter === opt.value
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Clock size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No login history found</p>
              <p className="text-xs text-gray-400 mt-1">Events will appear here when users log in or out</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredEntries.map((entry) => {
                const action = ACTION_CONFIG[entry.action] || ACTION_CONFIG.login;
                const Icon = action.icon;
                return (
                  <div key={entry.id} className="p-4 md:p-5 hover:bg-gray-50/50 transition">
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${action.bg} border ${action.border} flex items-center justify-center`}>
                        <Icon size={16} className={action.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${action.bg} ${action.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${action.dot}`} />
                                {action.label}
                              </span>
                              <span className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">
                                {entry.full_name || 'Unknown User'}
                              </span>
                              <span className="text-xs text-gray-400 hidden sm:inline">·</span>
                              <span className="text-xs text-gray-500 truncate max-w-[180px]">{entry.email || ''}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                            <span className="hidden sm:inline">{formatDate(entry.created_at)}</span>
                            <span className="sm:hidden">{getRelativeTime(entry.created_at)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-2 flex-wrap text-xs">
                          <span className="flex items-center gap-1.5 text-gray-500">
                            <DeviceIcon ua={entry.user_agent} />
                            {entry.device_name || 'Unknown device'}
                          </span>
                          {entry.ip_address && (
                            <span className="font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                              {entry.ip_address}
                            </span>
                          )}
                          {(entry.city || entry.region || entry.country) && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <MapPin size={11} />
                              {[entry.city, entry.region, entry.country].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs">
                          {(entry.isp || entry.org) && (
                            <span className="flex items-center gap-1 text-gray-400">
                              <Building2 size={11} />
                              {entry.isp || entry.org}
                            </span>
                          )}
                          {entry.timezone && (
                            <span className="flex items-center gap-1 text-gray-400">
                              <Globe size={11} />
                              {entry.timezone}
                            </span>
                          )}
                        </div>

                        {entry.user_agent && (
                          <div className="mt-1.5">
                            <span className="text-[11px] text-gray-400 font-mono truncate block max-w-full" title={entry.user_agent}>
                              {entry.user_agent}
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

          {entries.length > 0 && (
            <div className="px-4 md:px-5 py-3 border-t border-gray-100">
              <p className="text-center text-xs text-gray-400">Showing last {entries.length} events</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLoginHistory;
