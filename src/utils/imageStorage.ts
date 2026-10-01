/**
 * IndexedDB storage for persisting the user's high-resolution background image
 */
const DB_NAME = 'vm_nghean_db';
const STORE_NAME = 'assets';
const KEY_BG_IMAGE = 'custom_certificate_background';
const KEY_PERSONAL_PHOTO = 'personal_runner_photo';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBackgroundImage(dataUrl: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dataUrl, KEY_BG_IMAGE);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error saving image to IndexedDB:', err);
    // Fallback to localStorage if small enough
    try {
      localStorage.setItem(KEY_BG_IMAGE, dataUrl);
    } catch {
      // ignore
    }
  }
}

export async function getSavedBackgroundImage(): Promise<string | null> {
  try {
    const db = await openDB();
    const result: string | null = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_BG_IMAGE);
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result as string);
        } else {
          // fallback to localStorage
          resolve(localStorage.getItem(KEY_BG_IMAGE));
        }
      };
      req.onerror = () => {
        resolve(localStorage.getItem(KEY_BG_IMAGE));
      };
    });

    if (result && (result.includes('QN26') || result.includes('quynhon'))) {
      await removeSavedBackgroundImage();
      return null;
    }
    return result;
  } catch (err) {
    console.error('Error loading image from IndexedDB:', err);
    const local = localStorage.getItem(KEY_BG_IMAGE);
    if (local && (local.includes('QN26') || local.includes('quynhon'))) {
      localStorage.removeItem(KEY_BG_IMAGE);
      return null;
    }
    return local;
  }
}

export async function removeSavedBackgroundImage(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(KEY_BG_IMAGE);
  } catch {
    // ignore
  }
  localStorage.removeItem(KEY_BG_IMAGE);
}

export async function savePersonalPhoto(dataUrl: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dataUrl, KEY_PERSONAL_PHOTO);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error saving personal photo to IndexedDB:', err);
    try {
      localStorage.setItem(KEY_PERSONAL_PHOTO, dataUrl);
    } catch {
      // ignore
    }
  }
}

export async function getSavedPersonalPhoto(): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_PERSONAL_PHOTO);
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result as string);
        } else {
          resolve(localStorage.getItem(KEY_PERSONAL_PHOTO));
        }
      };
      req.onerror = () => {
        resolve(localStorage.getItem(KEY_PERSONAL_PHOTO));
      };
    });
  } catch (err) {
    console.error('Error loading personal photo from IndexedDB:', err);
    return localStorage.getItem(KEY_PERSONAL_PHOTO);
  }
}

export async function removeSavedPersonalPhoto(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(KEY_PERSONAL_PHOTO);
  } catch {
    // ignore
  }
  localStorage.removeItem(KEY_PERSONAL_PHOTO);
}

