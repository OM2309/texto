import { useState } from "react";
import { useStorage } from "../hooks/useStorage";
import { useTheme } from "../hooks/useTheme";
import { SetupScreen } from "../components/SetupScreen";
import { PopupMain } from "../components/PopupMain";
import { SettingsPage } from "../components/SettingsPage";
import type { AppView } from "../types";

export function App() {
  const {
    data,
    loading,
    updateApiKey,
    removeApiKey,
    updateTheme,
    clearHistory,
    clearAll,
  } = useStorage();

  const [view, setView] = useState<AppView>("popup");

  useTheme(data.theme);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  // First-time setup
  if (!data.apiKey) {
    return (
      <SetupScreen
        onSave={async (key) => {
          await updateApiKey(key);
        }}
      />
    );
  }

  if (view === "settings") {
    return (
      <SettingsPage
        data={data}
        onBack={() => setView("popup")}
        onUpdateApiKey={updateApiKey}
        onRemoveApiKey={removeApiKey}
        onUpdateTheme={updateTheme}
        onClearHistory={clearHistory}
        onClearAll={clearAll}
      />
    );
  }

  return (
    <PopupMain onOpenSettings={() => setView("settings")} />
  );
}
