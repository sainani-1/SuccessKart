import { supabase } from '../supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

export async function requestPushPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function subscribeToPush(registration, sb = supabase) {
  if (!registration?.pushManager || !VAPID_PUBLIC_KEY) return null;

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const { endpoint } = subscription;
    const keys = subscription.toJSON().keys || {};

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    const { error } = await sb.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh || '',
        auth: keys.auth || '',
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' }
    );

    if (error) throw error;
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}

export async function unsubscribeFromPush(sb = supabase) {
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return false;

    const { error } = await sb.from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
    }

    return true;
  } catch (error) {
    console.error('Push unsubscribe failed:', error);
    return false;
  }
}

export async function isPushSubscribed(sb = supabase) {
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return false;

    const { data, error } = await sb.from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  } catch {
    return false;
  }
}
