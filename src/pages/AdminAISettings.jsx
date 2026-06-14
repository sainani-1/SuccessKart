import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Save, Key, Sliders, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const AdminAISettings = () => {
  const [apiKey, setApiKey] = useState('');
  const [rateLimit, setRateLimit] = useState(10);
  const [dailyLimit, setDailyLimit] = useState(100);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['ai_grok_api_key', 'ai_rate_limit_per_minute', 'ai_rate_limit_per_day']);

      if (error) throw error;

      for (const row of data || []) {
        if (row.key === 'ai_grok_api_key') {
          setApiKey(row.value || '');
        }
        if (row.key === 'ai_rate_limit_per_minute') {
          setRateLimit(parseInt(row.value, 10) || 10);
        }
        if (row.key === 'ai_rate_limit_per_day') {
          setDailyLimit(parseInt(row.value, 10) || 100);
        }
      }
    } catch (err) {
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
        { key: 'ai_grok_api_key', value: apiKey.trim() },
        { key: 'ai_rate_limit_per_minute', value: String(rateLimit) },
        { key: 'ai_rate_limit_per_day', value: String(dailyLimit) },
      ];

      for (const setting of upserts) {
        const { error } = await supabase
          .from('settings')
          .upsert(setting, { onConflict: 'key' });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'AI settings saved successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
        <Loader2 size={32} className="text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-purple-300/20 shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">AI Settings</h1>
          <p className="text-purple-300 text-sm mb-8">Configure the AI assistant for the "Learn with AI" student feature.</p>

          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-purple-200 mb-2">
                <Key size={16} /> Groq API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Groq API key (gsk_...)"
                  className="w-full bg-white/10 border border-purple-400/30 rounded-xl px-4 py-3 pr-10 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white transition"
                >
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-purple-400 mt-1">
                Get your API key from the Groq Console (console.groq.com).
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-purple-200 mb-2">
                <Sliders size={16} /> Rate Limit (prompts per minute per user)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={60}
                  value={rateLimit}
                  onChange={(e) => setRateLimit(parseInt(e.target.value, 10))}
                  className="flex-1 accent-purple-500"
                />
                <span className="text-white font-bold text-lg w-12 text-center">{rateLimit}</span>
              </div>
              <p className="text-xs text-purple-400 mt-1">
                Maximum number of AI prompts each user can send per minute.
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-purple-200 mb-2">
                <Sliders size={16} /> Daily Limit (prompts per day per user)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={10}
                  max={1000}
                  step={10}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(parseInt(e.target.value, 10))}
                  className="flex-1 accent-purple-500"
                />
                <span className="text-white font-bold text-lg w-16 text-center">{dailyLimit}</span>
              </div>
              <p className="text-xs text-purple-400 mt-1">
                Maximum number of AI prompts each user can send per day.
              </p>
            </div>
          </div>

          {message.text && (
            <div className={`mt-6 flex items-center gap-2 text-sm p-3 rounded-xl ${
              message.type === 'success'
                ? 'bg-green-900/50 text-green-200 border border-green-500/30'
                : 'bg-red-900/50 text-red-200 border border-red-500/30'
            }`}>
              {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="mt-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-purple-300/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-3">How it works</h2>
          <ul className="space-y-2 text-sm text-purple-300">
            <li>1. Get a Groq API key from console.groq.com.</li>
            <li>2. Enter the API key above and set your desired rate limit.</li>
            <li>3. Students with Premium Plus access can use "Learn with AI" in the sidebar.</li>
            <li>4. Free and Premium users will see an upgrade prompt to Premium Plus.</li>
            <li>5. The AI uses educational system prompts and restricts inappropriate content.</li>
            <li>6. Rate limits are enforced per user per minute to ensure fair usage.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminAISettings;
