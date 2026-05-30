const MODAL_ID = "grammar-ai-modal";
const OVERLAY_ID = "grammar-ai-overlay";

export function createModal(
  selectedText: string,
  range: Range | null,
  onClose: () => void
) {
  removeModal();

  // Inject styles
  injectStyles();

  // Overlay
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.addEventListener("click", close);

  // Modal container
  const modal = document.createElement("div");
  modal.id = MODAL_ID;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Grammar AI Assistant");

  modal.innerHTML = `
    <div class="gai-header">
      <div class="gai-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        Grammar AI Assistant
      </div>
      <button class="gai-close" aria-label="Close" id="gai-close-btn">✕</button>
    </div>

    <div class="gai-body">
      <label class="gai-label">Original Text</label>
      <textarea class="gai-textarea" id="gai-original" readonly>${escapeHtml(selectedText)}</textarea>

      <label class="gai-label">Corrected Text</label>
      <div class="gai-corrected-wrap">
        <textarea class="gai-textarea gai-corrected" id="gai-corrected" placeholder="Click 'Fix Grammar' to improve your text…" readonly></textarea>
        <div class="gai-loading" id="gai-loading" style="display:none">
          <div class="gai-spinner"></div>
          <span>Analyzing with AI…</span>
        </div>
      </div>

      <div class="gai-error" id="gai-error" style="display:none"></div>
    </div>

    <div class="gai-footer">
      <button class="gai-btn gai-btn-primary" id="gai-fix-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        Fix Grammar
      </button>
      <button class="gai-btn gai-btn-secondary" id="gai-regen-btn" disabled>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        Regenerate
      </button>
      <button class="gai-btn gai-btn-secondary" id="gai-copy-btn" disabled>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Copy
      </button>
      <button class="gai-btn gai-btn-success" id="gai-replace-btn" disabled>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Replace Text
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  // Wire up buttons
  const fixBtn = modal.querySelector<HTMLButtonElement>("#gai-fix-btn")!;
  const regenBtn = modal.querySelector<HTMLButtonElement>("#gai-regen-btn")!;
  const copyBtn = modal.querySelector<HTMLButtonElement>("#gai-copy-btn")!;
  const replaceBtn = modal.querySelector<HTMLButtonElement>("#gai-replace-btn")!;
  const closeBtn = modal.querySelector<HTMLButtonElement>("#gai-close-btn")!;
  const correctedTA = modal.querySelector<HTMLTextAreaElement>("#gai-corrected")!;
  const errorDiv = modal.querySelector<HTMLDivElement>("#gai-error")!;
  const loadingDiv = modal.querySelector<HTMLDivElement>("#gai-loading")!;

  async function runCorrection() {
    setLoading(true);
    hideError();
    disableActions();

    try {
      const response = await chrome.runtime.sendMessage({
        type: "CORRECT_TEXT",
        payload: { text: selectedText },
      });

      if (response?.error) {
        showError(response.error);
      } else if (response?.corrected) {
        correctedTA.value = response.corrected;
        correctedTA.removeAttribute("readonly");
        enableActions();
      }
    } catch (err) {
      showError("Extension error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  fixBtn.addEventListener("click", runCorrection);
  regenBtn.addEventListener("click", runCorrection);

  copyBtn.addEventListener("click", async () => {
    const text = correctedTA.value;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "✓ Copied!";
    setTimeout(() => {
      copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
    }, 2000);
  });

  replaceBtn.addEventListener("click", () => {
    const corrected = correctedTA.value;
    if (!corrected) return;

    if (range) {
      try {
        range.deleteContents();
        range.insertNode(document.createTextNode(corrected));
        window.getSelection()?.removeAllRanges();
      } catch {
        // Range stale — notify background
        chrome.runtime.sendMessage({
          type: "REPLACE_TEXT",
          payload: { corrected },
        });
      }
    }

    close();
  });

  closeBtn.addEventListener("click", close);

  // Keyboard: Escape to close
  document.addEventListener("keydown", handleKeydown);

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  function close() {
    removeModal();
    document.removeEventListener("keydown", handleKeydown);
    onClose();
  }

  function setLoading(loading: boolean) {
    loadingDiv.style.display = loading ? "flex" : "none";
    correctedTA.style.display = loading ? "none" : "block";
    fixBtn.disabled = loading;
    regenBtn.disabled = loading;
  }

  function showError(msg: string) {
    errorDiv.textContent = msg;
    errorDiv.style.display = "block";
  }

  function hideError() {
    errorDiv.style.display = "none";
  }

  function enableActions() {
    regenBtn.disabled = false;
    copyBtn.disabled = false;
    replaceBtn.disabled = false;
  }

  function disableActions() {
    regenBtn.disabled = true;
    copyBtn.disabled = true;
    replaceBtn.disabled = true;
  }

  // Auto-run on open
  runCorrection();
}

export function removeModal() {
  document.getElementById(MODAL_ID)?.remove();
  document.getElementById(OVERLAY_ID)?.remove();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function injectStyles() {
  const STYLE_ID = "grammar-ai-styles";
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #grammar-ai-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      z-index: 2147483645; backdrop-filter: blur(2px);
    }
    #grammar-ai-modal {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2147483646;
      width: min(520px, 92vw);
      background: #1e1e2e; color: #cdd6f4;
      border-radius: 14px; border: 1px solid #313244;
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px; overflow: hidden;
      animation: gai-in 0.2s ease;
    }
    @keyframes gai-in {
      from { opacity: 0; transform: translate(-50%, -52%) scale(0.97); }
      to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    .gai-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px; border-bottom: 1px solid #313244;
      background: #181825;
    }
    .gai-title {
      display: flex; align-items: center; gap: 8px;
      font-weight: 700; font-size: 15px; color: #cba6f7;
    }
    .gai-close {
      background: none; border: none; color: #6c7086;
      cursor: pointer; font-size: 16px; padding: 2px 6px;
      border-radius: 6px; transition: color 0.15s, background 0.15s;
    }
    .gai-close:hover { color: #f38ba8; background: #313244; }
    .gai-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; }
    .gai-label { font-size: 11px; font-weight: 600; color: #6c7086; text-transform: uppercase; letter-spacing: 0.05em; }
    .gai-textarea {
      width: 100%; min-height: 90px; max-height: 160px;
      background: #181825; color: #cdd6f4;
      border: 1px solid #313244; border-radius: 8px;
      padding: 10px 12px; font-size: 13px; font-family: inherit;
      resize: vertical; box-sizing: border-box; outline: none;
      transition: border-color 0.15s;
    }
    .gai-textarea:focus { border-color: #6366f1; }
    .gai-textarea.gai-corrected { border-color: #45475a; }
    .gai-corrected-wrap { position: relative; }
    .gai-loading {
      display: flex; align-items: center; gap: 10px;
      padding: 20px; color: #a6adc8; font-size: 13px;
      background: #181825; border: 1px solid #313244;
      border-radius: 8px; min-height: 90px; justify-content: center;
    }
    .gai-spinner {
      width: 18px; height: 18px; border: 2px solid #313244;
      border-top-color: #6366f1; border-radius: 50%;
      animation: gai-spin 0.7s linear infinite;
    }
    @keyframes gai-spin { to { transform: rotate(360deg); } }
    .gai-error {
      background: #3b1219; border: 1px solid #f38ba8;
      color: #f38ba8; border-radius: 8px; padding: 10px 12px;
      font-size: 13px;
    }
    .gai-footer {
      display: flex; gap: 8px; padding: 12px 18px;
      border-top: 1px solid #313244; background: #181825;
      flex-wrap: wrap;
    }
    .gai-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 7px 14px; border-radius: 8px; border: none;
      cursor: pointer; font-size: 13px; font-weight: 600;
      font-family: inherit; transition: opacity 0.15s, transform 0.1s;
    }
    .gai-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .gai-btn:not(:disabled):hover { opacity: 0.88; transform: translateY(-1px); }
    .gai-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; }
    .gai-btn-secondary { background: #313244; color: #cdd6f4; }
    .gai-btn-success { background: #a6e3a1; color: #1e1e2e; margin-left: auto; }
  `;
  document.head.appendChild(style);
}
