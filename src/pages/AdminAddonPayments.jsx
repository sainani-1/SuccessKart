import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Package, CreditCard, RefreshCw, Check, X } from 'lucide-react';
import AlertModal from '../components/AlertModal';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminAddonPayments = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [profilesById, setProfilesById] = useState({});
  const [savingId, setSavingId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });

  const loadPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .filter('payment_tag', 'eq', 'addon')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPayments(data || []);

      const userIds = [...new Set((data || []).map((p) => p.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
          .in('id', userIds);
        const map = {};
        for (const p of profiles || []) map[p.id] = p;
        setProfilesById(map);
      }
    } catch (err) {
      setAlertModal({ show: true, title: 'Load Failed', message: err.message || 'Failed to load payments.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPayments(); }, []);

  const filteredPayments = useMemo(() => {
    if (statusFilter === 'all') return payments;
    return payments.filter((p) => p.status === statusFilter);
  }, [payments, statusFilter]);

  const callReviewEdge = async (paymentId, action, note = '') => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-review-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({ payment_id: paymentId, action, note }),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error || 'Review failed');
    return json;
  };

  const handleApprove = async (paymentId) => {
    setSavingId(paymentId);
    try {
      await callReviewEdge(paymentId, 'approve');
      setAlertModal({ show: true, title: 'Approved', message: 'Add-on purchase approved. User has been notified.', type: 'success' });
      await loadPayments();
    } catch (err) {
      setAlertModal({ show: true, title: 'Error', message: err.message || 'Failed to approve.', type: 'error' });
    } finally {
      setSavingId('');
    }
  };

  const handleReject = async (paymentId) => {
    setSavingId(paymentId);
    try {
      await callReviewEdge(paymentId, 'reject', 'Rejected by admin');
      setAlertModal({ show: true, title: 'Rejected', message: 'Add-on purchase rejected. User has been notified.', type: 'warning' });
      await loadPayments();
    } catch (err) {
      setAlertModal({ show: true, title: 'Error', message: err.message || 'Failed to reject.', type: 'error' });
    } finally {
      setSavingId('');
    }
  };

  if (loading) return <LoadingSpinner message="Loading add-on payments..." />;

  return (
    <div className="space-y-6">
      <AlertModal show={alertModal.show} title={alertModal.title} message={alertModal.message} type={alertModal.type} onClose={() => setAlertModal({ show: false, title: '', message: '', type: 'info' })} />

      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white">
        <h1 className="text-2xl font-bold">Add-On Payment Requests</h1>
        <p className="mt-1 text-sm text-slate-200">Review and manage add-on purchase requests from Premium Plus users.</p>
      </div>

      <div className="rounded-xl border bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'success', 'failed'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setStatusFilter(opt)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${statusFilter === opt ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
          <button type="button" onClick={loadPayments} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredPayments.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">No add-on payment requests found.</div>
        ) : (
          filteredPayments.map((p) => {
            const user = profilesById[p.user_id] || {};
            const isRazorpay = p.gateway === 'razorpay' || p.metadata?.payment_method === 'razorpay';
            const isManual = p.gateway === 'manual' || p.metadata?.payment_method === 'manual';
            const isPending = p.status === 'pending' || p.status === 'created';
            const addonName = p.metadata?.addon_name || 'Unknown Add-On';
            const addonPrice = p.metadata?.addon_price || p.amount / 100 || 0;

            return (
              <div key={p.id} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 text-slate-900">
                      <Package size={18} className="text-amber-500" />
                      <p className="font-semibold">Add-On: {addonName}</p>
                      <span className="text-sm font-bold text-emerald-600">INR {addonPrice}</span>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <p><span className="font-semibold text-slate-800">User:</span> {user.full_name || 'Unknown'}</p>
                      <p><span className="font-semibold text-slate-800">Email:</span> {user.email || '-'}</p>
                      <p><span className="font-semibold text-slate-800">Phone:</span> {user.phone || '-'}</p>
                      <p>
                        <span className="font-semibold text-slate-800">Gateway:</span>{' '}
                        {isRazorpay ? (
                          <span className="text-blue-600 font-medium">Razorpay</span>
                        ) : (
                          <span className="text-purple-600 font-medium">Manual / Other</span>
                        )}
                      </p>
                      <p><span className="font-semibold text-slate-800">Status:</span> {p.status}</p>
                      <p><span className="font-semibold text-slate-800">Amount:</span> INR {addonPrice}</p>
                      <p><span className="font-semibold text-slate-800">Created:</span> {p.created_at ? new Date(p.created_at).toLocaleString('en-IN') : '-'}</p>
                      {p.paid_at && <p><span className="font-semibold text-slate-800">Paid At:</span> {new Date(p.paid_at).toLocaleString('en-IN')}</p>}
                      {p.metadata?.transaction_id && <p className="md:col-span-2"><span className="font-semibold text-slate-800">Transaction ID:</span> {p.metadata.transaction_id}</p>}
                      {p.metadata?.screenshot_url && (
                        <p className="md:col-span-2">
                          <span className="font-semibold text-slate-800">Screenshot:</span>{' '}
                          <a href={p.metadata.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a>
                        </p>
                      )}
                      {p.failure_reason && <p className="md:col-span-2 text-rose-700"><span className="font-semibold">Reason:</span> {p.failure_reason}</p>}
                    </div>
                  </div>

                  {isPending && (
                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                      {isRazorpay ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700">
                          <CreditCard size={16} /> Used Razorpay - {p.status === 'success' ? 'Success' : p.status === 'failed' ? 'Failed' : 'Pending'}
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(p.id)}
                            disabled={savingId === p.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            {savingId === p.id ? 'Working...' : <><Check size={16} /> Approve</>}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(p.id)}
                            disabled={savingId === p.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            {savingId === p.id ? 'Working...' : <><X size={16} /> Reject</>}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {!isPending && (
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold flex-shrink-0 ${
                      p.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {p.status === 'success' ? <Check size={16} /> : <X size={16} />}
                      {p.status === 'success' ? 'Approved' : 'Rejected'}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminAddonPayments;
