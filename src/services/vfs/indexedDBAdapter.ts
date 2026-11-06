/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DB_NAME = 'AetherForge_Master_DB';
const DB_VERSION = 2;
const STORE_PROJECTS = 'projects';
const STORE_SNAPSHOTS = 'snapshots';
const STORE_VFS = 'vfs_files';
const STORE_ASSETS = 'binary_assets';

export class IndexedDBAdapter {
  private db: IDBDatabase | null = null;
  private isReady: boolean = false;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initDB();
  }

  private initDB(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB not supported in environment.');
        resolve();
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_VFS)) {
          db.createObjectStore(STORE_VFS, { keyPath: 'path' });
        }
        if (!db.objectStoreNames.contains(STORE_ASSETS)) {
          db.createObjectStore(STORE_ASSETS, { keyPath: 'id' });
        }
      };

      request.onsuccess = (e: Event) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        this.isReady = true;
        resolve();
      };

      request.onerror = (e) => {
        console.warn('IndexedDB open error', e);
        resolve();
      };
    });
  }

  public async ensureReady(): Promise<void> {
    if (!this.isReady) {
      await this.initPromise;
    }
  }

  public async setItem<T>(storeName: string, key: string, value: T): Promise<boolean> {
    await this.ensureReady();
    if (!this.db) return false;

    return new Promise(resolve => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put({ id: key, path: key, data: value, updatedAt: Date.now() });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  public async getItem<T>(storeName: string, key: string): Promise<T | null> {
    await this.ensureReady();
    if (!this.db) return null;

    return new Promise(resolve => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => {
          const res = request.result;
          resolve(res ? (res.data ?? res) : null);
        };
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  public async getAll<T>(storeName: string): Promise<T[]> {
    await this.ensureReady();
    if (!this.db) return [];

    return new Promise(resolve => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => {
          const list = request.result || [];
          resolve(list.map(item => item.data ?? item));
        };
        request.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  public async deleteItem(storeName: string, key: string): Promise<boolean> {
    await this.ensureReady();
    if (!this.db) return false;

    return new Promise(resolve => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }
}

export const idbAdapter = new IndexedDBAdapter();
