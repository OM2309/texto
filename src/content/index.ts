import { isTextEmpty } from "../utils/sanitize";
import type { ChromeMessage, ReplaceTextPayload } from "../types";
import { createModal } from "./modal";
import { createFAB, removeFAB } from "./fab";
import { showToast } from "./toast";

// ─── State ────────────────────────────────────────────────────────────────────

let lastSelectedText = "";
let lastRange: Range | null = null;
let lastActiveElement: Element | null = null;
let autoFixEnabled = false;
let autoFixDelay = 800;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isProcessing = false;

// ─── Load prefs from storage (runs once on inject) ────────────────────────────

chrome.storage.sync.get(["autoFix", "autoFixDelay"], (data) => {
  autoFixEnabled = (data.autoFix as boolean) ?? false;
  autoFixDelay = (data.autoFixDelay as number) ?? 800;
});

// Live-update when user toggles the setting in popup
chrome.storage.onChanged.addListener((changes) => {
  if ("autoFix" in changes) autoFixEnabled = changes.autoFix.newValue as boolean;
  if ("autoFixDelay" in changes) autoFixDelay = changes.autoFixDelay.newValue as number;
});

// ─── Selection Tracking ───────────────────────────────────────────────────────

document.addEventListener("mouseup", handleSelectionChange);
document.addEventListener("keyup", handleSelectionChange);

function handleSelectionChange() {
  if (isProcessing) return;

  const selection = window.getSelection();
  const text = selection?.toString().trim() ?? "";

  if (isTextEmpty(text)) {
    removeFAB();
    clearDebounce();
    return;
  }

  lastSelectedText = text;
  lastRange = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  lastActiveElement = document.activeElement;

  if (autoFixEnabled) {
    // Auto-fix mode: debounce then silently fix
    clearDebounce();
    debounceTimer = setTimeout(() => {
      runAutoFix(text, lastRange, lastActiveElement);
    }, autoFixDelay);
  } else {
    // Manual mode: show FAB
    showFABForSelection(selection!);
  }
}

function clearDebounce() {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

// ─── Auto-Fix ─────────────────────────────────────────────────────────────────

async function runAutoFix(
  text: string,
  range: Range | null,
  activeEl: Element | null
) {
  if (isTextEmpty(text) || isProcessing) return;
  isProcessing = true;

  // Show a subtle "fixing…" indicator near the selection
  const indicator = showProcessingIndicator(range);

  try {
    const response = await chrome.runtime.sendMessage({
      type: "CORRECT_TEXT",
      payload: { text },
    });

    if (response?.error) {
      showToast(`AI: ${response.error}`, "error");
      return;
    }

    if (response?.corrected && response.corrected !== text) {
      applyReplacement(response.corrected as string, range, activeEl);
      showToast("✓ Text improved", "success");
    }
    // If corrected === original, text was already perfect — do nothing silently
  } catch {
    showToast("Grammar AI: extension error", "error");
  } finally {
    indicator?.remove();
    isProcessing = false;
  }
}

// ─── Apply Replacement ────────────────────────────────────────────────────────

function applyReplacement(
  corrected: string,
  range: Range | null,
  activeEl: Element | null
) {
  // 1. Editable element (input, textarea, contenteditable) — use execCommand
  //    so the site's undo stack and React/Vue state stay in sync
  if (activeEl && isEditable(activeEl)) {
    replaceInEditable(corrected, activeEl as HTMLElement);
    return;
  }

  // 2. Plain DOM range replacement
  if (range) {
    try {
      range.deleteContents();
      range.insertNode(document.createTextNode(corrected));
      window.getSelection()?.removeAllRanges();
      return;
    } catch {
      // range stale — fall through
    }
  }

  // 3. Last resort: active selection
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0);
    r.deleteContents();
    r.insertNode(document.createTextNode(corrected));
    sel.removeAllRanges();
  }
}

