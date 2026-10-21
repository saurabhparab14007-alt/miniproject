// IndexedDB Offline Store for Rural/Low-Internet Mode
const DB_NAME = 'SanjeevaniOfflineDB';
const DB_VERSION = 1;

let dbInstance = null;

export async function initOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('patients')) {
        db.createObjectStore('patients', { keyPath: 'patient_id' });
      }
      if (!db.objectStoreNames.contains('cases')) {
        db.createObjectStore('cases', { keyPath: 'case_id' });
      }
      if (!db.objectStoreNames.contains('appointments')) {
        db.createObjectStore('appointments', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pharmacies')) {
        db.createObjectStore('pharmacies', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'queue_id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      console.log('IndexedDB Initialized for Rural/Low-Internet Offline Mode');
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB Error:', event.target.error);
      reject(event.target.error);
    };
  });
}

// Save batch into store
export async function cacheData(storeName, items) {
  if (!dbInstance) await initOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = dbInstance.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    items.forEach(item => store.put(item));
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// Get all from store
export async function getCachedData(storeName) {
  if (!dbInstance) await initOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = dbInstance.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Queue an offline mutation when network drops
export async function queueOfflineMutation(endpoint, method, payload, description) {
  if (!dbInstance) await initOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = dbInstance.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const item = {
      endpoint,
      method,
      payload,
      description,
      queued_at: new Date().toISOString()
    };
    const req = store.add(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

// Get pending offline queue count
export async function getPendingSyncCount() {
  if (!dbInstance) await initOfflineDB();
  return new Promise((resolve) => {
    const tx = dbInstance.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    const countReq = store.count();
    countReq.onsuccess = () => resolve(countReq.result || 0);
    countReq.onerror = () => resolve(0);
  });
}

// Sync all pending mutations back to the server
export async function syncPendingMutations(apiCaller) {
  if (!dbInstance) await initOfflineDB();
  const tx = dbInstance.transaction('sync_queue', 'readonly');
  const store = tx.objectStore('sync_queue');
  const req = store.getAll();

  return new Promise((resolve) => {
    req.onsuccess = async () => {
      const items = req.result || [];
      if (items.length === 0) return resolve({ synced: 0 });

      let successCount = 0;
      for (const item of items) {
        try {
          await apiCaller(item.endpoint, item.method, item.payload);
          successCount++;
          // Remove from queue
          const deleteTx = dbInstance.transaction('sync_queue', 'readwrite');
          deleteTx.objectStore('sync_queue').delete(item.queue_id);
        } catch (e) {
          console.warn('Sync failed for item:', item, e);
        }
      }
      resolve({ synced: successCount, remaining: items.length - successCount });
    };
    req.onerror = () => resolve({ synced: 0 });
  });
}
