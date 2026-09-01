// Run: node scripts/hash-password.mjs "your-new-password"
// Paste the printed hash into PASSWORD_HASH in src/auth.ts to change the
// app's login password.
import { createHash } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs "your-new-password"');
  process.exit(1);
}

const hash = createHash('sha256').update(password).digest('hex');
console.log(hash);
