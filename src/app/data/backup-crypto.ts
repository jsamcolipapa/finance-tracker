/**
 * Passphrase protection for backup files: PBKDF2-SHA256 key derivation + AES-256-GCM,
 * all via WebCrypto so it works offline. The KDF parameters travel with the file.
 */

export interface EncryptedEnvelope {
  app: 'stillwater';
  encrypted: true;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  cipher: { name: 'AES-GCM'; iv: string };
  data: string;
}

export const DEFAULT_ITERATIONS = 600_000;

export class WrongPassphraseError extends Error {
  constructor() {
    super("That passphrase doesn't unlock this backup.");
  }
}

export async function encryptText(
  plaintext: string,
  passphrase: string,
  iterations = DEFAULT_ITERATIONS,
): Promise<EncryptedEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, iterations);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    app: 'stillwater',
    encrypted: true,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: toBase64(salt) },
    cipher: { name: 'AES-GCM', iv: toBase64(iv) },
    data: toBase64(new Uint8Array(data)),
  };
}

export async function decryptText(env: EncryptedEnvelope, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase, fromBase64(env.kdf.salt), env.kdf.iterations);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(env.cipher.iv) },
      key,
      fromBase64(env.data),
    );
    return new TextDecoder().decode(plain);
  } catch {
    // AES-GCM authentication fails for a wrong key (or a tampered file).
    throw new WrongPassphraseError();
  }
}

export function isEncryptedEnvelope(v: unknown): v is EncryptedEnvelope {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, any>;
  return (
    e['app'] === 'stillwater' &&
    e['encrypted'] === true &&
    e['kdf']?.name === 'PBKDF2' &&
    Number.isInteger(e['kdf']?.iterations) &&
    typeof e['kdf']?.salt === 'string' &&
    e['cipher']?.name === 'AES-GCM' &&
    typeof e['cipher']?.iv === 'string' &&
    typeof e['data'] === 'string'
  );
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase.normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
