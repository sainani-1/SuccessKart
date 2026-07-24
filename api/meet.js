import { createClient } from '@supabase/supabase-js';
import { RoomServiceClient, AccessToken } from 'livekit-server-sdk';
import crypto from 'crypto';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100_000) {
        req.destroy();
        reject(new Error('Request body is too large.'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });

const validateEnv = () => {
  const vars = {
    SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    LIVEKIT_URL: process.env.LIVEKIT_URL || '',
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || '',
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || '',
  };
  const missing = Object.entries(vars).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) return { ok: false, missing };
  return { ok: true, ...vars };
};

async function authenticate(supabase, apiKey) {
  const { data, error } = await supabase
    .from('sucesskart_meet_api_keys')
    .select('id, user_id, is_active, minutes_remaining')
    .eq('api_key', apiKey)
    .maybeSingle();
  if (error || !data) return { ok: false, status: 401, error: 'Invalid API key.' };
  if (!data.is_active) return { ok: false, status: 403, error: 'API key is deactivated.' };
  return { ok: true, keyData: data };
}

async function handleCreateRoom(req, res, supabase, keyData, lkUrl, lkApiKey, lkApiSecret) {
  const body = await readBody(req);
  const roomName = body.room_name;

  if (!roomName || typeof roomName !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(roomName)) {
    return json(res, 400, {
      error: 'room_name is required and must only contain letters, numbers, hyphens, and underscores.',
    });
  }

  const emptyTimeout = Math.max(60, Math.min(86400, parseInt(body.empty_timeout, 10) || 300));
  const maxParticipants = Math.max(1, Math.min(100, parseInt(body.max_participants, 10) || 10));

  const minutesToDeduct = Math.max(1, Math.ceil(emptyTimeout / 60));

  if (keyData.minutes_remaining < minutesToDeduct) {
    return json(res, 402, {
      error: `Insufficient minutes. You have ${keyData.minutes_remaining} minutes remaining but need ${minutesToDeduct} minutes to create this room.`,
    });
  }

  const livekitRoomName = `sucesskart-meet-${roomName}`;
  const client = new RoomServiceClient(lkUrl, lkApiKey, lkApiSecret);

  let roomAlreadyExists = false;
  try {
    const existing = await client.listRooms();
    roomAlreadyExists = existing.some(r => r.name === livekitRoomName);
  } catch {
    // If LiveKit is unreachable, still try to create
  }

  if (roomAlreadyExists) {
    return json(res, 409, { error: `Room "${roomName}" already exists.` });
  }

  try {
    await client.createRoom({
      name: livekitRoomName,
      emptyTimeout,
      maxParticipants,
    });
  } catch (err) {
    return json(res, 502, { error: 'Failed to create room in LiveKit.', details: err.message });
  }

  const hostId = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  const token = new AccessToken(lkApiKey, lkApiSecret, {
    identity: `meet:host:${hostId}`,
    ttl: '4h',
    name: 'Host',
  });

  token.addGrant({
    room: livekitRoomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const jwt = await token.toJwt();

  const { error: updateError } = await supabase
    .from('sucesskart_meet_api_keys')
    .update({ minutes_remaining: keyData.minutes_remaining - minutesToDeduct })
    .eq('id', keyData.id);

  if (updateError) {
    console.error('Failed to deduct minutes:', updateError);
  }

  const APP_URL = (process.env.VITE_PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const encodedUrl = encodeURIComponent(lkUrl);

  return json(res, 201, {
    room_name: roomName,
    room_sid: livekitRoomName,
    join_url: `${APP_URL}/meet/rooms/${roomName}?token=${jwt}&serverUrl=${encodedUrl}`,
    minutes_deducted: minutesToDeduct,
    minutes_remaining: keyData.minutes_remaining - minutesToDeduct,
  });
}

async function handleListRooms(req, res, supabase, keyData, lkUrl, lkApiKey, lkApiSecret) {
  const client = new RoomServiceClient(lkUrl, lkApiKey, lkApiSecret);

  let rooms;
  try {
    rooms = await client.listRooms();
  } catch (err) {
    return json(res, 502, { error: 'Failed to fetch rooms from LiveKit.', details: err.message });
  }

  const userRooms = rooms
    .filter(r => r.name.startsWith('sucesskart-meet-'))
    .map(r => ({
      room_name: r.name.replace(/^sucesskart-meet-/, ''),
      room_sid: r.name,
      participant_count: r.numParticipants || 0,
      created_at: r.creationTime ? new Date(r.creationTime).toISOString() : null,
    }));

  return json(res, 200, { rooms: userRooms });
}

async function handleDeleteRoom(req, res, supabase, keyData, roomName, lkUrl, lkApiKey, lkApiSecret) {
  if (!roomName) {
    return json(res, 400, { error: 'Room name is required.' });
  }

  const livekitRoomName = `sucesskart-meet-${roomName}`;
  const client = new RoomServiceClient(lkUrl, lkApiKey, lkApiSecret);

  try {
    await client.deleteRoom(livekitRoomName);
  } catch (err) {
    if (err.message && (err.message.includes('not found') || err.message.includes('does not exist'))) {
      return json(res, 404, { error: `Room "${roomName}" not found.` });
    }
    return json(res, 502, { error: 'Failed to delete room.', details: err.message });
  }

  return json(res, 200, { status: 'deleted', room_name: roomName });
}

async function handleCreateToken(req, res, supabase, keyData, roomName, lkUrl, lkApiKey, lkApiSecret) {
  if (!roomName) {
    return json(res, 400, { error: 'Room name is required.' });
  }

  const livekitRoomName = `sucesskart-meet-${roomName}`;
  const client = new RoomServiceClient(lkUrl, lkApiKey, lkApiSecret);

  let roomExists = false;
  try {
    const existing = await client.listRooms();
    roomExists = existing.some(r => r.name === livekitRoomName);
  } catch { /* ignore */ }

  if (!roomExists) {
    return json(res, 404, { error: `Room "${roomName}" not found. Create it first via POST /api/v1/meet/rooms.` });
  }

  const guestId = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const token = new AccessToken(lkApiKey, lkApiSecret, {
    identity: `meet:guest:${guestId}`,
    ttl: '4h',
    name: `Guest ${guestId.slice(0, 6)}`,
  });

  token.addGrant({
    room: livekitRoomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const jwt = await token.toJwt();

  const APP_URL = (process.env.VITE_PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/+$/, '');

  return json(res, 201, {
    room_name: roomName,
    token: jwt,
    server_url: lkUrl,
    join_url: `${APP_URL}/meet/rooms/${roomName}?token=${jwt}&serverUrl=${encodeURIComponent(lkUrl)}`,
  });
}

async function handleCreateSchedule(req, res, supabase, keyData) {
  const body = await readBody(req);
  const title = (body.title || '').trim();
  const scheduledAt = body.scheduled_at;

  if (!title) {
    return json(res, 400, { error: 'title is required for scheduling.' });
  }
  if (!scheduledAt) {
    return json(res, 400, { error: 'scheduled_at is required (ISO 8601 date).' });
  }

  const date = new Date(scheduledAt);
  if (isNaN(date.getTime())) {
    return json(res, 400, { error: 'Invalid scheduled_at date.' });
  }

  const roomName = crypto.randomUUID().replace(/-/g, '').slice(0, 8);

  const { data, error } = await supabase
    .from('sucesskart_meet_scheduled')
    .insert({
      user_id: keyData.user_id,
      api_key_id: keyData.id,
      room_name: roomName,
      title,
      scheduled_at: date.toISOString(),
      status: 'scheduled',
    })
    .select('id, room_name, title, scheduled_at, status, created_at')
    .maybeSingle();

  if (error) {
    return json(res, 500, { error: 'Failed to schedule meeting.', details: error.message });
  }

  return json(res, 201, data);
}

async function handleListSchedules(req, res, supabase, keyData) {
  const { data, error } = await supabase
    .from('sucesskart_meet_scheduled')
    .select('id, room_name, title, scheduled_at, status, room_sid, created_at')
    .eq('user_id', keyData.user_id)
    .order('scheduled_at', { ascending: false });

  if (error) {
    return json(res, 500, { error: 'Failed to list schedules.', details: error.message });
  }

  return json(res, 200, { schedules: data || [] });
}

async function handleDeleteSchedule(req, res, supabase, keyData, id) {
  const { data, error } = await supabase
    .from('sucesskart_meet_scheduled')
    .delete()
    .eq('id', id)
    .eq('user_id', keyData.user_id)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    return json(res, 404, { error: 'Scheduled meeting not found.' });
  }

  return json(res, 200, { status: 'cancelled', id });
}

async function handleStartSchedule(req, res, supabase, keyData, id, lkUrl, lkApiKey, lkApiSecret) {
  const { data: schedule, error: fetchError } = await supabase
    .from('sucesskart_meet_scheduled')
    .select('*')
    .eq('id', id)
    .eq('user_id', keyData.user_id)
    .maybeSingle();

  if (fetchError || !schedule) {
    return json(res, 404, { error: 'Scheduled meeting not found.' });
  }

  if (schedule.status !== 'scheduled') {
    return json(res, 400, { error: `Cannot start meeting with status "${schedule.status}".` });
  }

  const livekitRoomName = `sucesskart-meet-${schedule.room_name}`;
  const client = new RoomServiceClient(lkUrl, lkApiKey, lkApiSecret);

  try {
    await client.createRoom({
      name: livekitRoomName,
      emptyTimeout: 300,
      maxParticipants: 10,
    });
  } catch (err) {
    return json(res, 502, { error: 'Failed to create room.', details: err.message });
  }

  const hostId = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  const token = new AccessToken(lkApiKey, lkApiSecret, {
    identity: `meet:host:${hostId}`,
    ttl: '4h',
    name: 'Host',
  });
  token.addGrant({ room: livekitRoomName, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
  const jwt = await token.toJwt();

  const APP_URL = (process.env.VITE_PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/+$/, '');

  const { error: updateError } = await supabase
    .from('sucesskart_meet_scheduled')
    .update({ status: 'active', room_sid: livekitRoomName })
    .eq('id', id);

  if (updateError) {
    console.error('Failed to update schedule status:', updateError);
  }

  return json(res, 201, {
    room_name: schedule.room_name,
    room_sid: livekitRoomName,
    title: schedule.title,
    join_url: `${APP_URL}/meet/rooms/${schedule.room_name}?token=${jwt}&serverUrl=${encodeURIComponent(lkUrl)}`,
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathParts = url.pathname.replace(/^\/api\/v1\/meet\/?/, '').split('/').filter(Boolean);
  const resource = pathParts[0];
  const resourceId = pathParts[1];
  const subResource = pathParts[2];

  if (resource && resource !== 'rooms' && resource !== 'schedule') {
    return json(res, 404, { error: 'Not found. Use /api/v1/meet/rooms or /api/v1/meet/schedule' });
  }

  if (!resource) {
    return json(res, 200, {
      name: 'SuccessKart Meet API v1',
      endpoints: {
        'POST /api/v1/meet/rooms': 'Create a meeting room',
        'GET /api/v1/meet/rooms': 'List your meeting rooms',
        'DELETE /api/v1/meet/rooms/{name}': 'Delete a meeting room',
        'POST /api/v1/meet/rooms/{name}/token': 'Generate a participant token for an existing room',
        'POST /api/v1/meet/schedule': 'Schedule a meeting for a future time',
        'GET /api/v1/meet/schedule': 'List your scheduled meetings',
        'DELETE /api/v1/meet/schedule/{id}': 'Cancel a scheduled meeting',
        'POST /api/v1/meet/schedule/{id}/start': 'Start a scheduled meeting now',
      },
      docs: '/sucesskart-meet-documentation',
      auth: 'Authorization: Bearer YOUR_API_KEY',
    });
  }

  const env = validateEnv();
  if (!env.ok) {
    return json(res, 500, { error: `Server configuration error: missing ${env.missing.join(', ')}` });
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  // Public endpoint: /api/v1/meet/rooms/{name}/token (no API key required)
  if (resource === 'rooms' && req.method === 'POST' && resourceId && subResource === 'token') {
    return await handleCreateToken(req, res, supabase, null, resourceId, env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
  }

  // All other endpoints require API key authentication
  const authHeader = req.headers['authorization'] || '';
  const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!apiKey) {
    return json(res, 401, { error: 'Missing Authorization header. Use: Bearer YOUR_API_KEY' });
  }

  const authResult = await authenticate(supabase, apiKey);
  if (!authResult.ok) {
    return json(res, authResult.status, { error: authResult.error });
  }

  try {
    if (resource === 'schedule') {
      if (req.method === 'POST' && !resourceId) {
        return await handleCreateSchedule(req, res, supabase, authResult.keyData);
      } else if (req.method === 'GET') {
        return await handleListSchedules(req, res, supabase, authResult.keyData);
      } else if (req.method === 'DELETE' && resourceId && !subResource) {
        return await handleDeleteSchedule(req, res, supabase, authResult.keyData, resourceId);
      } else if (req.method === 'POST' && resourceId && subResource === 'start') {
        return await handleStartSchedule(req, res, supabase, authResult.keyData, resourceId, env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
      }
      return json(res, 405, { error: 'Method not allowed for schedule.' });
    }

    if (req.method === 'POST' && !resourceId) {
      return await handleCreateRoom(req, res, supabase, authResult.keyData, env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
    } else if (req.method === 'GET') {
      return await handleListRooms(req, res, supabase, authResult.keyData, env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
    } else if (req.method === 'DELETE' && resourceId && !subResource) {
      return await handleDeleteRoom(req, res, supabase, authResult.keyData, resourceId, env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
    }

    return json(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    console.error('Meet API error:', error);
    return json(res, 500, { error: 'Internal server error', details: error.message });
  }
}
