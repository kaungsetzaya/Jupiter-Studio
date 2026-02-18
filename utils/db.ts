/**
 * Advanced IndexedDB wrapper for persistent storage of audio blobs and project state
 */
const DB_NAME = 'JupiterStore_v3';
const STORE_AUDIO = 'AudioCache';
const STORE_PROJECTS = 'Projects';
const DB_VERSION = 3;

// Helper to check if IDB is available
const isIdbSupported = () => {
  try {
    return 'indexedDB' in window && window.indexedDB !== null;
  } catch (e) {
    return false;
  }
};

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!isIdbSupported()) {
      reject(new Error("IndexedDB not supported or blocked"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO);
      }
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveAudio = async (key: string, data: ArrayBuffer | Blob): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AUDIO, 'readwrite');
    const store = tx.objectStore(STORE_AUDIO);
    store.put(data, key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to save audio (Storage might be blocked):', e);
  }
};

export const getAudio = async (key: string): Promise<ArrayBuffer | Blob | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AUDIO, 'readonly');
    const store = tx.objectStore(STORE_AUDIO);
    const request = store.get(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('Failed to get audio:', e);
    return null;
  }
};

export const hasAudio = async (key: string): Promise<boolean> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AUDIO, 'readonly');
    const store = tx.objectStore(STORE_AUDIO);
    const request = store.count(key);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
};

export const saveProject = async (id: string, state: any): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    tx.objectStore(STORE_PROJECTS).put(state, id);
  } catch (e) {
    console.warn("Project save failed:", e);
  }
};

export const getLatestProject = async (): Promise<any | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const results = request.result;
        if (results.length === 0) resolve(null);
        resolve(results[results.length - 1]);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};