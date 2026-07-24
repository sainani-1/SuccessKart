import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ListChecks, Check, X, Loader2, Search, User, Mail, Clock, ExternalLink } from 'lucide-react';
import AlertModal from '../components/AlertModal';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

const callEdgeFunction = async (functionName, accessToken, body) => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify(body),
  });
  let payload = null;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok) throw new Error(payload?.error || payload?.message || `${functionName} failed.`);
  return payload;
};

const AdminSucesskartMeetPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('pending');
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });

  const loadPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_tag', 'sucesskart_meet')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (p) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, phone, avatar_url')
            .eq('id', p.user_id)
            .maybeSingle();
          return { ...p, profile };
        })
      );

      const deduped = [];
      const seen = new Set();
      for (const p of enriched) {
        const key = `${p.user_id}_${p.status}`;
        if (!seen.has(key) || p.status !== 'pending') {
          deduped.push(p);
          seen.add(key);
        }
      }

      setPayments(deduped);
    } catch (err) {
      setAlertModal({ show: true, title: 'Error', message: err.message || 'Failed to load payments.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPayments(); }, []);

  const handleApprove = async (payment) => {
    setActionLoading(payment.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      await callEdgeFunction('admin-review-sucesskart-meet-payment', token, {
        payment_id: payment.id,
        action: 'approve',
        user_id: payment.user_id,
      });

      setAlertModal({ show: true, title: 'Approved', message: 'Payment approved and API key generated.', type: 'success' });
      loadPayments();
    } catch (err) {
      setAlertModal({ show: true, title: 'Error', message: err.message || 'Failed to approve.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (payment) => {
    setActionLoading(payment.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      await callEdgeFunction('admin-review-sucesskart-meet-payment', token, {
        payment_id: payment.id,
        action: 'reject',
        user_id: payment.user_id,
      });

      setAlertModal({ show: true, title: 'Rejected', message: 'Payment request rejected.', type: 'info' });
      loadPayments();
    } catch (err) {
      setAlertModal({ show: true, title: 'Error', message: err.message || 'Failed to reject.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (filterTab === 'pending' && p.status !== 'pending') return false;
    if (filterTab === 'resolved' && p.status !== 'success' && p.status !== 'failed') return false;
    if (search) {
      const q = search.toLowerCase();
      const name = p.profile?.full_name?.toLowerCase() || '';
      const email = p.profile?.email?.toLowerCase() || '';
      const phone = p.profile?.phone?.toLowerCase() || '';
      const txnId = String(p.metadata?.transaction_id || '').toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !phone.includes(q) && !txnId.includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ListChecks size={28} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900">SuccessKart Meet Payments</h1>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex bg-slate-100 rounded-xl p-1">
          {['pending', 'resolved'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                filterTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'pending' ? 'Pending' : 'Resolved'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {filteredPayments.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ListChecks size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-semibold">No payments found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((payment) => (
            <div key={payment.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {payment.profile?.avatar_url ? (
                    <img src={payment.profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User size={20} className="text-blue-600" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{payment.profile?.full_name || 'Unknown'}</p>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Mail size={14} />{payment.profile?.email || 'No email'}</span>
                      <span className="flex items-center gap-1"><Clock size={14} />{new Date(payment.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    payment.status === 'success' ? 'bg-green-100 text-green-700' :
                    payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {payment.status}
                  </span>
                  <span className="text-sm font-bold text-slate-700">₹{payment.final_amount || payment.amount}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  <span className="font-semibold text-slate-700">Gateway: </span>
                  {payment.gateway}
                  {payment.metadata?.transaction_id && (
                    <span className="ml-4">
                      <span className="font-semibold text-slate-700">Txn: </span>
                      {payment.metadata.transaction_id}
                    </span>
                  )}
                </div>

                {payment.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(payment)}
                      disabled={actionLoading === payment.id}
                      className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold text-sm transition-colors"
                    >
                      {actionLoading === payment.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      Approve & Generate Key
                    </button>
                    <button
                      onClick={() => handleReject(payment)}
                      disabled={actionLoading === payment.id}
                      className="flex items-center gap-1.5 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 disabled:opacity-50 font-semibold text-sm transition-colors"
                    >
                      <X size={16} />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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

export default AdminSucesskartMeetPayments;
