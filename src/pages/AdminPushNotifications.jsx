import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Send, Users, Bell } from 'lucide-react';
import AlertModal from '../components/AlertModal';

const AdminPushNotifications = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetUrl, setTargetUrl] = useState('/app');
  const [targetRole, setTargetRole] = useState('all');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .eq('type', 'push')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setHistory(data || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim()) {
      setAlertModal({ show: true, title: 'Required', message: 'Please enter a notification title.', type: 'warning' });
      return;
    }
    if (!body.trim()) {
      setAlertModal({ show: true, title: 'Required', message: 'Please enter notification body text.', type: 'warning' });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: title.trim(),
          body: body.trim(),
          target_url: targetUrl.trim() || '/app',
          target_role: targetRole,
        },
      });

      if (error) {
        let detail = error.message;
        try {
          const ctx = await error.context?.clone()?.json();
          if (ctx?.error) detail = ctx.error;
        } catch {}
        throw new Error(detail);
      }

      setAlertModal({
        show: true,
        title: 'Push Sent',
        message: `Notification sent to ${data?.sent_count ?? 0} subscriber(s).`,
        type: 'success',
      });

      setTitle('');
      setBody('');
      setTargetUrl('/app');
      setTargetRole('all');
      loadHistory();
    } catch (error) {
      setAlertModal({
        show: true,
        title: 'Send Failed',
        message: error.message || 'Failed to send push notification.',
        type: 'error',
      });
    } finally {
      setSending(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return d;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-6 rounded-xl text-white">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Bell size={24} /> Push Notifications
        </h1>
        <p className="text-slate-200">Send browser push notifications to users.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100 space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Send size={18} /> Send Push Notification
        </h2>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Body *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Notification message body"
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Target URL</label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="/app"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5"><Users size={14} /> Target Role</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
            >
              <option value="all">All Users</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-gold-300 disabled:opacity-50"
        >
          <Send size={16} />
          {sending ? 'Sending...' : 'Send Push Notification'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Notification History</h2>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-gold-400 border-t-transparent" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No push notifications sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="pb-2 font-semibold">Title</th>
                  <th className="pb-2 font-semibold">Message</th>
                  <th className="pb-2 font-semibold">Target</th>
                  <th className="pb-2 font-semibold">Sent</th>
                </tr>
              </thead>
              <tbody>
                {history.map((n) => (
                  <tr key={n.id} className="border-b border-slate-50">
                    <td className="py-2.5 font-medium text-slate-900">{n.title || n.content?.substring(0, 40) || '-'}</td>
                    <td className="py-2.5 text-slate-600 max-w-[250px] truncate">{n.content || '-'}</td>
                    <td className="py-2.5 text-slate-500 capitalize">{n.target_role || 'all'}</td>
                    <td className="py-2.5 text-slate-400 whitespace-nowrap">{formatDate(n.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertModal
        show={alertModal.show}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({ show: false, title: '', message: '', type: 'info' })}
      />
    </div>
  );
};

export default AdminPushNotifications;
