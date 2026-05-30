// Chrome Extension Message Types
export type MessageType =
  | "CONTEXT_MENU_CLICKED"
  | "KEYBOARD_SHORTCUT"
  | "FAB_CLICKED"
  | "CORRECT_TEXT"
  | "REPLACE_TEXT"
  | "GET_SELECTED_TEXT"
  | "SHOW_MODAL"
  | "CLOSE_MODAL"
  | "PING";

export interface ChromeMessage {
  type: MessageType;
  payload?: unknown;
}

export interface CorrectTextPayload {
  text: string;
  tabId?: number;
}

export interface ReplaceTextPayload {
  corrected: string;
}

export interface ShowModalPayload {
  selectedText: string;
}

// Correction
export interface CorrectionResult {
  original: string;
  corrected: string;
  timestamp: number;
  error?: string;
}

// Storage
export interface StorageData {
  apiKey?: string;
  theme?: "light" | "dark" | "system";
  autoFix?: boolean;          // auto-replace on selection
  autoFixDelay?: number;      // debounce ms (default 800)
  recentCorrections?: CorrectionResult[];
  usageStats?: UsageStats;
}

export interface UsageStats {
  totalCorrections: number;
  totalCharacters: number;
  lastUsed?: number;
}

// UI State
export type AppView = "setup" | "popup" | "settings";

export interface PopupState {
  view: AppView;
  originalText: string;
  correctedText: string;
  isLoading: boolean;
  error: string | null;
}
