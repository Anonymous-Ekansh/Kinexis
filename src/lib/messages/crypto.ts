/* ═══════════════════════════════════
   MESSAGES — AES-GCM Encryption
   ═══════════════════════════════════ */

const SECRET = process.env.NEXT_PUBLIC_MSG_SECRET || 'kinexis-default-secret-key';

async function deriveKey(userId1: string, userId2: string): Promise<CryptoKey> {
  const sorted = [userId1, userId2].sort();
  const raw = SECRET + sorted[0] + sorted[1];
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(raw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('kinexis-msg'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessage(plaintext: string, userId1: string, userId2: string): Promise<string> {
  try {
    const key = await deriveKey(userId1, userId2);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch {
    return plaintext;
  }
}

export async function decryptMessage(base64: string, userId1: string, userId2: string): Promise<string> {
  try {
    const key = await deriveKey(userId1, userId2);
    const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const ciphertext = raw.slice(12);
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(dec);
  } catch {
    // If decryption fails (old unencrypted messages), return as-is
    return base64;
  }
}
