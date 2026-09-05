/**
 * Small IndexedDB wrapper used as an offline cache.
 *
 * We deliberately do not use localStorage for client or authentication data:
 * localStorage is synchronous, easy to overwrite from DevTools and has a very
 * small quota. IndexedDB is still a device cache (not a security boundary),
 * so authorization always happens on Supabase.
 */
const DB_NAME = 'k2l-recrut-cache';
const DB_VERSION = 1;
const STORE_NAME = 'records';

interface StoredRecord<T> {
  key: string;
  value: T;
}

let databasePromise: Promise<IDBDatabase | null> | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  if (databasePromise) return databasePromise;

  databasePromise = new Promise(resolve => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });

  return databasePromise;
}

export async function readCache<T>(key: string): Promise<T | null> {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise(resolve => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve((request.result as StoredRecord<T> | undefined)?.value ?? null);
  });
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  await new Promise<void>(resolve => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({ key, value } satisfies StoredRecord<T>);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}

export async function removeCache(key: string): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  await new Promise<void>(resolve => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}

export async function clearCache(): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  await new Promise<void>(resolve => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}
