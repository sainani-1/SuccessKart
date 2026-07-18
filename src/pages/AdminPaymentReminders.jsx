import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import AlertModal from '../components/AlertModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { Mail, Clock, AlertTriangle, Send, RefreshCcw } from 'lucide-react';

const AdminPaymentReminders = () => {
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, premium_until')
        .not('premium_until', 'is', null)
        .order('premium_until', { ascending: true });

      if (error) throw error;

      const filtered = (data || []).filter((p) => {
        if (!p.email) return false;
        const expiry = new Date(p.premium_until);
        return expiry <= threeDays;
      });

      setUsers(filtered);
    } catch (err) {
      setAlertModal({ show: true, title: 'Error', message: err.message || 'Failed to load users', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const triggerReminders = async () => {
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('send-payment-reminders', {
        body: {},
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw new Error(res.error.message || 'Edge function failed');

      const result = res.data;
      setAlertModal({
        show: true,
        title: 'Reminders Sent',
        message: `Successfully sent ${result.reminders_sent} reminder(s) out of ${result.total_found} users.${result.errors ? '\n\nErrors:\n' + result.errors.join('\n') : ''}`,
        type: 'success',
      });
      await loadUsers();
    } catch (err) {
      setAlertModal({ show: true, title: 'Failed', message: err.message || 'Could not send reminders', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const getStatus = (premiumUntil) => {
    const now = new Date();
    const expiry = new Date(premiumUntil);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { label: 'Expired', color: 'bg-red-100 text-red-700', icon: <AlertTriangle size={14} /> };
    if (diffDays === 1) return { label: 'Expires Tomorrow', color: 'bg-orange-100 text-orange-700', icon: <Clock size={14} /> };
    return { label: `${diffDays} days left`, color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={14} /> };
  };

  const filtered = users.filter((u) => {
    const now = new Date();
    const expiry = new Date(u.premium_until);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (filter === 'expired') return diffDays <= 0;
    if (filter === 'expiring') return diffDays > 0 && diffDays <= 3;
    return true;
  });

  const expiredCount = users.filter((u) => new Date(u.premium_until) <= new Date()).length;
  const expiringCount = users.length - expiredCount;

  return (
    <div className="space-y-6">
      <AlertModal
        show={alertModal.show}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({ show: false, title: '', message: '', type: 'info' })}
      />

      <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 rounded-xl text-white">
        <div className="flex items-center gap-3 mb-1">
          <Mail size={28} />
          <h1 className="text-2xl font-bold">Payment Reminders</h1>
        </div>
        <p className="text-orange-100">Send expiry reminder emails to users with expiring or expired premium subscriptions.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><Clock size={16} /><span>Expiring in 3 days</span></div>
          <p className="text-2xl font-bold text-slate-900">{expiringCount}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-500 text-sm mb-1"><AlertTriangle size={16} /><span>Already Expired</span></div>
          <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-500 text-sm mb-1"><Send size={16} /><span>Total Affected</span></div>
          <p className="text-2xl font-bold text-blue-600">{users.length}</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-wrap">
          {['all', 'expiring', 'expired'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'expiring' ? 'Expiring' : 'Expired'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60 text-sm font-medium"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
          <button
            onClick={triggerReminders}
            disabled={sending || users.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-semibold hover:from-orange-600 hover:to-red-700 disabled:opacity-60 transition-all"
          >
            <Send size={16} /> {sending ? 'Sending...' : 'Send All Reminders'}
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-x-auto">
        {loading ? (
          <div className="p-8"><LoadingSpinner fullPage={false} message="Loading users..." /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Mail className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p>No users with expiring or expired premiums.</p>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Premium Until</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const status = getStatus(u.premium_until);
                return (
                  <tr key={u.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{u.full_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(u.premium_until).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminPaymentReminders;
