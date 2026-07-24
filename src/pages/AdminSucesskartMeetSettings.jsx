import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Save, Video, Loader2 } from 'lucide-react';
import AlertModal from '../components/AlertModal';

const AdminSucesskartMeetSettings = () => {
  const [price, setPrice] = useState('499');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['sucesskart_meet_price', 'sucesskart_meet_enabled']);
        if (!data) return;
        for (const s of data) {
          if (s.key === 'sucesskart_meet_price') setPrice(s.value || '499');
          if (s.key === 'sucesskart_meet_enabled') setEnabled(s.value === '1');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const upserts = [
        { key: 'sucesskart_meet_price', value: String(Number(price) || 499) },
        { key: 'sucesskart_meet_enabled', value: enabled ? '1' : '0' },
      ];
      for (const s of upserts) {
        await supabase.from('settings').upsert(s, { onConflict: 'key' });
      }
      setAlertModal({ show: true, title: 'Saved', message: 'SuccessKart Meet settings saved successfully.', type: 'success' });
    } catch (err) {
      setAlertModal({ show: true, title: 'Error', message: err.message || 'Failed to save settings.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <Video size={32} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-900">SuccessKart Meet API</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Enable SuccessKart Meet API</label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-slate-600">{enabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Price (INR)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="0"
            className="w-full max-w-xs rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-500 mt-1">Set the price users must pay to get SuccessKart Meet API access.</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold transition-colors"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Settings'}
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

export default AdminSucesskartMeetSettings;
