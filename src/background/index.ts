import { getApiKey, addRecentCorrection, incrementUsageStats } from "../utils/storage";
import { getGrammarCorrection, buildCorrectionResult } from "../services/gemini";
import { sanitizeText, isTextEmpty } from "../utils/sanitize";
import type { ChromeMessage, CorrectTextPayload } from "../types";

// ─── Context Menu Setup ───────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "fix-grammar",
    title: "Fix Grammar with AI ✨",
    contexts: ["selection"],
  });
});

// ─── Context Menu Click ───────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "fix-grammar") return;
  if (!tab?.id) return;

  const selectedText = info.selectionText ?? "";
  if (isTextEmpty(selectedText)) return;

  // Open popup and pass selected text via storage
  await chrome.storage.session.set({ pendingText: selectedText });

  // Notify content script to show modal
  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_MODAL",
      payload: { selectedText },
    } satisfies ChromeMessage);
  } catch {
    // Content script may not be injected yet — open popup as fallback
    await chrome.action.openPopup();
  }
});

// ─── Keyboard Shortcut ────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "fix-grammar-shortcut") return;
  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "KEYBOARD_SHORTCUT",
    } satisfies ChromeMessage);
  } catch {
    // ignore
  }
});

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: ChromeMessage, _sender, sendResponse) => {
    if (message.type === "CORRECT_TEXT") {
      handleCorrectText(message.payload as CorrectTextPayload)
        .then(sendResponse)
        .catch((err) =>
          sendResponse({ error: (err as Error).message ?? "Unknown error" })
        );
      return true; // keep channel open for async
    }

    if (message.type === "PING") {
      sendResponse({ ok: true });
      return false;
    }
  }
);

// ─── Core Correction Logic ────────────────────────────────────────────────────

async function handleCorrectText(
  payload: CorrectTextPayload
): Promise<{ corrected?: string; error?: string }> {
  const apiKey = await getApiKey();

  if (!apiKey) {
    return { error: "API key not configured. Please open the extension and add your Gemini API key." };
  }

  const text = sanitizeText(payload.text ?? "");

  if (isTextEmpty(text)) {
    return { error: "No text selected. Please select some text first." };
  }

  try {
    const corrected = await getGrammarCorrection(text, apiKey);
    const result = buildCorrectionResult(text, corrected);

    await addRecentCorrection(result);
    await incrementUsageStats(text.length);

    return { corrected };
  } catch (err) {
    const msg = (err as Error).message ?? "Unknown error";

    if (msg.includes("API_KEY_INVALID") || msg.includes("API key")) {
      return { error: "Invalid API key. Please check your Gemini API key in Settings." };
    }
    if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
      return { error: "Gemini API rate limit reached. Please wait a moment and try again." };
    }
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch")) {
      return { error: "Network error. Please check your internet connection." };
    }

    return { error: msg };
  }
}
