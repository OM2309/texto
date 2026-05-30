import { isTextEmpty } from "../utils/sanitize";
import type { ChromeMessage, ReplaceTextPayload } from "../types";
import { createModal } from "./modal";
import { createFAB, removeFAB } from "./fab";

let lastSelectedText = "";
let lastRange: Range | null = null;

// ─── Track Selection ──────────────────────────────────────────────────────────

document.addEventListener("mouseup", () => {
  const selection = window.getSelection();
  const text = selection?.toString().trim() ?? "";

  if (!isTextEmpty(text)) {
    lastSelectedText = text;
    lastRange = selection?.getRangeAt(0) ?? null;
    showFAB();
  } else {
    removeFAB();
  }
});

document.addEventListener("keyup", (_e) => {
  const selection = window.getSelection();
  const text = selection?.toString().trim() ?? "";

  if (!isTextEmpty(text)) {
    lastSelectedText = text;
    lastRange = selection?.getRangeAt(0) ?? null;
  }
});

// ─── FAB ──────────────────────────────────────────────────────────────────────

function showFAB() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  createFAB(
    {
      x: rect.right + window.scrollX,
      y: rect.top + window.scrollY - 40,
    },
    () => {
      openModal(lastSelectedText);
    }
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openModal(text: string) {
  if (isTextEmpty(text)) return;
  removeFAB();
  createModal(text, lastRange, () => {
    lastRange = null;
  });
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
        lastRange = selection?.getRangeAt(0) ?? null;
        openModal(text);
      }
      sendResponse({ ok: true });
    }

    if (message.type === "REPLACE_TEXT") {
      const payload = message.payload as ReplaceTextPayload;
      replaceSelectedText(payload.corrected);
      sendResponse({ ok: true });
    }
  }
);

// ─── Replace Text ─────────────────────────────────────────────────────────────

export function replaceSelectedText(corrected: string) {
  if (!lastRange) {
    // Fallback: try current selection
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(corrected));
      sel.removeAllRanges();
    }
    return;
  }

  try {
    lastRange.deleteContents();
    lastRange.insertNode(document.createTextNode(corrected));
    window.getSelection()?.removeAllRanges();
    lastRange = null;
  } catch {
    // Range may be stale — try active selection
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(corrected));
      sel.removeAllRanges();
    }
  }
}
