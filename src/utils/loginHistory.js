import { supabase } from '../supabaseClient';
import { logError } from './errorLogger';

let cachedGeo = {
  ip_address: null,
  city: null,
  region: null,
  country: null,
  postal: null,
  lat: null,
  lon: null,
  timezone: null,
  isp: null,
  org: null,
};
let geoPromise = null;

const fetchGeoInfo = async () => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('http://ip-api.com/json/', { signal: controller.signal });
    clearTimeout(timer);
    const data = await res.json();
    if (data.status === 'success') {
      cachedGeo = {
        ip_address: data.query || null,
        city: data.city || null,
        region: data.regionName || null,
        country: data.country || null,
        postal: data.zip || null,
        lat: data.lat ?? null,
        lon: data.lon ?? null,
        timezone: data.timezone || null,
        isp: data.isp || null,
        org: data.org || null,
      };
    }
  } catch {
    // geo failed silently
  }
};

if (typeof fetch !== 'undefined') {
  geoPromise = fetchGeoInfo();
}

const getDeviceName = () => {
  try {
    const ua = navigator.userAgent;
    const platform = navigator.platform || 'Unknown';
    if (ua.includes('Windows')) return `Windows - ${platform}`;
    if (ua.includes('Mac OS')) return `macOS - ${platform}`;
    if (ua.includes('Linux')) return `Linux - ${platform}`;
    if (ua.includes('Android')) return `Android - ${platform}`;
    if (ua.includes('iPhone') || ua.includes('iPad')) return `iOS - ${platform}`;
    return platform;
  } catch {
    return 'Unknown Device';
  }
};

const getUserAgent = () => {
  try {
    return navigator.userAgent || 'Unknown';
  } catch {
    return 'Unknown';
  }
};

const insertEvent = async (data) => {
  try {
    const { error } = await supabase.from('login_history').insert(data);
    if (error) {
      logError({ message: 'loginHistory insert failed', source: 'loginHistory', details: error.message });
    }
  } catch (err) {
    logError({ message: 'loginHistory insert error', source: 'loginHistory', details: err?.message || err });
  }
};

const buildPayload = (userId, userInfo, action) => ({
  user_id: userId,
  email: userInfo.email || '',
  full_name: userInfo.full_name || null,
  action,
  event_type: action,
  ...cachedGeo,
  user_agent: getUserAgent(),
  device_name: getDeviceName(),
  created_at: new Date().toISOString(),
});

const fireGeoFetch = () => {
  geoPromise = geoPromise || fetchGeoInfo();
  geoPromise.then(() => {}).catch(() => {});
};

export const logLoginEvent = async (userId, userInfo = {}) => {
  if (!userId) return;
  fireGeoFetch();
  await insertEvent(buildPayload(userId, userInfo, 'login'));
};

export const logLogoutEvent = async (userId, userInfo = {}) => {
  if (!userId) return;
  fireGeoFetch();
  await insertEvent(buildPayload(userId, userInfo, 'logout'));
};

export const logTakeoverEvent = async (userId, userInfo = {}) => {
  if (!userId) return;
  fireGeoFetch();
  await insertEvent(buildPayload(userId, userInfo, 'session_takeover'));
};

export const logSessionExpiredEvent = async (userId, userInfo = {}) => {
  if (!userId) return;
  fireGeoFetch();
  await insertEvent(buildPayload(userId, userInfo, 'session_expired'));
};
