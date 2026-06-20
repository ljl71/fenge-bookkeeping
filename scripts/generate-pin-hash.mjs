import crypto from 'node:crypto';

const pin = process.argv[2]?.trim();

if (!pin) {
  console.error('用法: node scripts/generate-pin-hash.mjs <PIN>');
  process.exit(1);
}

const pinHash = crypto.createHash('sha256').update(`fenge-bookkeeping:${pin}`).digest('hex');

console.log(`PIN: ${pin}`);
console.log(`pinHash: ${pinHash}`);
