import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Video, Key, Copy, Check, Loader2, AlertCircle, ExternalLink, Eye, EyeOff, LogIn, Clock, RefreshCw, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import AlertModal from '../components/AlertModal';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
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
  if (!response.ok) throw new Error(payload?.error || payload?.message || `${functionName} failed.`);
  return payload;
};

const getFreshAccessToken = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData?.session?.access_token) return sessionData.session.access_token;
  const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError && refreshedData?.session?.access_token) return refreshedData.session.access_token;
  throw new Error('Session expired. Please log in again.');
};

const SucesskartMeetApiKeys = () => {
  const { profile } = useAuth();
  const [price, setPrice] = useState(499);
  const [enabled, setEnabled] = useState(true);
  const [apiKey, setApiKey] = useState(null);
  const [minutesRemaining, setMinutesRemaining] = useState(0);
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });

  const [manualQrImage, setManualQrImage] = useState('');
  const [qrPayeeName, setQrPayeeName] = useState('');
  const [manualTxnId, setManualTxnId] = useState('');
  const [manualUpiId, setManualUpiId] = useState('');
  const [manualUpiName, setManualUpiName] = useState('');
  const [manualPaymentNote, setManualPaymentNote] = useState('');
  const [manualScreenshot, setManualScreenshot] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualSubmitted, setManualSubmitted] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    try {
      const { data: settings } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [
          'sucesskart_meet_price',
          'sucesskart_meet_enabled',
          'payment_gateway_mode',
          'manual_payment_qr_premium',
          'manual_payment_qr_plus',
          'manual_payment_qr_name',
        ]);
      if (settings) {
        for (const s of settings) {
          if (s.key === 'sucesskart_meet_price') setPrice(Number(s.value) || 499);
          if (s.key === 'sucesskart_meet_enabled') setEnabled(s.value === '1');
          if (s.key === 'manual_payment_qr_premium') setManualQrImage(s.value || '');
          if (s.key === 'manual_payment_qr_plus' && !manualQrImage) setManualQrImage(s.value || '');
          if (s.key === 'manual_payment_qr_name') setQrPayeeName(s.value || '');
        }
      }

      const { data: payment } = await supabase
        .from('payments')
        .select('id, status')
        .eq('user_id', profile.id)
        .eq('payment_tag', 'sucesskart_meet')
        .eq('status', 'pending')
        .maybeSingle();
      if (payment) setManualSubmitted(true);

      const { data: existingKey } = await supabase
        .from('sucesskart_meet_api_keys')
        .select('api_key, is_active, minutes_remaining')
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .maybeSingle();
      if (existingKey) {
        setApiKey(existingKey.api_key);
        setMinutesRemaining(existingKey.minutes_remaining || 0);
        setHasKey(true);
      } else {
        setHasKey(false);
      }
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile?.id]);

  const handleCopyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
      const filePath = `sucesskart-meet-payments/${profile.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('payment-screenshots').upload(filePath, manualScreenshot);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('payment-screenshots').getPublicUrl(filePath);

      const accessToken = await getFreshAccessToken();

      await callEdgeFunction('create-sucesskart-meet-order', accessToken, {
        gateway: 'manual',
        transaction_id: manualTxnId.trim(),
        screenshot_url: publicUrl,
        user_upi_id: manualUpiId.trim(),
        user_upi_name: manualUpiName.trim(),
        payment_note: manualPaymentNote.trim(),
      });

      setManualSubmitted(true);
      setSuccessMsg(`Your payment request of ₹${price} for SuccessKart Meet API has been submitted. Admin will verify and credit 90 minutes to your account shortly.`);
    } catch (err) {
      setAlertModal({ show: true, title: 'Submission Failed', message: err.message || 'Failed to submit payment request.', type: 'error' });
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-3 pb-4 border-b border-slate-200">
          <Video size={48} className="text-blue-600 mx-auto" />
          <h1 className="text-3xl font-bold text-slate-900">SuccessKart Meet API Keys</h1>
          <p className="text-slate-500">Get your API key to integrate video meetings into your application.</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <LogIn size={48} className="text-slate-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Login Required</h2>
          <p className="text-slate-500">Please log in to view your API key or purchase access.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 font-bold transition-colors"
          >
            <LogIn size={18} />
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (successMsg) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <Check size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Request Submitted!</h2>
          <p className="text-slate-600">{successMsg}</p>
          <button
            type="button"
            onClick={() => { setSuccessMsg(''); setManualSubmitted(false); loadData(); }}
            className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 hover:bg-blue-700 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-3 pb-4 border-b border-slate-200">
        <Video size={48} className="text-blue-600 mx-auto" />
        <h1 className="text-3xl font-bold text-slate-900">SuccessKart Meet API Keys</h1>
        <p className="text-slate-500">Get your API key to integrate video meetings into your application.</p>
      </div>

      {!enabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <AlertCircle size={32} className="text-amber-600 mx-auto" />
          <h2 className="mt-3 text-lg font-bold text-amber-800">Currently Unavailable</h2>
          <p className="text-amber-700">SuccessKart Meet API is currently disabled by the admin. Please check back later.</p>
        </div>
      )}

      {hasKey && apiKey && minutesRemaining > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Key size={24} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Your API Key</h2>
              <p className="text-sm text-slate-500">Use this key to authenticate your API requests.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-4 border border-blue-200">
            <Clock size={20} className="text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">
              {minutesRemaining} minutes remaining
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <code className="flex-1 text-sm font-mono text-slate-800 break-all">
              {showKey ? apiKey : apiKey.slice(0, 8) + '••••••••••••••••'}
            </code>
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
              title={showKey ? 'Hide' : 'Show'}
            >
              {showKey ? <EyeOff size={18} className="text-slate-500" /> : <Eye size={18} className="text-slate-500" />}
            </button>
            <button
              onClick={handleCopyKey}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="flex gap-3">
            <a
              href="/sucesskart-meet-documentation"
              className="flex items-center gap-2 text-blue-600 font-semibold hover:underline text-sm"
            >
              <ExternalLink size={16} />
              View Documentation
            </a>
          </div>

          {minutesRemaining <= 30 && enabled && !manualSubmitted && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-sm text-amber-700 mb-3">Your minutes are running low. Recharge to keep using the API.</p>
              <button
                onClick={() => setShowManualForm(true)}
                className="inline-flex items-center gap-2 bg-amber-600 text-white px-5 py-2.5 rounded-lg hover:bg-amber-700 font-bold text-sm transition-colors"
              >
                <RefreshCw size={16} /> Recharge ₹{price} for 90 min
              </button>
            </div>
          )}
        </div>
      ) : null}

      {manualSubmitted ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-2">
          <AlertCircle size={28} className="text-amber-600 mx-auto" />
          <h2 className="text-lg font-bold text-amber-800">Request Pending</h2>
          <p className="text-amber-700 text-sm">You already have a pending payment request. The admin will verify and credit your account shortly.</p>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 text-sm text-amber-700 font-semibold hover:underline mt-2"
          >
            <RefreshCw size={14} /> Refresh Status
          </button>
        </div>
      ) : enabled && (!hasKey || (hasKey && minutesRemaining <= 0)) && !showManualForm ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-slate-900">
              {hasKey ? 'Recharge Your API Access' : 'Get API Access'}
            </h2>
            <p className="text-slate-500">
              {hasKey
                ? 'Your minutes have expired. Recharge to continue using the API.'
                : `Pay ₹${price} for 90 minutes of API usage.`}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Clock size={24} className="text-blue-600" />
              <div className="text-4xl font-bold text-blue-600">₹{price}</div>
              <span className="text-slate-500 text-lg">/ 90 min</span>
            </div>
          </div>

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

          <button
            onClick={() => setShowManualForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700 font-bold text-lg transition-colors"
          >
            <Video size={20} />
            {hasKey ? `Recharge ₹${price} for 90 min` : `Pay ₹${price} for 90 min`}
          </button>

          <p className="text-sm text-slate-500 text-center">
            After paying, you will be asked to submit your transaction ID and payment screenshot for admin verification.
          </p>
        </div>
      ) : null}

      {enabled && showManualForm && !manualSubmitted && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 text-center">Submit Payment Details</h2>
          <p className="text-sm text-slate-600 text-center">
            Pay <strong>₹{price}</strong> via UPI to the QR above, then fill in the details below.
          </p>

          {manualQrImage && (
            <div className="flex justify-center">
              <div className="flex flex-col items-center">
                <img src={manualQrImage} alt="Payment QR" className="w-40 h-40 object-contain rounded-xl border border-slate-200" />
                {qrPayeeName && (
                  <p className="mt-2 text-center text-sm font-semibold text-slate-700">
                    Pay Only If Name Is: <span className="text-amber-600">{qrPayeeName}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          <input
            type="text"
            placeholder="Transaction ID *"
            value={manualTxnId}
            onChange={(e) => setManualTxnId(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg text-sm"
          />
          <input
            type="text"
            placeholder="Your UPI ID *"
            value={manualUpiId}
            onChange={(e) => setManualUpiId(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg text-sm"
          />
          <input
            type="text"
            placeholder="Name on UPI *"
            value={manualUpiName}
            onChange={(e) => setManualUpiName(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg text-sm"
          />
          <textarea
            rows={2}
            placeholder="Payment note (optional)"
            value={manualPaymentNote}
            onChange={(e) => setManualPaymentNote(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg text-sm"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Screenshot *</label>
            <input type="file" accept="image/*" onChange={(e) => setManualScreenshot(e.target.files[0])} className="w-full text-sm" />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowManualForm(false)}
              className="flex-1 rounded-xl bg-slate-200 text-slate-700 font-semibold py-3 hover:bg-slate-300 transition-all"
            >
              Back
            </button>
            <button
              onClick={handleManualSubmit}
              disabled={buying}
              className="flex-1 rounded-xl bg-emerald-600 text-white font-semibold py-3 hover:bg-emerald-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {buying ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : 'Submit Payment'}
            </button>
          </div>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh status
        </button>
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

export default SucesskartMeetApiKeys;
