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
    const res = await fetch('https://ip-api.com/json/', { signal: controller.signal });
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

const ANDROID_DEVICE_MAP = [
  { pattern: /Samsung.*Galaxy\s*S26\s*Ultra/i, name: 'Samsung Galaxy S26 Ultra' },
  { pattern: /Samsung.*Galaxy\s*S26\s*\+/i, name: 'Samsung Galaxy S26+' },
  { pattern: /Samsung.*Galaxy\s*S26/i, name: 'Samsung Galaxy S26' },
  { pattern: /Samsung.*Galaxy\s*S25\s*Ultra/i, name: 'Samsung Galaxy S25 Ultra' },
  { pattern: /Samsung.*Galaxy\s*S25\s*\+/i, name: 'Samsung Galaxy S25+' },
  { pattern: /Samsung.*Galaxy\s*S25/i, name: 'Samsung Galaxy S25' },
  { pattern: /Samsung.*Galaxy\s*S24\s*Ultra/i, name: 'Samsung Galaxy S24 Ultra' },
  { pattern: /Samsung.*Galaxy\s*S24\s*\+/i, name: 'Samsung Galaxy S24+' },
  { pattern: /Samsung.*Galaxy\s*S24/i, name: 'Samsung Galaxy S24' },
  { pattern: /Samsung.*Galaxy\s*S23\s*Ultra/i, name: 'Samsung Galaxy S23 Ultra' },
  { pattern: /Samsung.*Galaxy\s*S23/i, name: 'Samsung Galaxy S23' },
  { pattern: /Samsung.*Galaxy\s*S22\s*Ultra/i, name: 'Samsung Galaxy S22 Ultra' },
  { pattern: /Samsung.*Galaxy\s*S22/i, name: 'Samsung Galaxy S22' },
  { pattern: /Samsung.*Galaxy\s*Note\s*\d+/i, name: 'Samsung Galaxy Note' },
  { pattern: /Samsung.*Galaxy\s*A\d+/i, name: 'Samsung Galaxy A Series' },
  { pattern: /Samsung.*Galaxy\s*Z\s*Fold/i, name: 'Samsung Galaxy Z Fold' },
  { pattern: /Samsung.*Galaxy\s*Z\s*Flip/i, name: 'Samsung Galaxy Z Flip' },
  { pattern: /Samsung/i, name: 'Samsung Device' },
  { pattern: /Redmi\s*Note\s*\d+/i, name: 'Redmi Note' },
  { pattern: /Redmi/i, name: 'Redmi Device' },
  { pattern: /POCO/i, name: 'POCO Device' },
  { pattern: /OnePlus\s*\d+/i, name: 'OnePlus' },
  { pattern: /Pixel\s*\d+/i, name: 'Google Pixel' },
  { pattern: /Motorola/i, name: 'Motorola Device' },
  { pattern: /Realme/i, name: 'Realme Device' },
  { pattern: /Vivo/i, name: 'Vivo Device' },
  { pattern: /Oppo/i, name: 'OPPO Device' },
  { pattern: /Xiaomi/i, name: 'Xiaomi Device' },
  { pattern: /Huawei/i, name: 'Huawei Device' },
  { pattern: /Nokia/i, name: 'Nokia Device' },
  { pattern: /Nothing/i, name: 'Nothing Phone' },
  { pattern: /Sony/i, name: 'Sony Device' },
  { pattern: /LG/i, name: 'LG Device' },
];

const IOS_DEVICE_MAP = [
  { pattern: /iPhone\s*16\s*Pro\s*Max/i, name: 'iPhone 16 Pro Max' },
  { pattern: /iPhone\s*16\s*Pro/i, name: 'iPhone 16 Pro' },
  { pattern: /iPhone\s*16\s*Plus/i, name: 'iPhone 16 Plus' },
  { pattern: /iPhone\s*16/i, name: 'iPhone 16' },
  { pattern: /iPhone\s*15\s*Pro\s*Max/i, name: 'iPhone 15 Pro Max' },
  { pattern: /iPhone\s*15\s*Pro/i, name: 'iPhone 15 Pro' },
  { pattern: /iPhone\s*15\s*Plus/i, name: 'iPhone 15 Plus' },
  { pattern: /iPhone\s*15/i, name: 'iPhone 15' },
  { pattern: /iPhone\s*14\s*Pro\s*Max/i, name: 'iPhone 14 Pro Max' },
  { pattern: /iPhone\s*14\s*Pro/i, name: 'iPhone 14 Pro' },
  { pattern: /iPhone\s*14/i, name: 'iPhone 14' },
  { pattern: /iPhone\s*13\s*Pro\s*Max/i, name: 'iPhone 13 Pro Max' },
  { pattern: /iPhone\s*13\s*Pro/i, name: 'iPhone 13 Pro' },
  { pattern: /iPhone\s*13/i, name: 'iPhone 13' },
  { pattern: /iPhone\s*12/i, name: 'iPhone 12' },
  { pattern: /iPhone\s*SE/i, name: 'iPhone SE' },
  { pattern: /iPhone/i, name: 'iPhone' },
  { pattern: /iPad\s*Pro/i, name: 'iPad Pro' },
  { pattern: /iPad\s*Air/i, name: 'iPad Air' },
  { pattern: /iPad\s*Mini/i, name: 'iPad Mini' },
  { pattern: /iPad/i, name: 'iPad' },
];

const MAC_DEVICE_MAP = [
  { pattern: /MacBook\s*Pro/i, name: 'MacBook Pro' },
  { pattern: /MacBook\s*Air/i, name: 'MacBook Air' },
  { pattern: /Mac\s*mini/i, name: 'Mac Mini' },
  { pattern: /Mac\s*Studio/i, name: 'Mac Studio' },
  { pattern: /Mac\s*Pro/i, name: 'Mac Pro' },
  { pattern: /iMac/i, name: 'iMac' },
];

const WINDOWS_DEVICE_MAP = [
  { pattern: /Surface\s*Pro/i, name: 'Microsoft Surface Pro' },
  { pattern: /Surface\s*Laptop/i, name: 'Microsoft Surface Laptop' },
  { pattern: /Surface\s*Book/i, name: 'Microsoft Surface Book' },
];

const getDeviceName = () => {
  try {
    const ua = navigator.userAgent;
    const platform = navigator.platform || 'Unknown';

    if (ua.includes('Android')) {
      for (const entry of ANDROID_DEVICE_MAP) {
        if (entry.pattern.test(ua)) return entry.name;
      }
      return 'Android Device';
    }

    if (ua.includes('iPhone') || ua.includes('iPad')) {
      for (const entry of IOS_DEVICE_MAP) {
        if (entry.pattern.test(ua)) return entry.name;
      }
      return 'iOS Device';
    }

    if (ua.includes('Mac OS')) {
      for (const entry of MAC_DEVICE_MAP) {
        if (entry.pattern.test(ua)) return entry.name;
      }
      return 'Mac';
    }

    if (ua.includes('Windows')) {
      for (const entry of WINDOWS_DEVICE_MAP) {
        if (entry.pattern.test(ua)) return entry.name;
      }
      return 'Windows PC';
    }

    if (ua.includes('Linux')) return 'Linux PC';
    return platform || 'Unknown Device';
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

export const logTabClosedEvent = async (userId, userInfo = {}) => {
  if (!userId) return;
  await insertEvent(buildPayload(userId, userInfo, 'tab_closed'));
};
