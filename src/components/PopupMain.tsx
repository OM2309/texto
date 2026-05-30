import { useState, useEffect, useCallback } from "react";

interface PopupMainProps {
  onOpenSettings: () => void;
}

export function PopupMain({ onOpenSettings }: PopupMainProps) {
  const [originalText, setOriginalText] = useState("");
  const [correctedText, setCorrectedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [replaced, setReplaced] = useState(false);

  // Load pending text from session storage (set by background on context menu click)
  useEffect(() => {
    chrome.storage.session.get("pendingText", (data) => {
      if (data.pendingText) {
        setOriginalText(data.pendingText as string);
        chrome.storage.session.remove("pendingText");
      }
    });
  }, []);

  const runCorrection = useCallback(async (text: string) => {
    if (!text.trim()) {
      setError("Please enter some text to correct.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setCorrectedText("");
    setReplaced(false);

    try {
      const response = await chrome.runtime.sendMessage({
        type: "CORRECT_TEXT",
        payload: { text },
      });

      if (response?.error) {
        setError(response.error);
      } else if (response?.corrected) {
        setCorrectedText(response.corrected);
      }
    } catch {
      setError("Extension error. Please try reloading.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-run if text was pre-loaded
  useEffect(() => {
    if (originalText) {
      runCorrection(originalText);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCopy() {
    if (!correctedText) return;
    await navigator.clipboard.writeText(correctedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleReplace() {
    if (!correctedText) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "REPLACE_TEXT",
        payload: { corrected: correctedText },
      });
      setReplaced(true);
      setTimeout(() => setReplaced(false), 2000);
    } catch {
      setError("Could not replace text. Make sure you have text selected on the page.");
    }
  }

  return (
    <div className="popup-main">
      <header className="popup-header">
        <div className="popup-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          Grammar AI
        </div>
        <button
          className="icon-btn"
          onClick={onOpenSettings}
          aria-label="Open Settings"
          title="Settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </header>

      <div className="popup-body">
        <div className="field-group">
          <label className="field-label" htmlFor="original-text">
            Original Text
          </label>
          <textarea
            id="original-text"
            className="field-textarea"
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            placeholder="Paste or type text here, or select text on a webpage and use the context menu…"
            rows={4}
          />
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={() => runCorrection(originalText)}
          disabled={isLoading || !originalText.trim()}
        >
          {isLoading ? (
            <>
              <span className="spinner-sm" />
              Analyzing…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              Fix Grammar
            </>
          )}
        </button>

        {error && (
          <div className="alert alert-error" role="alert">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {correctedText && (
          <div className="field-group">
            <label className="field-label" htmlFor="corrected-text">
              Corrected Text
            </label>
            <textarea
              id="corrected-text"
              className="field-textarea field-textarea--success"
              value={correctedText}
              onChange={(e) => setCorrectedText(e.target.value)}
              rows={4}
            />

            <div className="action-row">
              <button
                className="btn btn-secondary"
                onClick={() => runCorrection(originalText)}
                disabled={isLoading}
                title="Regenerate"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Regenerate
              </button>

              <button className="btn btn-secondary" onClick={handleCopy}>
                {copied ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy
                  </>
                )}
              </button>

              <button className="btn btn-success" onClick={handleReplace}>
                {replaced ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Replaced!
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Replace Text
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="popup-footer">
        <span>Alt+Shift+G to fix selected text</span>
      </footer>
    </div>
  );
}
