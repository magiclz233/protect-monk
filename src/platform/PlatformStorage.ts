interface WechatStorageApi {
  getStorageSync?: (key: string) => unknown;
  setStorageSync?: (key: string, value: string) => void;
  removeStorageSync?: (key: string) => void;
}

const memoryStorage = new Map<string, string>();

function getWechatStorage(): WechatStorageApi | null {
  const wxApi = (globalThis as { wx?: WechatStorageApi }).wx;
  if (!wxApi || typeof wxApi.getStorageSync !== 'function' || typeof wxApi.setStorageSync !== 'function') {
    return null;
  }
  return wxApi;
}

function getBrowserStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probeKey = '__guard_monk_storage_probe__';
    localStorage.setItem(probeKey, '1');
    localStorage.removeItem(probeKey);
    return localStorage;
  } catch {
    return null;
  }
}

export const platformStorage = {
  getItem(key: string): string | null {
    const wxStorage = getWechatStorage();
    if (wxStorage?.getStorageSync) {
      try {
        const value = wxStorage.getStorageSync(key);
        if (value === undefined || value === null || value === '') return null;
        return typeof value === 'string' ? value : JSON.stringify(value);
      } catch {
        return memoryStorage.get(key) ?? null;
      }
    }

    const browserStorage = getBrowserStorage();
    if (browserStorage) {
      return browserStorage.getItem(key);
    }

    return memoryStorage.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    const wxStorage = getWechatStorage();
    if (wxStorage?.setStorageSync) {
      try {
        wxStorage.setStorageSync(key, value);
        memoryStorage.set(key, value);
        return;
      } catch {
        memoryStorage.set(key, value);
        return;
      }
    }

    const browserStorage = getBrowserStorage();
    if (browserStorage) {
      browserStorage.setItem(key, value);
      return;
    }

    memoryStorage.set(key, value);
  },

  removeItem(key: string): void {
    const wxStorage = getWechatStorage();
    if (wxStorage?.removeStorageSync) {
      try {
        wxStorage.removeStorageSync(key);
      } catch {
        // 内存兜底仍需清理，避免本局读到旧数据。
      }
    }

    const browserStorage = getBrowserStorage();
    if (browserStorage) {
      browserStorage.removeItem(key);
    }

    memoryStorage.delete(key);
  },
};
