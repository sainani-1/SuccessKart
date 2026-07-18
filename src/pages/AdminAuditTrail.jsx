import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, Filter, User, CreditCard, BookOpen, Settings, Mail, Download, Search } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const PAGE_SIZE = 50;

const ACTION_CATEGORIES = {
  'All Actions': '',
  'User Actions': 'user_approve,user_reject,user_delete,user_disable,user_lock',
  'Payment Actions': 'payment_approve,payment_reject',
  'Course Actions': 'course_create,course_update,course_delete',
  'Other': 'assignment_create,settings_change,email_send,bulk_import,push_send',
};

const ACTION_ICONS = {
  user_approve: <User size={14} className="text-green-600" />,
  user_reject: <User size={14} className="text-red-600" />,
  user_delete: <User size={14} className="text-red-600" />,
  user_disable: <User size={14} className="text-orange-600" />,
  user_lock: <User size={14} className="text-red-700" />,
  payment_approve: <CreditCard size={14} className="text-green-600" />,
  payment_reject: <CreditCard size={14} className="text-red-600" />,
  course_create: <BookOpen size={14} className="text-blue-600" />,
  course_update: <BookOpen size={14} className="text-yellow-600" />,
  course_delete: <BookOpen size={14} className="text-red-600" />,
  settings_change: <Settings size={14} className="text-purple-600" />,
  email_send: <Mail size={14} className="text-blue-600" />,
  bulk_import: <Download size={14} className="text-emerald-600" />,
  push_send: <Mail size={14} className="text-orange-600" />,
};

const AdminAuditTrail = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [adminProfiles, setAdminProfiles] = useState({});
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      setRows(data || []);

      const adminIds = [...new Set((data || []).map((r) => r.performed_by).filter(Boolean))];
      if (adminIds.length > 0) {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', adminIds);
        const map = {};
        (admins || []).forEach((a) => { map[a.id] = a; });
        setAdminProfiles(map);
      }
    } catch {
      // Table may not exist yet
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (actionFilter) {
        const categoryActions = ACTION_CATEGORIES[actionFilter]?.split(',') || [];
        if (categoryActions.length > 0 && !categoryActions.includes(r.action)) return false;
      }
      if (dateFrom) {
        const rowDate = new Date(r.created_at);
        if (rowDate < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const rowDate = new Date(r.created_at);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (rowDate > to) return false;
      }
      if (q) {
        const searchable = [r.action, r.target_type, r.target_id, r.details, r.performed_by]
          .map((v) => String(v || '').toLowerCase())
          .join(' ');
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [rows, actionFilter, search, dateFrom, dateTo]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todayCount = rows.filter((r) => new Date(r.created_at) >= today).length;
  const weekCount = rows.filter((r) => new Date(r.created_at) >= weekAgo).length;
  const actionCounts = {};
  rows.forEach((r) => { actionCounts[r.action] = (actionCounts[r.action] || 0) + 1; });
  const mostCommon = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];

  const exportCSV = () => {
    const headers = ['Timestamp', 'Action', 'Target Type', 'Target ID', 'Performed By', 'Details'];
    const csvRows = filtered.map((r) => [
      r.created_at,
      r.action,
      r.target_type || '',
      r.target_id || '',
      adminProfiles[r.performed_by]?.full_name || r.performed_by || '',
      (r.details || '').replace(/"/g, '""'),
    ]);
    const csv = [headers.join(','), ...csvRows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_trail_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-6 rounded-xl text-white">
        <div className="flex items-center gap-3 mb-1">
          <Shield size={28} />
          <h1 className="text-2xl font-bold">Audit Trail</h1>
        </div>
        <p className="text-slate-300">Track all admin actions across the platform with full details.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><Shield size={16} /><span>Actions Today</span></div>
          <p className="text-2xl font-bold text-slate-900">{todayCount}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-500 text-sm mb-1"><Filter size={16} /><span>Actions This Week</span></div>
          <p className="text-2xl font-bold text-blue-600">{weekCount}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-purple-500 text-sm mb-1"><Search size={16} /><span>Most Common</span></div>
          <p className="text-lg font-bold text-purple-700 truncate">{mostCommon ? mostCommon[0].replace(/_/g, ' ') : '—'}</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-500 mb-1 block">From</label>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-500 mb-1 block">To</label>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-500 mb-1 block">Action Category</label>
          <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(0); }} className="w-full px-3 py-2 border rounded-lg text-sm">
            {Object.keys(ACTION_CATEGORIES).map((cat) => (
              <option key={cat} value={ACTION_CATEGORIES[cat] || ''}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-500 mb-1 block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Target ID, details..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
        <button onClick={exportCSV} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium whitespace-nowrap">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="bg-white border rounded-xl overflow-x-auto">
        {loading ? (
          <div className="p-8"><LoadingSpinner fullPage={false} message="Loading audit trail..." /></div>
        ) : paged.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Shield className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p>No audit log entries found.</p>
          </div>
        ) : (
          <>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Target Type</th>
                  <th className="px-4 py-3 text-left">Target ID</th>
                  <th className="px-4 py-3 text-left">Performed By</th>
                  <th className="px-4 py-3 text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-700">
                        {ACTION_ICONS[r.action] || <Shield size={14} />}
                        {(r.action || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.target_type || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs break-all max-w-[150px]">{r.target_id || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {adminProfiles[r.performed_by]?.full_name || r.performed_by?.slice(0, 8) || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs">
                      <pre className="whitespace-pre-wrap break-words line-clamp-3">{r.details || '—'}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
              <p className="text-xs text-slate-500">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 rounded border text-sm disabled:opacity-50 hover:bg-slate-100"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 rounded border text-sm disabled:opacity-50 hover:bg-slate-100"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAuditTrail;
