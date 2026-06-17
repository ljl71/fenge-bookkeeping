const cloudbase = require('@cloudbase/node-sdk');
const crypto = require('crypto');

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_STORE_ID_LENGTH = 64;
const MAX_PIN_LENGTH = 32;
const FAILURE_DELAY_MS = 300;

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();

function hashPin(pin) {
  return crypto.createHash('sha256').update(`fenge-bookkeeping:${pin}`).digest('hex');
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

exports.main = async (event = {}) => {
  const storeId = String(event.storeId || '').trim();
  const pin = String(event.pin || '');

  if (!storeId) return fail('MISSING_STORE_ID', '请填写店铺 ID');
  if (!pin) return fail('MISSING_PIN', '请填写店铺 PIN');
  if (storeId.length > MAX_STORE_ID_LENGTH || !/^[a-zA-Z0-9_-]+$/.test(storeId)) {
    return fail('INVALID_STORE_ID', '店铺 ID 格式不正确');
  }
  if (pin.length > MAX_PIN_LENGTH) return fail('INVALID_PIN', '店铺 PIN 格式不正确');

  const result = await db.collection('stores').where({ storeId }).limit(1).get();
  const store = result.data && result.data[0];

  if (!store) return failSlow('STORE_NOT_FOUND', '店铺不存在');
  if (!store.active) return failSlow('STORE_DISABLED', '店铺已停用');
  if (!timingSafeEqualText(hashPin(pin), store.pinHash)) return failSlow('PIN_INCORRECT', 'PIN 错误');

  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + TOKEN_TTL_MS);

  return {
    success: true,
    storeId: store.storeId,
    storeName: store.name,
    loginToken: crypto.randomBytes(32).toString('hex'),
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };
};
