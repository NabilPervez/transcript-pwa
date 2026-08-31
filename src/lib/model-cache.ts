// transformers.js defaults to the browser's HTTP Cache Storage for model
// weights. The PRD calls for IndexedDB specifically (it survives aggressive
// cache-clearing / private-browsing quirks more predictably on some
// browsers, and keeps the ~100MB weights out of the Workbox precache
// entirely). This adapter implements the small subset of the Cache API
// surface transformers.js's `env.customCache` expects: match() and put().
const DB_NAME = 'murmur-model-cache';
const STORE = 'weights';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

interface StoredEntry {
  body: ArrayBuffer;
  headers: Record<string, string>;
  status: number;
  statusText: string;
}

export class IndexedDbModelCache {
  private dbPromise = openDb();

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    const key = IndexedDbModelCache.keyFor(request);
    const db = await this.dbPromise;
    const entry = await new Promise<StoredEntry | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as StoredEntry | undefined);
      req.onerror = () => reject(req.error);
    });

    if (!entry) return undefined;

    return new Response(entry.body, {
      status: entry.status,
      statusText: entry.statusText,
      headers: entry.headers
    });
  }

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    const key = IndexedDbModelCache.keyFor(request);
    const body = await response.clone().arrayBuffer();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      headers[name] = value;
    });

    const entry: StoredEntry = {
      body,
      headers,
      status: response.status,
      statusText: response.statusText
    };

    const db = await this.dbPromise;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(entry, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private static keyFor(request: RequestInfo | URL): string {
    if (typeof request === 'string') return request;
    if (request instanceof URL) return request.toString();
    return request.url;
  }
}

export async function isModelCached(urlSubstring: string): Promise<boolean> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAllKeys();
    req.onsuccess = () => {
      const keys = req.result as string[];
      resolve(keys.some((k) => k.includes(urlSubstring)));
    };
    req.onerror = () => reject(req.error);
  });
}
