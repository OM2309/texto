import { useState } from "react";
import { validateApiKeyFormat } from "../utils/storage";
import { testApiKey } from "../services/gemini";

interface SetupScreenProps {
  onSave: (apiKey: string) => Promise<void>;
}

export function SetupScreen({ onSave }: SetupScreenProps) {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = apiKey.trim();

    if (!trimmed) {
      setError("Please enter your Gemini API key.");
      return;
    }

    if (!validateApiKeyFormat(trimmed)) {
      setError("Invalid API key format. Gemini keys start with 'AIza'.");
      return;
    }

    setTesting(true);
    try {
      const valid = await testApiKey(trimmed);
      if (!valid) {
        setError("API key test failed. Please check your key and try again.");
        return;
      }
      await onSave(trimmed);
    } catch {
      setError("Could not validate API key. Check your internet connection.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="setup-screen">
      <div className="setup-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      </div>

      <h1 className="setup-title">Grammar AI Assistant</h1>
      <p className="setup-subtitle">
        Enter your Gemini API key to get started. Your key is stored securely
        and never leaves your browser.
      </p>

      <form onSubmit={handleSubmit} className="setup-form">
        <div className="field-group">
          <label htmlFor="api-key" className="field-label">
            Gemini API Key
          </label>
          <div className="input-wrap">
            <input
              id="api-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="field-input"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? "Hide API key" : "Show API key"}
            >
              {showKey ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
          {error && <p className="field-error">{error}</p>}
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={testing}>
          {testing ? (
            <>
              <span className="spinner-sm" />
              Validating…
            </>
          ) : (
            "Save & Continue"
          )}
        </button>
      </form>

      <a
        href="https://aistudio.google.com/app/apikey"
        target="_blank"
        rel="noopener noreferrer"
        className="get-key-link"
      >
        Get a free API key from Google AI Studio →
      </a>
    </div>
  );
}
