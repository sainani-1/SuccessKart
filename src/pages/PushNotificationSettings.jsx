import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { Bell, BellRing, BellOff, Settings, CheckCircle } from 'lucide-react';
import AlertModal from '../components/AlertModal';
import {
  registerServiceWorker,
  requestPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
} from '../utils/pushNotifications';

const NOTIFICATION_TYPES = [
  { key: 'exam_reminders', label: 'Exam Reminders', description: 'Get notified before upcoming exams and deadlines.' },
  { key: 'class_starts', label: 'Class Starts', description: 'Alerts when a live class is about to begin.' },
  { key: 'payment_updates', label: 'Payment Updates', description: 'Confirmations for payments and plan changes.' },
  { key: 'general', label: 'General Announcements', description: 'Platform news, tips, and important updates.' },
];

const PushNotificationSettings = () => {
  const { user } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [preferences, setPreferences] = useState({
    exam_reminders: true,
    class_starts: true,
    payment_updates: true,
    general: true,
  });
  const [savingPref, setSavingPref] = useState(false);
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const load = async () => {
      if ('Notification' in window) {
        setPermissionStatus(Notification.permission);
      }

      const subbed = await isPushSubscribed();
      if (!mounted) return;
      setIsSubscribed(subbed);

      try {
        const { data } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data && mounted) {
          setPreferences({
            exam_reminders: data.exam_reminders ?? true,
            class_starts: data.class_starts ?? true,
            payment_updates: data.payment_updates ?? true,
            general: data.general ?? true,
          });
        }
      } catch {
        // preferences table may not exist yet
      }

      if (mounted) setLoading(false);
    };

    load();
    return () => { mounted = false; };
  }, [user]);

  const handleToggleSubscription = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      if (isSubscribed) {
        const ok = await unsubscribeFromPush();
        if (ok) {
          setIsSubscribed(false);
          setAlertModal({ show: true, title: 'Unsubscribed', message: 'You will no longer receive push notifications.', type: 'success' });
        } else {
          setAlertModal({ show: true, title: 'Error', message: 'Failed to unsubscribe from push notifications.', type: 'error' });
        }
      } else {
        const granted = await requestPushPermission();
        if (!granted) {
          setPermissionStatus('denied');
          setAlertModal({ show: true, title: 'Permission Denied', message: 'Please allow notifications in your browser settings.', type: 'warning' });
          return;
        }
        setPermissionStatus('granted');

        const registration = await registerServiceWorker();
        if (!registration) {
          setAlertModal({ show: true, title: 'Error', message: 'Service worker registration failed. Try refreshing the page.', type: 'error' });
          return;
        }

        const sub = await subscribeToPush(registration);
        if (sub) {
          setIsSubscribed(true);
          setAlertModal({ show: true, title: 'Subscribed', message: 'Push notifications enabled successfully!', type: 'success' });
        } else {
          setAlertModal({ show: true, title: 'Error', message: 'Failed to subscribe to push notifications.', type: 'error' });
        }
      }
    } catch {
      setAlertModal({ show: true, title: 'Error', message: 'Something went wrong. Please try again.', type: 'error' });
    } finally {
      setToggling(false);
    }
  };

  const handlePreferenceChange = async (key) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    setSavingPref(true);
    try {
      const { error } = await supabase.from('notification_preferences').upsert(
        { user_id: user.id, ...updated, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
    } catch {
      setPreferences(preferences);
      setAlertModal({ show: true, title: 'Error', message: 'Failed to save preferences.', type: 'error' });
    } finally {
      setSavingPref(false);
    }
  };

  const getStatusBadge = () => {
    switch (permissionStatus) {
      case 'granted':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700"><CheckCircle size={14} /> Granted</span>;
      case 'denied':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700"><BellOff size={14} /> Blocked</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700"><Bell size={14} /> Not Set</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-6 rounded-xl text-white">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Bell size={24} /> Push Notifications
        </h1>
        <p className="text-slate-200">Manage how and when SucessKart notifies you.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BellRing size={20} className="text-gold-500" />
              Browser Notifications
            </h2>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span>Status: {getStatusBadge()}</span>
              <span className="text-slate-300">|</span>
              <span>Subscription: {isSubscribed ? <span className="text-green-600 font-semibold">Active</span> : <span className="text-slate-400">Inactive</span>}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleSubscription}
            disabled={toggling || permissionStatus === 'denied'}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isSubscribed ? 'bg-gold-400' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                isSubscribed ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {permissionStatus === 'denied' && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            Notifications are blocked by your browser. Please enable them in your browser site settings and reload.
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Settings size={20} className="text-slate-500" />
          Notification Preferences
        </h2>

        <div className="space-y-4">
          {NOTIFICATION_TYPES.map((type) => (
            <div
              key={type.key}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-4"
            >
              <div>
                <p className="font-semibold text-slate-900">{type.label}</p>
                <p className="text-sm text-slate-500">{type.description}</p>
              </div>
              <button
                type="button"
                onClick={() => handlePreferenceChange(type.key)}
                disabled={savingPref}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 disabled:opacity-50 ${
                  preferences[type.key] ? 'bg-gold-400' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                    preferences[type.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
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

export default PushNotificationSettings;
