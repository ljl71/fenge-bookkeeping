const cloudbase = require('@cloudbase/node-sdk');
const crypto = require('crypto');

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

exports.main = async (event = {}) => {
  const storeId = String(event.storeId || '').trim();
  const pin = String(event.pin || '');

  if (!storeId) return fail('MISSING_STORE_ID', '请填写店铺 ID');
  if (!pin) return fail('MISSING_PIN', '请填写店铺 PIN');

  const result = await db.collection('stores').where({ storeId }).limit(1).get();
  const store = result.data && result.data[0];

  if (!store) return fail('STORE_NOT_FOUND', '店铺不存在');
  if (!store.active) return fail('STORE_DISABLED', '店铺已停用');
  if (hashPin(pin) !== store.pinHash) return fail('PIN_INCORRECT', 'PIN 错误');

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
