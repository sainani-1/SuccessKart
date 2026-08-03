import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Save, Key, Sliders, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ToggleLeft, ToggleRight, Globe, Bot, Cpu, Zap, Wind } from 'lucide-react';

const AI_PROVIDERS = [
  { id: 'grok', label: 'Grok (xAI)', icon: Zap, keySetting: 'ai_grok_api_key', enabledSetting: 'ai_grok_enabled', placeholder: 'Enter your xAI API key (xai-...)', docs: 'Get your API key from console.x.ai' },
  { id: 'openrouter', label: 'OpenRouter', icon: Globe, keySetting: 'ai_openrouter_api_key', enabledSetting: 'ai_openrouter_enabled', placeholder: 'Enter your OpenRouter API key (sk-or-...)', docs: 'Get your API key from openrouter.ai/keys' },
  { id: 'gemini', label: 'Gemini (Google)', icon: Bot, keySetting: 'ai_gemini_api_key', enabledSetting: 'ai_gemini_enabled', placeholder: 'Enter your Gemini API key (AIza...)', docs: 'Get your API key from aistudio.google.com' },
  { id: 'cerebras', label: 'Cerebras', icon: Cpu, keySetting: 'ai_cerebras_api_key', enabledSetting: 'ai_cerebras_enabled', placeholder: 'Enter your Cerebras API key', docs: 'Get your API key from cloud.cerebras.ai' },
  { id: 'mistral', label: 'Mistral AI', icon: Wind, keySetting: 'ai_mistral_api_key', enabledSetting: 'ai_mistral_enabled', placeholder: 'Enter your Mistral API key', docs: 'Get your API key from console.mistral.ai' },
];

const AdminMultiAISettings = () => {
  const [keys, setKeys] = useState({});
  const [enabled, setEnabled] = useState({});
  const [rateLimit, setRateLimit] = useState(10);
  const [dailyLimit, setDailyLimit] = useState(100);
  const [showKeys, setShowKeys] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settingKeys = [
        'ai_grok_api_key', 'ai_grok_enabled',
        'ai_openrouter_api_key', 'ai_openrouter_enabled',
        'ai_gemini_api_key', 'ai_gemini_enabled',
        'ai_cerebras_api_key', 'ai_cerebras_enabled',
        'ai_mistral_api_key', 'ai_mistral_enabled',
        'ai_rate_limit_per_minute', 'ai_rate_limit_per_day',
      ];

      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', settingKeys);

      if (error) throw error;

      const initialKeys = {};
      const initialEnabled = {};
      const initialState = {};

      for (const row of data || []) {
        initialState[row.key] = row.value;
        if (row.key.endsWith('_api_key')) {
          initialKeys[row.key] = row.value || '';
        }
        if (row.key.endsWith('_enabled')) {
          initialEnabled[row.key] = row.value !== 'false';
        }
      }

      setKeys(initialKeys);
      setEnabled(initialEnabled);
      setRateLimit(parseInt(initialState['ai_rate_limit_per_minute'], 10) || 10);
      setDailyLimit(parseInt(initialState['ai_rate_limit_per_day'], 10) || 100);
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
      const upserts = [];

      for (const provider of AI_PROVIDERS) {
        upserts.push(
          { key: provider.keySetting, value: keys[provider.keySetting]?.trim() || '' },
          { key: provider.enabledSetting, value: enabled[provider.enabledSetting] ? 'true' : 'false' }
        );
      }

      upserts.push(
        { key: 'ai_rate_limit_per_minute', value: String(rateLimit) },
        { key: 'ai_rate_limit_per_day', value: String(dailyLimit) }
      );

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

  const toggleKeyVisibility = (key) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleProvider = (providerId) => {
    const settingKey = `ai_${providerId}_enabled`;
    setEnabled((prev) => ({ ...prev, [settingKey]: !prev[settingKey] }));
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
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-purple-300/20 shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Multi-AI Settings</h1>
          <p className="text-purple-300 text-sm mb-8">Configure all AI providers. Fallback chain: Grok → OpenRouter → Gemini → Cerebras → Mistral</p>

          <div className="space-y-8">
            {AI_PROVIDERS.map((provider) => (
              <div key={provider.id} className="bg-white/5 rounded-2xl border border-purple-300/10 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                      <provider.icon size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-base">{provider.label}</h3>
                      <p className="text-xs text-purple-400">{provider.docs}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleProvider(provider.id)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ${enabled[provider.enabledSetting] ? 'bg-emerald-500' : 'bg-slate-600'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300 ${enabled[provider.enabledSetting] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showKeys[provider.keySetting] ? 'text' : 'password'}
                    value={keys[provider.keySetting] || ''}
                    onChange={(e) => setKeys((prev) => ({ ...prev, [provider.keySetting]: e.target.value }))}
                    placeholder={provider.placeholder}
                    className={`w-full bg-white/10 border rounded-xl px-4 py-3 pr-10 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${enabled[provider.enabledSetting] ? 'border-purple-400/30' : 'border-slate-500/30 opacity-60'}`}
                    disabled={!enabled[provider.enabledSetting]}
                  />
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility(provider.keySetting)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white transition"
                  >
                    {showKeys[provider.keySetting] ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            ))}

            <div className="bg-white/5 rounded-2xl border border-purple-300/10 p-5">
              <h3 className="text-white font-semibold text-base mb-4 flex items-center gap-2">
                <Sliders size={16} className="text-purple-400" /> Rate Limits
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-purple-200 mb-2">
                    Rate Limit (prompts per minute per user)
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
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-purple-200 mb-2">
                    Daily Limit (prompts per day per user)
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
                </div>
              </div>
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
          <h2 className="text-lg font-semibold text-white mb-3">How Fallback Works</h2>
          <ul className="space-y-2 text-sm text-purple-300">
            <li>1. <strong className="text-white">Grok</strong> is tried first. If rate limited, moves to next.</li>
            <li>2. <strong className="text-white">OpenRouter</strong> is tried second. If disabled, skipped.</li>
            <li>3. <strong className="text-white">Gemini</strong> is tried third. If disabled, skipped.</li>
            <li>4. <strong className="text-white">Cerebras</strong> is tried fourth. If disabled, skipped.</li>
            <li>5. <strong className="text-white">Mistral</strong> is tried last as final fallback.</li>
            <li>6. When using a fallback, the system periodically checks if Grok is available again.</li>
            <li>7. Disabled providers are completely skipped in the fallback chain.</li>
            <li>8. Non-educational content is automatically detected and rejected.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminMultiAISettings;
