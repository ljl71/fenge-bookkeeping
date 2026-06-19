const cloudbase = require('@cloudbase/node-sdk');
const crypto = require('crypto');

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_STORE_ID_LENGTH = 64;
const MAX_USERNAME_LENGTH = 64;
const MAX_PIN_LENGTH = 32;
const FAILURE_DELAY_MS = 300;

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();

function hashPin(pin) {
  return crypto.createHash('sha256').update(`fenge-bookkeeping:${pin}`).digest('hex');
}

function hashStoreUserPin(storeId, username, pin) {
  return crypto.createHash('sha256').update(`fenge-bookkeeping-user:${storeId}:${username}:${pin}`).digest('hex');
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(`fenge-bookkeeping-session:${token}`).digest('hex');
}

function fail(code, message) {
  return {
    success: false,
    code,
    message
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timingSafeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

async function failSlow(code, message) {
  await delay(FAILURE_DELAY_MS);
  return fail(code, message);
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function legacyRoleFromUsername(username) {
  if (username === 'mom') return 'mom';
  if (username === 'dad') return 'dad';
  return 'unknown';
}

function canFallbackWithUsername(username) {
  return !username || username === 'boss' || username === 'owner' || username === 'mom' || username === 'dad';
}

async function findStoreUser(storeId, username) {
  if (!username) return null;
  try {
    const result = await db.collection('storeUsers').where({ storeId, username, active: true }).limit(5).get();
    return (result.data || []).find((user) => !user.deletedAt && normalizeUsername(user.username) === username) || null;
  } catch (error) {
    return null;
  }
}

async function hasStoreUsers(storeId) {
  try {
    const result = await db.collection('storeUsers').where({ storeId }).limit(1).get();
    return (result.data || []).some((user) => !user.deletedAt);
  } catch (error) {
    return false;
  }
}

async function saveSession({ loginToken, storeId, userId, role, createdAt, expiresAt }) {
  try {
    await db.collection('sessions').add({
      tokenHash: hashSessionToken(loginToken),
      storeId,
      userId,
      role,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      revokedAt: null
    });
  } catch (error) {
    console.warn('save session failed', error);
  }
}

exports.main = async (event = {}) => {
  const storeId = String(event.storeId || '').trim();
  const username = normalizeUsername(event.username);
  const pin = String(event.pin || '');

  if (!storeId) return fail('MISSING_STORE_ID', '请填写店铺 ID');
  if (!pin) return fail('MISSING_PIN', '请填写店铺 PIN');
  if (storeId.length > MAX_STORE_ID_LENGTH || !/^[a-zA-Z0-9_-]+$/.test(storeId)) {
    return fail('INVALID_STORE_ID', '店铺 ID 格式不正确');
  }
  if (username.length > MAX_USERNAME_LENGTH || (username && !/^[a-zA-Z0-9_-]+$/.test(username))) {
    return fail('INVALID_USERNAME', '账号格式不正确');
  }
  if (pin.length > MAX_PIN_LENGTH) return fail('INVALID_PIN', '店铺 PIN 格式不正确');

  const result = await db.collection('stores').where({ storeId }).limit(1).get();
  const store = result.data && result.data[0];

  if (!store) return failSlow('STORE_NOT_FOUND', '店铺不存在');
  if (!store.active) return failSlow('STORE_DISABLED', '店铺已停用');

  const storeUser = await findStoreUser(storeId, username);
  if (storeUser) {
    if (!timingSafeEqualText(hashStoreUserPin(storeId, storeUser.username, pin), storeUser.pinHash)) {
      return failSlow('PIN_INCORRECT', 'PIN 错误');
    }

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + TOKEN_TTL_MS);
    const loginToken = crypto.randomBytes(32).toString('hex');
    await saveSession({
      loginToken,
      storeId: store.storeId,
      userId: storeUser._id,
      role: storeUser.role || 'employee',
      createdAt,
      expiresAt
    });

    return {
      success: true,
      storeId: store.storeId,
      storeName: store.name,
      userId: storeUser._id,
      username: storeUser.username,
      displayName: storeUser.displayName,
      role: storeUser.role || 'employee',
      legacyRole: storeUser.legacyRole,
      loginToken,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
  }

  if (!canFallbackWithUsername(username)) {
    return failSlow('USER_NOT_FOUND', '账号不存在或已停用');
  }
  if (await hasStoreUsers(storeId)) {
    return failSlow('USER_NOT_FOUND', '账号不存在或已停用');
  }

  if (!timingSafeEqualText(hashPin(pin), store.pinHash)) return failSlow('PIN_INCORRECT', 'PIN 错误');

  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + TOKEN_TTL_MS);
  const loginToken = crypto.randomBytes(32).toString('hex');
  const legacyRole = legacyRoleFromUsername(username);
  const userId = `legacy-${store.storeId}-${legacyRole}`;
  await saveSession({
    loginToken,
    storeId: store.storeId,
    userId,
    role: 'owner',
    createdAt,
    expiresAt
  });

  return {
    success: true,
    storeId: store.storeId,
    storeName: store.name,
    userId,
    username: username || 'owner',
    displayName: legacyRole === 'mom' ? '妈妈' : legacyRole === 'dad' ? '爸爸' : '店主',
    role: 'owner',
    legacyRole,
    loginToken,
    fallbackLogin: true,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };
};
