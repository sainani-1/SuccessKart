import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Sliders, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const AdminAIBasicLimit = () => {
  const [minuteLimit, setMinuteLimit] = useState(10);
  const [dayLimit, setDayLimit] = useState(100);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['ai_rate_limit_per_minute', 'ai_rate_limit_per_day']);

      for (const row of data || []) {
        if (row.key === 'ai_rate_limit_per_minute') setMinuteLimit(parseInt(row.value, 10) || 10);
        if (row.key === 'ai_rate_limit_per_day') setDayLimit(parseInt(row.value, 10) || 100);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const upserts = [
        { key: 'ai_rate_limit_per_minute', value: String(minuteLimit) },
        { key: 'ai_rate_limit_per_day', value: String(dayLimit) },
      ];

      for (const setting of upserts) {
        const { error } = await supabase
          .from('settings')
          .upsert(setting, { onConflict: 'key' });
        if (error) throw error;
      }

      setMessage({ type: 'success', text: `Basic AI limits saved. Minute: ${minuteLimit}, Day: ${dayLimit}` });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-6 rounded-xl text-white">
        <h1 className="text-2xl font-bold mb-1">AI Basic Limit</h1>
        <p className="text-slate-200">Set default AI chat limits for all users. These apply until a per-user override is set via AI Limit Increaser.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Sliders size={16} /> Rate Limit (prompts per minute)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={120}
                value={minuteLimit}
                onChange={(e) => setMinuteLimit(parseInt(e.target.value, 10))}
                className="flex-1 accent-slate-700"
              />
              <span className="text-slate-900 font-bold text-lg w-12 text-center">{minuteLimit}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Default: 10. Max prompts per minute for each user.</p>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Sliders size={16} /> Daily Limit (prompts per day)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={10}
                max={5000}
                step={10}
                value={dayLimit}
                onChange={(e) => setDayLimit(parseInt(e.target.value, 10))}
                className="flex-1 accent-slate-700"
              />
              <span className="text-slate-900 font-bold text-lg w-16 text-center">{dayLimit}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Default: 100. Max daily prompts for each user.</p>
          </div>
        </div>

        {message.text && (
          <div className={`mt-6 flex items-center gap-2 text-sm p-3 rounded-xl ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-slate-800 to-slate-600 px-6 py-3 text-sm font-semibold text-white hover:from-slate-900 hover:to-slate-700 disabled:opacity-60 transition-all"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Basic Limits'}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Note:</strong> These limits apply as the default for <strong>all users</strong>. To set custom limits for specific users, use the <strong>AI Limit Increaser</strong> page.
      </div>
    </div>
  );
};

export default AdminAIBasicLimit;
