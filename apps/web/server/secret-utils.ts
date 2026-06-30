import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1';

function encryptionKey(secret = process.env.APP_ENCRYPTION_KEY ?? process.env.APP_SECRET ?? 'development-secret') {
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [PREFIX, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(':');
}

export function decryptSecret(value?: string | null) {
  if (!value) {
    return '';
  }

  if (!value.startsWith(`${PREFIX}:`)) {
    return value;
  }

  const [, , iv, tag, encrypted] = value.split(':');
  if (!iv || !tag || !encrypted) {
    throw new Error('Encrypted secret is malformed.');
  }

  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

export function hasStoredSecret(value?: string | null) {
  return Boolean(value && decryptSecret(value));
}
