// Client-side password gate.
//
// IMPORTANT: this app has no backend/server — everything runs in the
// browser. This gate deters casual access (someone picking up the device,
// a stray browser tab) but is NOT real security: the check happens in
// client-side JS, so anyone who opens dev tools can read the hash, brute
// force it offline, or simply skip calling markUnlocked(). Don't rely on
// this alone to protect genuinely sensitive data — see README for details
// and options if you need stronger protection.

// SHA-256 hash of the app password. Default password is "faculty2026" —
// change it before sharing this app. See README for how to generate a new
// hash for your own password.
export const PASSWORD_HASH = '3d69207afd04c3b97b162073ab7d2b2746da35b99de27257cf6aebf97d6ecf9b';

const SESSION_KEY = 'facultyRegister.unlocked';

export async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(input: string): Promise<boolean> {
  const hash = await sha256Hex(input);
  return hash === PASSWORD_HASH;
}

export function isUnlocked(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function markUnlocked(): void {
  sessionStorage.setItem(SESSION_KEY, 'true');
}

export function lock(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
