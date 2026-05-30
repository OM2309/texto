import { useState } from "react";
import type { StorageData, UsageStats, CorrectionResult } from "../types";
import { validateApiKeyFormat, maskApiKey } from "../utils/storage";
import { testApiKey } from "../services/gemini";
import { truncateText } from "../utils/sanitize";

interface SettingsPageProps {
  data: StorageData;
  onBack: () => void;
  onUpdateApiKey: (key: string) => Promise<void>;
  onRemoveApiKey: () => Promise<void>;
  onUpdateTheme: (theme: StorageData["theme"]) => Promise<void>;
  onClearHistory: () => Promise<void>;
  onClearAll: () => Promise<void>;
}

export function SettingsPage({
  data,
  onBack,
  onUpdateApiKey,
  onRemoveApiKey,
  onUpdateTheme,
  onClearHistory,
  onClearAll,
}: SettingsPageProps) {
  const [newKey, setNewKey] = useState("");
  const [showNewKey, setShowNewKey] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [keySuccess, setKeySuccess] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "fail" | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const stats: UsageStats = data.usageStats ?? {
    totalCorrections: 0,
    totalCharacters: 0,
  };

  async function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    setKeyError("");
    setKeySuccess("");

    const trimmed = newKey.trim();
    if (!trimmed) {
      setKeyError("Please enter an API key.");
      return;
    }
    if (!validateApiKeyFormat(trimmed)) {
      setKeyError("Invalid format. Gemini keys start with 'AIza'.");
      return;
    }

    setTesting(true);
    try {
      const valid = await testApiKey(trimmed);
      if (!valid) {
        setKeyError("Key validation failed. Please check your key.");
        return;
      }
      await onUpdateApiKey(trimmed);
      setNewKey("");
      setKeySuccess("API key updated successfully.");
      setTimeout(() => setKeySuccess(""), 3000);
    } catch {
      setKeyError("Could not validate key. Check your connection.");
    } finally {
      setTesting(false);
    }
  }

  async function handleTestConnection() {
    if (!data.apiKey) return;
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await testApiKey(data.apiKey);
      setTestResult(ok ? "success" : "fail");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  }

  async function handleClearAll() {
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      return;
    }
    await onClearAll();
    setConfirmClearAll(false);
  }

  return (
    <div className="settings-page">
      <header className="popup-header">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span className="popup-logo">Settings</span>
        <div style={{ width: 28 }} />
      </header>

      <div className="settings-body">
        {/* API Key Section */}
        <section className="settings-section">
          <h2 className="settings-section-title">Gemini API Key</h2>

          {data.apiKey && (
            <div className="key-display">
              <code className="key-masked">{maskApiKey(data.apiKey)}</code>
              <div className="key-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  {testing ? <span className="spinner-sm" /> : null}
                  Test Connection
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={onRemoveApiKey}
                >
                  Remove
                </button>
              </div>
              {testResult === "success" && (
                <p className="status-ok">✓ Connection successful</p>
              )}
              {testResult === "fail" && (
                <p className="status-err">✗ Connection failed. Check your key.</p>
              )}
            </div>
          )}

          <form onSubmit={handleSaveKey} className="key-form">
            <div className="input-wrap">
              <input
                type={showNewKey ? "text" : "password"}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder={data.apiKey ? "Enter new key to replace…" : "AIza…"}
                className="field-input"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowNewKey((v) => !v)}
                aria-label={showNewKey ? "Hide" : "Show"}
              >
                {showNewKey ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {keyError && <p className="field-error">{keyError}</p>}
            {keySuccess && <p className="field-success">{keySuccess}</p>}
            <button type="submit" className="btn btn-primary btn-sm" disabled={testing || !newKey.trim()}>
              {testing ? <><span className="spinner-sm" /> Validating…</> : "Save Key"}
            </button>
          </form>
        </section>

        {/* Theme Section */}
        <section className="settings-section">
          <h2 className="settings-section-title">Appearance</h2>
          <div className="theme-options">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                className={`theme-btn ${data.theme === t || (!data.theme && t === "system") ? "theme-btn--active" : ""}`}
                onClick={() => onUpdateTheme(t)}
              >
                {t === "light" ? "☀️" : t === "dark" ? "🌙" : "💻"}{" "}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </section>

        {/* Usage Stats */}
        <section className="settings-section">
          <h2 className="settings-section-title">Usage Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{stats.totalCorrections}</span>
              <span className="stat-label">Corrections</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {stats.totalCharacters > 1000
                  ? `${(stats.totalCharacters / 1000).toFixed(1)}k`
                  : stats.totalCharacters}
              </span>
              <span className="stat-label">Characters</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {stats.lastUsed
                  ? new Date(stats.lastUsed).toLocaleDateString()
                  : "—"}
              </span>
              <span className="stat-label">Last Used</span>
            </div>
          </div>
        </section>

        {/* Recent Corrections */}
        {data.recentCorrections && data.recentCorrections.length > 0 && (
          <section className="settings-section">
            <div className="section-header-row">
              <h2 className="settings-section-title">Recent Corrections</h2>
              <button className="btn btn-ghost btn-sm" onClick={onClearHistory}>
                Clear
              </button>
            </div>
            <ul className="history-list">
              {data.recentCorrections.slice(0, 5).map((c: CorrectionResult, i: number) => (
                <li key={i} className="history-item">
                  <span className="history-original">{truncateText(c.original, 60)}</span>
                  <span className="history-arrow">→</span>
                  <span className="history-corrected">{truncateText(c.corrected, 60)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Danger Zone */}
        <section className="settings-section settings-section--danger">
          <h2 className="settings-section-title">Data</h2>
          <button
            className={`btn btn-full ${confirmClearAll ? "btn-danger" : "btn-secondary"}`}
            onClick={handleClearAll}
          >
            {confirmClearAll ? "⚠️ Confirm: Clear All Data" : "Clear All Data & Settings"}
          </button>
          {confirmClearAll && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirmClearAll(false)}
            >
              Cancel
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
