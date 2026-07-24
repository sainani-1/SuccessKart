import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Package, HelpCircle, IndianRupee, Sparkles, Check, X, ArrowRight, Loader2 } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertModal from '../components/AlertModal';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const callEdgeFunction = async (functionName, accessToken, body) => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  let payload = null;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok) throw new Error(payload?.error || payload?.message || `Edge Function ${functionName} failed.`);
  return payload;
};

const getFreshAccessToken = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData?.session?.access_token) return sessionData.session.access_token;
  const { data: refreshed } = await supabase.auth.refreshSession();
  if (refreshed?.session?.access_token) return refreshed.session.access_token;
  throw new Error('Your login session has expired. Please log in again.');
};

const Addons = () => {
  const { profile, isPremiumPlus } = useAuth();
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [buyingAddon, setBuyingAddon] = useState(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buying, setBuying] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [gatewayMode, setGatewayMode] = useState('razorpay');
  const [manualSubmitted, setManualSubmitted] = useState(false);
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualScreenshot, setManualScreenshot] = useState(null);
  const [manualTxnId, setManualTxnId] = useState('');
  const [manualUpiId, setManualUpiId] = useState('');
  const [manualUpiName, setManualUpiName] = useState('');
  const [manualPaymentNote, setManualPaymentNote] = useState('');
  const [manualQrImage, setManualQrImage] = useState('');
  const [manualPrice, setManualPrice] = useState(0);
  const [qrPayeeName, setQrPayeeName] = useState('');
  const [existingPurchases, setExistingPurchases] = useState(new Set());
  const purchaseRef = useRef({ finalizing: false, finalized: false });

  const isPp = isPremiumPlus(profile);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [addonsRes, settingsRes, paymentsRes] = await Promise.all([
          supabase.from('settings').select('value').eq('key', 'addons').maybeSingle(),
          supabase.from('settings').select('key, value').in('key', ['payment_gateway_mode', 'manual_payment_qr_plus', 'manual_payment_qr_name']).then(({ data }) => data || []),
          isPp && profile?.id ? supabase.from('payments').select('metadata').eq('user_id', profile.id).filter('metadata->payment_tag', 'eq', 'addon').in('status', ['success', 'pending']) : Promise.resolve({ data: [] }),
        ]);

        const parsed = addonsRes?.data?.value ? JSON.parse(addonsRes.data.value) : [];
        setAddons(Array.isArray(parsed) ? parsed.filter((a) => a.isActive) : []);

        for (const s of settingsRes) {
          if (s.key === 'payment_gateway_mode') setGatewayMode(s.value || 'razorpay');
          if (s.key === 'manual_payment_qr_plus') setManualQrImage(s.value || '');
          if (s.key === 'manual_payment_qr_name') setQrPayeeName(s.value || '');
        }

        if (paymentsRes?.data) {
          const purchased = new Set();
          for (const p of paymentsRes.data) {
            if (p.metadata?.addon_id) purchased.add(p.metadata.addon_id);
          }
          setExistingPurchases(purchased);
        }
      } catch {
        setAddons([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isPp, profile?.id]);

  const handleBuyClick = (addon) => {
    setBuyingAddon(addon);
    setManualSubmitted(false);
    setShowManualForm(false);
    setManualScreenshot(null);
    setManualTxnId('');
    setManualUpiId('');
    setManualUpiName('');
    setManualPaymentNote('');
    setManualPrice(addon.price);
    setShowBuyModal(true);
  };

  const isDesktopDevice = !/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroidDevice = /Android/i.test(navigator.userAgent);

  const handleRazorpayPayment = async () => {
    if (!buyingAddon) return;
    setBuying(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Not authenticated');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '' },
        body: JSON.stringify({
          plan_tier: 'premium_plus',
          payment_tag: 'addon',
          metadata: { addon_id: buyingAddon.id, addon_name: buyingAddon.name, addon_price: buyingAddon.price, payment_tag: 'addon' },
          amount: buyingAddon.price * 100,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to create payment');

      if (!data.payment_id) throw new Error('Payment record not created');

      purchaseRef.current = { paymentId: data.payment_id, finalizing: false, finalized: false };

      const effectiveKey = data.key_id || RAZORPAY_KEY_ID;
      if (!effectiveKey) throw new Error('Razorpay key missing');

      const options = {
        key: effectiveKey,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'SuccessKart',
        description: `Add-On: ${buyingAddon.name}`,
        image: '/NewLogo.jpeg',
        order_id: data.order_id,
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${SUPABASE_URL}/functions/v1/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '' },
              body: JSON.stringify({
                payment_id: purchaseRef.current.paymentId,
                status: 'success',
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const vData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(vData.error || 'Verification failed');

            await supabase.from('notifications').insert({
              user_id: profile.id,
              title: 'Add-On Purchase',
              content: `Your request for ${buyingAddon.name} add-on has been sent to the SuccessKart team. Your add-on will be added in 24 hrs.`,
              type: 'addon_purchase',
            });

            setSuccessMsg(`Your request sent to SuccessKart team. Your add-on "${buyingAddon.name}" will be added in 24 hrs. ${buyingAddon.name ? '' : ''}`);
            setShowBuyModal(false);
            setBuying(false);
            setBuyingAddon(null);
          } catch (err) {
            setAlertModal({ show: true, title: 'Verification Failed', message: err.message || 'Payment verification failed. Contact support.', type: 'error' });
            setShowBuyModal(false);
            setBuying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setAlertModal({ show: true, title: 'Payment Cancelled', message: 'Payment window was closed.', type: 'info' });
            setShowBuyModal(false);
            setBuying(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setAlertModal({ show: true, title: 'Payment Failed', message: 'Razorpay reported a failed payment.', type: 'error' });
        setShowBuyModal(false);
        setBuying(false);
      });
      rzp.open();
    } catch (err) {
      setAlertModal({ show: true, title: 'Payment Error', message: err.message || 'Failed to initialize payment.', type: 'error' });
      setShowBuyModal(false);
      setBuying(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualTxnId.trim()) {
      setAlertModal({ show: true, title: 'Missing Info', message: 'Please enter the transaction ID.', type: 'warning' });
      return;
    }
    if (!manualUpiId.trim()) {
      setAlertModal({ show: true, title: 'Missing Info', message: 'Please enter your UPI ID.', type: 'warning' });
      return;
    }
    if (!manualUpiName.trim()) {
      setAlertModal({ show: true, title: 'Missing Info', message: 'Please enter the name on UPI.', type: 'warning' });
      return;
    }
    if (!manualScreenshot) {
      setAlertModal({ show: true, title: 'Missing Screenshot', message: 'Please upload a payment screenshot.', type: 'warning' });
      return;
    }
    setBuying(true);
    try {
      const fileExt = manualScreenshot.name.split('.').pop();
      const filePath = `addon-payments/${profile.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('payment-screenshots').upload(filePath, manualScreenshot);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('payment-screenshots').getPublicUrl(filePath);

      const accessToken = await getFreshAccessToken();

      await callEdgeFunction('create-manual-payment', accessToken, {
        plan_code: `addon_${buyingAddon.id}`,
        base_amount: buyingAddon.price,
        discount_amount: 0,
        final_amount: buyingAddon.price,
        currency: 'INR',
        metadata: {
          transaction_id: manualTxnId.trim(),
          screenshot_url: publicUrl,
          plan_label: `Add-On: ${buyingAddon.name}`,
          payment_tag: 'addon',
          addon_id: buyingAddon.id,
          addon_name: buyingAddon.name,
          addon_price: buyingAddon.price,
          user_upi_id: manualUpiId.trim(),
          user_upi_name: manualUpiName.trim(),
          payment_note: manualPaymentNote.trim(),
        },
      });

      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'Add-On Purchase Request',
        content: `Your request for ${buyingAddon.name} add-on has been sent to the SuccessKart team. Your add-on will be added in 24 hrs.`,
        type: 'addon_purchase',
      });

      setManualSubmitted(true);
      setSuccessMsg(`Your request sent to SuccessKart team. Your add-on "${buyingAddon.name}" will be added in 24 hrs.`);
    } catch (err) {
      setAlertModal({ show: true, title: 'Submission Failed', message: err.message || 'Failed to submit payment request.', type: 'error' });
    } finally {
      setShowBuyModal(false);
      setBuying(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading add-ons..." />;

  return (
    <div className="space-y-6">
      <AlertModal show={alertModal.show} title={alertModal.title} message={alertModal.message} type={alertModal.type} onClose={() => setAlertModal({ show: false, title: '', message: '', type: 'info' })} />

      <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-6 rounded-xl text-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Add-Ons</h1>
          <p className="text-slate-200">Exclusive benefits for Premium Plus users.</p>
        </div>
        <button type="button" onClick={() => setInfoOpen(true)} className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors" title="What are add-ons?">
          <HelpCircle size={22} />
        </button>
      </div>

      {infoOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70" onClick={() => setInfoOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setInfoOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"><X size={20} /></button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center"><Sparkles size={24} className="text-white" /></div>
              <h2 className="text-xl font-bold text-slate-900">What are Add-Ons?</h2>
            </div>
            <p className="text-slate-700 leading-relaxed">
              Add-Ons are exclusively for <span className="font-bold text-amber-600">Premium Plus</span> users.
              They unlock additional benefits beyond the standard Premium Plus features.
              Each add-on enhances your learning experience with specialized tools and resources.
            </p>
            <button type="button" onClick={() => setInfoOpen(false)} className="mt-5 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-2.5 hover:from-amber-600 hover:to-orange-600 transition-all">Got it!</button>
          </div>
        </div>
      )}

      {!isPp ? (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-slate-100 text-center">
          <Package size={48} className="mx-auto text-slate-300 mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Premium Plus Feature</h2>
          <p className="text-slate-600 max-w-md mx-auto">Add-Ons are exclusively available to Premium Plus members. Upgrade your plan to unlock these additional benefits.</p>
        </div>
      ) : addons.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-slate-100 text-center">
          <Package size={48} className="mx-auto text-slate-300 mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Add-Ons Available</h2>
          <p className="text-slate-600 max-w-md mx-auto">There are no add-ons available right now. Check back later for new additions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {addons.map((addon) => {
            const isPurchased = existingPurchases.has(addon.id);
            return (
              <div key={addon.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">{addon.name}</h3>
                    <span className="inline-flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-sm font-bold"><IndianRupee size={14} /> {addon.price}</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {addon.useCase && <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Use Case</p><p className="text-sm text-slate-700">{addon.useCase}</p></div>}
                  <div className="grid grid-cols-2 gap-3">
                    {addon.whatPresentNow && <div className="bg-slate-50 rounded-lg p-3 border border-slate-200"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Present</p><p className="text-sm text-slate-700">{addon.whatPresentNow}</p></div>}
                    {addon.whatItWillBe && <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-1">After</p><p className="text-sm text-emerald-700">{addon.whatItWillBe}</p></div>}
                  </div>
                  {isPurchased ? (
                    <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                      <Check size={16} /> Request Submitted - Awaiting Activation
                    </div>
                  ) : (
                    <>
                      {addon.whatPresentNow && addon.whatItWillBe && (
                        <div className="flex items-center gap-2 text-xs text-amber-600 font-semibold"><ArrowRight size={14} /> Upgrade your experience with this add-on</div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleBuyClick(addon)}
                        className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-2.5 text-sm hover:from-amber-600 hover:to-orange-600 transition-all"
                      >
                        Buy Now - INR {addon.price}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showBuyModal && buyingAddon && !successMsg && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 relative">
            <button type="button" onClick={() => { setShowBuyModal(false); setBuyingAddon(null); setShowManualForm(false); setBuying(false); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"><X size={20} /></button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center"><Package size={24} className="text-white" /></div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Buy {buyingAddon.name}</h3>
                <p className="text-sm text-slate-500">INR {buyingAddon.price}</p>
              </div>
            </div>

            {gatewayMode === 'razorpay' && !showManualForm ? (
              <div className="space-y-4">
                <p className="text-slate-700">You will be redirected to Razorpay to complete the payment of <strong>INR {buyingAddon.price}</strong>.</p>
                <button
                  type="button"
                  onClick={handleRazorpayPayment}
                  disabled={buying}
                  className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {buying ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <>Pay INR {buyingAddon.price} via Razorpay</>}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">Pay <strong>INR {buyingAddon.price}</strong> via the method below and submit the details.</p>
                {manualQrImage && (
                  <div className="flex justify-center">
                    <div className="flex flex-col items-center">
                      <img src={manualQrImage} alt="Payment QR" className="w-48 h-48 object-contain rounded-xl border border-slate-200" />
                      {qrPayeeName && (
                        <p className="mt-2 text-center text-sm font-semibold text-slate-700">
                          Pay Only If Name Is: <span className="text-amber-600">{qrPayeeName}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <input type="text" placeholder="Transaction ID *" value={manualTxnId} onChange={(e) => setManualTxnId(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm" />
                <input type="text" placeholder="Your UPI ID *" value={manualUpiId} onChange={(e) => setManualUpiId(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm" />
                <input type="text" placeholder="Name on UPI *" value={manualUpiName} onChange={(e) => setManualUpiName(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm" />
                <textarea rows={2} placeholder="Payment note (optional)" value={manualPaymentNote} onChange={(e) => setManualPaymentNote(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm" />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Screenshot *</label>
                  <input type="file" accept="image/*" onChange={(e) => setManualScreenshot(e.target.files[0])} className="w-full text-sm" />
                </div>
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  disabled={buying}
                  className="w-full rounded-xl bg-emerald-600 text-white font-semibold py-3 hover:bg-emerald-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {buying ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : 'Submit Payment Request'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {successMsg && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={32} className="text-emerald-600" /></div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Request Submitted!</h3>
            <p className="text-slate-700">{successMsg}</p>
            <p className="text-sm text-slate-500 mt-2">If the add-on does not appear in your sidebar within 24 hrs, it will be shown automatically.</p>
            <button type="button" onClick={() => { setSuccessMsg(''); setManualSubmitted(false); }} className="mt-5 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-2.5 hover:from-amber-600 hover:to-orange-600 transition-all">Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Addons;
