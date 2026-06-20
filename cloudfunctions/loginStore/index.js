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

function makeLoginToken() {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(32).toString('hex');
}

function fail(message, code) {
  return {
    success: false,
    code,
    message
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function failSlow(message, code) {
  await delay(FAILURE_DELAY_MS);
  return fail(message, code);
}

function timingSafeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function legacyRoleFromUsername(username) {
  if (username === 'mom') return 'mom';
  if (username === 'dad') return 'dad';
  return 'unknown';
}

function canUseStorePinAlias(username) {
  return !username || username === 'boss' || username === 'owner' || username === 'mom' || username === 'dad';
}

async function findStore(storeId) {
  const result = await db.collection('stores').where({ storeId }).limit(1).get();
  return result.data && result.data[0];
}

async function findStoreUser(storeId, username) {
  if (!username) return null;
  try {
    const result = await db.collection('storeUsers').where({ storeId, username, active: true }).limit(5).get();
    return (result.data || []).find((user) => !user.deletedAt && normalizeUsername(user.username) === username) || null;
  } catch (error) {
    // storeUsers is optional for the first CloudBase deployment.
    return null;
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
    // sessions is optional in the first version; login itself should still work.
    console.warn('save session failed', error);
  }
}

function makeSuccessPayload(store, loginToken, createdAt, expiresAt, extra = {}) {
  return {
    success: true,
    storeId: store.storeId,
    storeName: store.name,
    loginToken,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    ...extra
  };
}

exports.main = async (event = {}) => {
  try {
    const storeId = String(event.storeId || '').trim();
    const username = normalizeUsername(event.username);
    const pin = String(event.pin || '').trim();

    if (!storeId) return fail('请填写店铺 ID', 'MISSING_STORE_ID');
    if (!pin) return fail('请填写 PIN', 'MISSING_PIN');
    if (storeId.length > MAX_STORE_ID_LENGTH || !/^[a-zA-Z0-9_-]+$/.test(storeId)) {
      return fail('店铺 ID 格式不正确', 'INVALID_STORE_ID');
    }
    if (username.length > MAX_USERNAME_LENGTH || (username && !/^[a-zA-Z0-9_-]+$/.test(username))) {
      return fail('账号格式不正确', 'INVALID_USERNAME');
    }
    if (pin.length > MAX_PIN_LENGTH) return fail('PIN 格式不正确', 'INVALID_PIN');

    const store = await findStore(storeId);
    if (!store) return failSlow('店铺不存在', 'STORE_NOT_FOUND');
    if (store.active === false) return failSlow('店铺已停用', 'STORE_DISABLED');
    if (!store.pinHash) return fail('店铺未配置 pinHash，请先初始化 stores 数据', 'STORE_PIN_NOT_CONFIGURED');

    const storeUser = await findStoreUser(storeId, username);
    if (storeUser) {
      if (!timingSafeEqualText(hashStoreUserPin(storeId, storeUser.username, pin), storeUser.pinHash)) {
        return failSlow('PIN 错误', 'PIN_INCORRECT');
      }

      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + TOKEN_TTL_MS);
      const loginToken = makeLoginToken();
      const role = storeUser.role || 'employee';
      await saveSession({
        loginToken,
        storeId: store.storeId,
        userId: storeUser._id,
        role,
        createdAt,
        expiresAt
      });

      return makeSuccessPayload(store, loginToken, createdAt, expiresAt, {
        userId: storeUser._id,
        username: storeUser.username,
        displayName: storeUser.displayName,
        role,
        legacyRole: storeUser.legacyRole
      });
    }

    if (username && !canUseStorePinAlias(username)) {
      return failSlow('账号不存在或已停用', 'USER_NOT_FOUND');
    }

    if (!timingSafeEqualText(hashPin(pin), store.pinHash)) {
      return failSlow('PIN 错误', 'PIN_INCORRECT');
    }

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + TOKEN_TTL_MS);
    const loginToken = makeLoginToken();
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

    return makeSuccessPayload(store, loginToken, createdAt, expiresAt, {
      userId,
      username: username || 'owner',
      displayName: legacyRole === 'mom' ? '妈妈' : legacyRole === 'dad' ? '爸爸' : '店主',
      role: 'owner',
      legacyRole,
      fallbackLogin: true
    });
  } catch (error) {
    console.error('loginStore failed', error);
    return fail(error && error.message ? `登录服务异常：${error.message}` : '登录服务异常，请稍后重试', 'INTERNAL_ERROR');
  }
};
