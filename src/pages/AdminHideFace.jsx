import React, { useEffect, useState } from 'react';
import { EyeOff, ScanFace, Loader2, Save, AlertTriangle } from 'lucide-react';
import { isFaceRegistrationHidden, setFaceRegistrationHidden } from '../utils/hideFace';

const AdminHideFace = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const value = await isFaceRegistrationHidden();
        setHidden(value);
      } catch (err) {
        setError(err?.message || 'Failed to load setting');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await setFaceRegistrationHidden(hidden);
      setToast({ show: true, message: hidden ? 'Face registration is now HIDDEN for all users.' : 'Face registration is now VISIBLE for all users.', type: 'success' });
    } catch (err) {
      setToast({ show: true, message: err?.message || 'Failed to save setting', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Loader2 size={32} className="text-blue-500 animate-spin" />
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
              <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                <EyeOff size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-800">Hide Face</h1>
                <p className="text-xs text-gray-500">When enabled, "Register Face" is hidden from all users</p>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-500" />
                  <p className="text-sm font-semibold text-red-700">{error}</p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={hidden ? 'w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center' : 'w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center'}>
                    {hidden ? <EyeOff size={20} className="text-red-500" /> : <ScanFace size={20} className="text-cyan-600" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Hide Register Face</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Hide the "Register Face" menu and page from all users across the app.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHidden(!hidden)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    hidden ? 'bg-red-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                    hidden ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              {hidden ? (
                <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5">
                  <p className="text-xs font-semibold text-red-700">
                    "Register Face" is currently HIDDEN for all users.
                  </p>
                </div>
              ) : (
                <div className="mt-3 rounded-lg bg-cyan-50 border border-cyan-200 px-4 py-2.5">
                  <p className="text-xs font-semibold text-cyan-700">
                    "Register Face" is currently VISIBLE for all users.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Setting'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHideFace;