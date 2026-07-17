import { supabase } from '../supabaseClient';

const ALGO_AES = { name: 'AES-GCM', length: 256 };
const ALGO_DERIVE = { name: 'PBKDF2', hash: 'SHA-256', iterations: 310000 };
const MASTER_KEY_SETTING = 'chat_encryption_master_key';

let _masterKeyRaw = null;
let _masterKeyLoaded = false;

function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getOrCreateMasterKey() {
  if (_masterKeyLoaded) return _masterKeyRaw;

  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', MASTER_KEY_SETTING)
    .maybeSingle();

  let rawKey = data?.value;

  if (!rawKey) {
    const rand = new Uint8Array(32);
    crypto.getRandomValues(rand);
    rawKey = bufToBase64(rand.buffer);
    await supabase
      .from('settings')
      .upsert({ key: MASTER_KEY_SETTING, value: rawKey }, { onConflict: 'key' });
  }

  _masterKeyRaw = rawKey;
  _masterKeyLoaded = true;
  return rawKey;
}

async function derivePersonalKey(userId) {
  const masterRaw = await getOrCreateMasterKey();
  const enc = new TextEncoder();
  const masterKeyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(masterRaw), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(`sk-chat-v1-${userId}`), iterations: ALGO_DERIVE.iterations, hash: ALGO_DERIVE.hash },
    masterKeyMaterial,
    ALGO_AES,
    false,
    ['encrypt', 'decrypt']
  );
}

async function generateGroupKey() {
  return crypto.subtle.generateKey(ALGO_AES, true, ['encrypt', 'decrypt']);
}

async function exportGroupKey(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return bufToBase64(raw);
}

async function importGroupKey(b64) {
  return crypto.subtle.importKey('raw', base64ToBuf(b64), ALGO_AES, false, ['encrypt', 'decrypt']);
}

async function encryptWithKey(data, key) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(data));
  return JSON.stringify({ iv: bufToBase64(iv.buffer), ct: bufToBase64(ciphertext) });
}

async function decryptWithKey(payload, key) {
  try {
    const { iv, ct } = JSON.parse(payload);
    const ivBuf = base64ToBuf(iv);
    const ctBuf = base64ToBuf(ct);
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(ivBuf) }, key, ctBuf);
    return new TextDecoder().decode(plainBuf);
  } catch {
    return null;
  }
}

async function encryptGroupKeyForUser(groupKeyRaw, userId) {
  const personalKey = await derivePersonalKey(userId);
  return encryptWithKey(groupKeyRaw, personalKey);
}

async function decryptGroupKeyForUser(encryptedPayload, userId) {
  const personalKey = await derivePersonalKey(userId);
  return decryptWithKey(encryptedPayload, personalKey);
}

function parseEncryptedKeys(encryptedKeysField) {
  if (!encryptedKeysField || typeof encryptedKeysField !== 'string') return {};
  try { return JSON.parse(encryptedKeysField); } catch { return {}; }
}

function serializeEncryptedKeys(obj) {
  return JSON.stringify(obj);
}

export async function createGroupEncryptionKey(groupId, memberUserIds) {
  const groupKey = await generateGroupKey();
  const rawB64 = await exportGroupKey(groupKey);
  const encryptedKeys = {};

  for (const uid of memberUserIds) {
    encryptedKeys[uid] = await encryptGroupKeyForUser(rawB64, uid);
  }

  await supabase
    .from('chat_groups')
    .update({ encrypted_keys: serializeEncryptedKeys(encryptedKeys) })
    .eq('id', groupId);

  return rawB64;
}

export async function getGroupKeyForUser(groupId, userId) {
  const { data } = await supabase
    .from('chat_groups')
    .select('encrypted_keys')
    .eq('id', groupId)
    .maybeSingle();

  if (!data?.encrypted_keys) return null;

  const keys = parseEncryptedKeys(data.encrypted_keys);
  const myEncrypted = keys[userId];
  if (!myEncrypted) return null;

  const rawB64 = await decryptGroupKeyForUser(myEncrypted, userId);
  if (!rawB64) return null;

  return importGroupKey(rawB64);
}

export async function getGroupKeyAsAdmin(groupId, adminUserId) {
  const { data } = await supabase
    .from('chat_groups')
    .select('encrypted_keys')
    .eq('id', groupId)
    .maybeSingle();

  if (!data?.encrypted_keys) return null;

  const keys = parseEncryptedKeys(data.encrypted_keys);
  const firstEntry = Object.values(keys)[0];
  if (!firstEntry) return null;

  const rawB64 = await decryptGroupKeyForUser(firstEntry, adminUserId);
  if (!rawB64) return null;

  return importGroupKey(rawB64);
}

export async function addMemberToGroupEncryption(groupId, newUserId) {
  const { data } = await supabase
    .from('chat_groups')
    .select('encrypted_keys')
    .eq('id', groupId)
    .maybeSingle();

  if (!data?.encrypted_keys) return;

  const keys = parseEncryptedKeys(data.encrypted_keys);

  const firstEntry = Object.values(keys)[0];
  if (!firstEntry) return;

  const rawB64 = await decryptGroupKeyForUser(firstEntry, newUserId);
  if (!rawB64) return;

  keys[newUserId] = await encryptGroupKeyForUser(rawB64, newUserId);

  await supabase
    .from('chat_groups')
    .update({ encrypted_keys: serializeEncryptedKeys(keys) })
    .eq('id', groupId);
}

export async function encryptMessage(plaintext, groupKey) {
  if (!groupKey) return plaintext;
  return encryptWithKey(plaintext, groupKey);
}

export async function decryptMessage(ciphertext, groupKey) {
  if (!groupKey) return ciphertext;
  const result = await decryptWithKey(ciphertext, groupKey);
  return result !== null ? result : ciphertext;
}

export function isEncryptedContent(content) {
  if (!content || typeof content !== 'string') return false;
  try {
    const parsed = JSON.parse(content);
    return typeof parsed.iv === 'string' && typeof parsed.ct === 'string';
  } catch {
    return false;
  }
}

export async function encryptMessages(messages, groupKey) {
  if (!groupKey) return messages;
  const results = await Promise.all(
    messages.map(async (msg) => {
      if (msg._decrypted || !isEncryptedContent(msg.content)) return msg;
      const plain = await decryptMessage(msg.content, groupKey);
      return { ...msg, content: plain, _decrypted: true };
    })
  );
  return results;
}

export async function decryptMessages(messages, groupKey) {
  if (!groupKey) return messages;
  const results = await Promise.all(
    messages.map(async (msg) => {
      if (msg._decrypted || !isEncryptedContent(msg.content)) return { ...msg, _decrypted: true };
      const plain = await decryptMessage(msg.content, groupKey);
      return { ...msg, content: plain, _decrypted: true };
    })
  );
  return results;
}
