import { CustomFilter, Draft } from '../types';

const DB_NAME = 'BrutalProcessDB';
const DB_VERSION = 1;

class DB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'id', autoIncrement: true });
        }
        
        if (!db.objectStoreNames.contains('customFilters')) {
          db.createObjectStore('customFilters', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async saveDraft(imageBlob: Blob): Promise<number> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['drafts'], 'readwrite');
      const store = transaction.objectStore('drafts');
      
      const draft = { imageBlob, timestamp: Date.now() };
      const request = store.add(draft);
      
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getDrafts(): Promise<Draft[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['drafts'], 'readonly');
      const store = transaction.objectStore('drafts');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const drafts = request.result.sort((a, b) => b.timestamp - a.timestamp);
        resolve(drafts);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveCustomFilter(name: string, settings: any): Promise<number> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['customFilters'], 'readwrite');
      const store = transaction.objectStore('customFilters');
      
      const filter = { name, settings };
      const request = store.add(filter);
      
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getCustomFilters(): Promise<CustomFilter[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['customFilters'], 'readonly');
      const store = transaction.objectStore('customFilters');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCustomFilter(id: number): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['customFilters'], 'readwrite');
      const store = transaction.objectStore('customFilters');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new DB();
