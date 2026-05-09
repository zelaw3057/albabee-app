const SHARE_TTL_SECONDS = 60 * 60 * 24 * 90;
const SHARE_ID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const SHARE_ID_LENGTH = 8;
const MAX_SHARE_DATA_LENGTH = 180000;

export function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

export function getShareStore(env) {
  return env && (env.SHARE_KV || env.ALBABEE_SHARE_KV || env.SHARES);
}

export function createShareId() {
  const bytes = new Uint8Array(SHARE_ID_LENGTH);
  crypto.getRandomValues(bytes);
  let id = '';
  for (const byte of bytes) id += SHARE_ID_ALPHABET[byte % SHARE_ID_ALPHABET.length];
  return id;
}

export function validateShareData(data) {
  if (typeof data !== 'string') return '공유 데이터 형식이 올바르지 않습니다.';
  if (!data) return '공유 데이터가 비어 있습니다.';
  if (data.length > MAX_SHARE_DATA_LENGTH) return '공유 데이터가 너무 큽니다.';
  if (!/^[A-Za-z0-9_-]+$/.test(data)) return '공유 데이터 문자 형식이 올바르지 않습니다.';
  return '';
}

export async function saveShare(env, id, payload) {
  const store = getShareStore(env);
  if (!store) return false;
  await store.put(`share:${id}`, JSON.stringify(payload), { expirationTtl: SHARE_TTL_SECONDS });
  return true;
}

export async function readShare(env, id) {
  const store = getShareStore(env);
  if (!store) return null;
  const value = await store.get(`share:${id}`, 'json');
  return value || null;
}

