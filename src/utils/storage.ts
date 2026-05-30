import type { StorageData, CorrectionResult, UsageStats } from "../types";

const MAX_RECENT = 20;

function getStorage(): typeof chrome.storage.sync {
  return chrome.storage.sync;
}

export async function getStorageData(): Promise<StorageData> {
  return new Promise((resolve) => {
    getStorage().get(null, (data: { [key: string]: unknown }) => {
      resolve(data as StorageData);
    });
  });
}

export async function setStorageData(data: Partial<StorageData>): Promise<void> {
  return new Promise((resolve) => {
    getStorage().set(data, resolve);
  });
}

// API Key
export async function getApiKey(): Promise<string | undefined> {
  const data = await getStorageData();
  return data.apiKey;
}

export async function saveApiKey(apiKey: string): Promise<void> {
  await setStorageData({ apiKey });
}

export async function deleteApiKey(): Promise<void> {
  return new Promise((resolve) => {
    getStorage().remove("apiKey", resolve);
  });
}

// Theme
export async function getTheme(): Promise<StorageData["theme"]> {
  const data = await getStorageData();
  return data.theme ?? "system";
}

export async function saveTheme(theme: StorageData["theme"]): Promise<void> {
  await setStorageData({ theme });
}

// Recent Corrections
export async function getRecentCorrections(): Promise<CorrectionResult[]> {
  const data = await getStorageData();
  return data.recentCorrections ?? [];
}

export async function addRecentCorrection(
  correction: CorrectionResult
): Promise<void> {
  const existing = await getRecentCorrections();
  const updated = [correction, ...existing].slice(0, MAX_RECENT);
  await setStorageData({ recentCorrections: updated });
}

export async function clearRecentCorrections(): Promise<void> {
  await setStorageData({ recentCorrections: [] });
}

// Usage Stats
export async function getUsageStats(): Promise<UsageStats> {
  const data = await getStorageData();
  return (
    data.usageStats ?? {
      totalCorrections: 0,
      totalCharacters: 0,
    }
  );
}

export async function incrementUsageStats(charCount: number): Promise<void> {
  const stats = await getUsageStats();
  await setStorageData({
    usageStats: {
      totalCorrections: stats.totalCorrections + 1,
      totalCharacters: stats.totalCharacters + charCount,
      lastUsed: Date.now(),
    },
  });
}

export async function clearAllData(): Promise<void> {
  return new Promise((resolve) => {
    getStorage().clear(resolve);
  });
}

// Auto-fix preference
export async function getAutoFix(): Promise<{ enabled: boolean; delay: number }> {
  const data = await getStorageData();
  return {
    enabled: data.autoFix ?? false,
    delay: data.autoFixDelay ?? 800,
  };
}

export async function saveAutoFix(enabled: boolean, delay?: number): Promise<void> {
  await setStorageData({
    autoFix: enabled,
    ...(delay !== undefined ? { autoFixDelay: delay } : {}),
  });
}

// Mask API key for display
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "••••••••";
  return key.slice(0, 4) + "••••••••••••" + key.slice(-4);
}

// Validate API key format (Gemini keys start with "AIza")
export function validateApiKeyFormat(key: string): boolean {
  return /^AIza[0-9A-Za-z_-]{35,}$/.test(key.trim());
}
