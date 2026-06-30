'use client';

const STORAGE_KEY = 'wordpress-ai-publisher.browser-config.v2';
const KEY_DB_NAME = 'wordpress-ai-publisher.crypto';
const KEY_STORE_NAME = 'keys';
const KEY_RECORD_ID = 'browser-config-aes-gcm';

type CipherEnvelope = {
  version: 1;
  iv: string;
  ciphertext: string;
};

export async function loadBrowserConfig<T>(): Promise<T | null> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const envelope = JSON.parse(raw) as CipherEnvelope;
    if (envelope.version !== 1) {
      return null;
    }

    const key = await getOrCreateBrowserKey();
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64ToBytes(envelope.iv)
      },
      key,
      base64ToBytes(envelope.ciphertext)
    );

    return JSON.parse(new TextDecoder().decode(new Uint8Array(plaintext))) as T;
  } catch {
    return null;
  }
}

export async function saveBrowserConfig<T>(config: T): Promise<void> {
  try {
    const key = await getOrCreateBrowserKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      new TextEncoder().encode(JSON.stringify(config))
    );

    const envelope: CipherEnvelope = {
      version: 1,
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext))
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Ignore storage failures; the server save path still works.
  }
}

async function getOrCreateBrowserKey(): Promise<CryptoKey> {
  const stored = await readStoredKey();
  if (stored) {
    return crypto.subtle.importKey('raw', toArrayBuffer(stored), { name: 'AES-GCM' }, false, [
      'encrypt',
      'decrypt'
    ]);
  }

  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  await writeStoredKey(rawKey);
  return crypto.subtle.importKey('raw', toArrayBuffer(rawKey), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt'
  ]);
}

async function readStoredKey(): Promise<Uint8Array | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE_NAME, 'readonly');
    const store = tx.objectStore(KEY_STORE_NAME);
    const request = store.get(KEY_RECORD_ID);

    request.onsuccess = () => {
      const result = request.result as { key?: string } | undefined;
      resolve(result?.key ? base64ToBytes(result.key) : null);
    };

    request.onerror = () => reject(request.error);
  });
}

async function writeStoredKey(key: Uint8Array): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE_NAME, 'readwrite');
    const store = tx.objectStore(KEY_STORE_NAME);
    store.put({ id: KEY_RECORD_ID, key: bytesToBase64(key) });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(KEY_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
        db.createObjectStore(KEY_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
