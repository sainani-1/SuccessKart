import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Settings, AlertTriangle, Loader2, Save, Clock, Power, PowerOff, MessageSquare, Calendar, ToggleLeft, ToggleRight, ScanFace } from 'lucide-react';

const AdminMaintenanceMode = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceStart, setMaintenanceStart] = useState('');
  const [maintenanceEnd, setMaintenanceEnd] = useState('');
  const [maintenanceMessage, setMaintenanceMessage] = useState('We are currently undergoing scheduled maintenance. We will be back soon. Thank you for your patience!');
  const [registrationsPaused, setRegistrationsPaused] = useState(false);
  const [faceLoginEnabled, setFaceLoginEnabled] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [
          'maintenance_mode_enabled',
          'maintenance_mode_start',
          'maintenance_mode_end',
          'maintenance_mode_message',
          'registrations_paused',
          'face_login_enabled',
        ]);

      if (fetchError) throw fetchError;

      const settingsMap = {};
      (data || []).forEach((row) => {
        settingsMap[row.key] = row.value;
      });

      setMaintenanceEnabled(settingsMap.maintenance_mode_enabled === 'true');
      setMaintenanceStart(settingsMap.maintenance_mode_start || '');
      setMaintenanceEnd(settingsMap.maintenance_mode_end || '');
      setMaintenanceMessage(settingsMap.maintenance_mode_message || 'We are currently undergoing scheduled maintenance. We will be back soon. Thank you for your patience!');
      setRegistrationsPaused(settingsMap.registrations_paused === 'true');
      setFaceLoginEnabled(settingsMap.face_login_enabled !== 'false');
    } catch (err) {
      setError(err?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const settings = [
        { key: 'maintenance_mode_enabled', value: String(maintenanceEnabled) },
        { key: 'maintenance_mode_start', value: maintenanceStart },
        { key: 'maintenance_mode_end', value: maintenanceEnd },
        { key: 'maintenance_mode_message', value: maintenanceMessage },
        { key: 'registrations_paused', value: String(registrationsPaused) },
        { key: 'face_login_enabled', value: String(faceLoginEnabled) },
      ];

      for (const setting of settings) {
        const { error: upsertError } = await supabase
          .from('settings')
          .upsert(setting, { onConflict: 'key' });
        if (upsertError) throw upsertError;
      }

      setToast({ show: true, message: 'Maintenance mode settings saved successfully!', type: 'success' });
    } catch (err) {
      setToast({ show: true, message: err?.message || 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const isMaintenanceScheduled = maintenanceStart && maintenanceEnd;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Loader2 size={32} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 shadow-lg p-8 max-w-md text-center">
          <AlertTriangle size={40} className="mx-auto mb-3 text-red-400" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Failed to Load</h2>
          <p className="text-sm text-red-600 mb-4 break-words">{error}</p>
          <button onClick={fetchSettings} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {toast.show && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-semibold text-lg animate-fade-in ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
          <button onClick={() => setToast({ show: false, message: '', type: 'success' })} className="ml-3 text-white/80 hover:text-white">
            &times;
          </button>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 md:p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                <Settings size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-800">Maintenance Mode</h1>
                <p className="text-xs text-gray-500">Control site-wide maintenance mode and registration settings</p>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-6">
            {/* Maintenance Mode Toggle */}
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {maintenanceEnabled ? (
                    <Power size={24} className="text-orange-500" />
                  ) : (
                    <PowerOff size={24} className="text-gray-400" />
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Maintenance Mode</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      When enabled, all non-admin users see a maintenance page instead of the dashboard.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMaintenanceEnabled(!maintenanceEnabled)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    maintenanceEnabled ? 'bg-orange-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                    maintenanceEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              {maintenanceEnabled && (
                <div className="mt-3 rounded-lg bg-orange-50 border border-orange-200 px-4 py-2.5">
                  <p className="text-xs font-semibold text-orange-700">
                    Maintenance mode is currently ACTIVE. All non-admin users will see the maintenance page.
                  </p>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <Calendar size={20} className="text-blue-500" />
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Schedule Maintenance</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Set start and end dates for automatic maintenance mode activation.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={maintenanceStart}
                    onChange={(e) => setMaintenanceStart(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Date & Time</label>
                  <input
                    type="datetime-local"
                    value={maintenanceEnd}
                    onChange={(e) => setMaintenanceEnd(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                </div>
              </div>
              {isMaintenanceScheduled && (
                <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5">
                  <p className="text-xs text-blue-700">
                    <Clock size={12} className="inline mr-1" />
                    Scheduled: {new Date(maintenanceStart).toLocaleString('en-IN')} to {new Date(maintenanceEnd).toLocaleString('en-IN')}
                  </p>
                </div>
              )}
            </div>

            {/* Maintenance Message */}
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare size={20} className="text-purple-500" />
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Maintenance Message</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Custom message shown to users during maintenance.</p>
                </div>
              </div>
              <textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
                placeholder="Enter maintenance message..."
              />
            </div>

            {/* Registrations Paused */}
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} className="text-yellow-500" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Pause Registrations</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Hide the "Continue with Google" button on the login page.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRegistrationsPaused(!registrationsPaused)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    registrationsPaused ? 'bg-yellow-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                    registrationsPaused ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              {registrationsPaused && (
                <div className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-2.5">
                  <p className="text-xs font-semibold text-yellow-700">
                    Google sign-in button is currently HIDDEN on the login page.
                  </p>
                </div>
              )}
            </div>

            {/* Face Login Toggle */}
            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ScanFace size={20} className="text-cyan-500" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Login with Face</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Show or hide the "Login with Face" button on the login page.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFaceLoginEnabled(!faceLoginEnabled)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    faceLoginEnabled ? 'bg-cyan-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                    faceLoginEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              {faceLoginEnabled ? (
                <div className="mt-3 rounded-lg bg-cyan-50 border border-cyan-200 px-4 py-2.5">
                  <p className="text-xs font-semibold text-cyan-700">
                    "Login with Face" button is currently VISIBLE on the login page.
                  </p>
                </div>
              ) : (
                <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5">
                  <p className="text-xs font-semibold text-gray-600">
                    "Login with Face" button is currently HIDDEN on the login page.
                  </p>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMaintenanceMode;
