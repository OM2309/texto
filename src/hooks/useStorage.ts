import { useState, useEffect, useCallback } from "react";
import type { StorageData } from "../types";
import {
  getStorageData,
  saveApiKey,
  deleteApiKey,
  saveTheme,
  getRecentCorrections,
  clearRecentCorrections,
  getUsageStats,
  clearAllData,
} from "../utils/storage";

export function useStorage() {
  const [data, setData] = useState<StorageData>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [storageData, recentCorrections, usageStats] = await Promise.all([
      getStorageData(),
      getRecentCorrections(),
      getUsageStats(),
    ]);
    setData({ ...storageData, recentCorrections, usageStats });
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const listener = () => refresh();
    chrome.storage.sync.onChanged.addListener(listener);
    return () => chrome.storage.sync.onChanged.removeListener(listener);
  }, [refresh]);

  const updateApiKey = useCallback(
    async (key: string) => {
      await saveApiKey(key);
      await refresh();
    },
    [refresh]
  );

  const removeApiKey = useCallback(async () => {
    await deleteApiKey();
    await refresh();
  }, [refresh]);

  const updateTheme = useCallback(
    async (theme: StorageData["theme"]) => {
      await saveTheme(theme);
      await refresh();
    },
    [refresh]
  );

  const clearHistory = useCallback(async () => {
    await clearRecentCorrections();
    await refresh();
  }, [refresh]);

  const clearAll = useCallback(async () => {
    await clearAllData();
    await refresh();
  }, [refresh]);

  return {
    data,
    loading,
    refresh,
    updateApiKey,
    removeApiKey,
    updateTheme,
    clearHistory,
    clearAll,
  };
}