function isEditable(el: Element): boolean {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return !el.readOnly && !el.disabled;
  }
  return el.getAttribute("contenteditable") === "true" ||
    el.getAttribute("contenteditable") === "";
}

function replaceInEditable(corrected: string, el: HTMLElement) {
  el.focus();

  // textarea / input
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const newValue = before + corrected + after;

    // Use execCommand so React/Vue synthetic events fire
    el.select();
    const success = document.execCommand("insertText", false, corrected);

    if (!success) {
      // execCommand not supported — set value directly and dispatch events
      el.value = newValue;
      el.selectionStart = start;
      el.selectionEnd = start + corrected.length;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return;
  }

  // contenteditable (Discord, WhatsApp Web, Notion, etc.)
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    sel.deleteFromDocument();
    const success = document.execCommand("insertText", false, corrected);
    if (!success) {
      // Fallback for browsers where execCommand is blocked
      const range = sel.getRangeAt(0);
      range.insertNode(document.createTextNode(corrected));
      range.collapse(false);
    }
    // Dispatch input event so the app's state updates
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: corrected }));
  }
}

// ─── Processing Indicator ─────────────────────────────────────────────────────

function showProcessingIndicator(range: Range | null): HTMLElement | null {
  if (!range) return null;

  const rect = range.getBoundingClientRect();
  const el = document.createElement("div");

  Object.assign(el.style, {
    position: "fixed",
    left: `${rect.left + rect.width / 2 - 48}px`,
    top: `${rect.top - 34}px`,
    zIndex: "2147483647",
    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    color: "#fff",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontFamily: "system-ui,sans-serif",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    boxShadow: "0 2px 12px rgba(99,102,241,0.5)",
    pointerEvents: "none",
    animation: "gai-fadein 0.15s ease",
  });

  el.innerHTML = `<span style="display:inline-block;width:10px;height:10px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:gai-spin 0.6s linear infinite"></span> Fixing…`;

  injectIndicatorStyles();
  document.body.appendChild(el);
  return el;
}

function injectIndicatorStyles() {
  if (document.getElementById("gai-indicator-styles")) return;
  const s = document.createElement("style");
  s.id = "gai-indicator-styles";
  s.textContent = `
    @keyframes gai-spin { to { transform: rotate(360deg); } }
    @keyframes gai-fadein { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
  `;
  document.head.appendChild(s);
}

// ─── FAB (manual mode) ────────────────────────────────────────────────────────

function showFABForSelection(selection: Selection) {
  if (selection.rangeCount === 0) return;
  const rect = selection.getRangeAt(0).getBoundingClientRect();

  createFAB(
    {
      x: rect.right + window.scrollX,
      y: rect.top + window.scrollY - 40,
    },
    () => openModal(lastSelectedText)
  );
}

// ─── Modal (manual mode) ──────────────────────────────────────────────────────

function openModal(text: string) {
  if (isTextEmpty(text)) return;
  removeFAB();
  createModal(text, lastRange, () => { lastRange = null; });
}

// ─── Message Listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: ChromeMessage, _sender, sendResponse) => {
    if (message.type === "SHOW_MODAL") {
      const payload = message.payload as { selectedText: string };
      openModal(payload.selectedText);
      sendResponse({ ok: true });
    }

    if (message.type === "KEYBOARD_SHORTCUT") {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";
      if (!isTextEmpty(text)) {
        lastSelectedText = text;
        lastRange = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
        lastActiveElement = document.activeElement;

        if (autoFixEnabled) {
          runAutoFix(text, lastRange, lastActiveElement);
        } else {
          openModal(text);
        }
      }
      sendResponse({ ok: true });
    }

    if (message.type === "REPLACE_TEXT") {
      const payload = message.payload as ReplaceTextPayload;
      applyReplacement(payload.corrected, lastRange, lastActiveElement);
      sendResponse({ ok: true });
    }
  }
);
