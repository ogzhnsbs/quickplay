import type { ExtensionSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { populateSpeedSelect } from "./speed-options";

const speedSelect = document.getElementById(
  "speed-select",
) as HTMLSelectElement;
const enabledToggle = document.getElementById(
  "enabled-toggle",
) as HTMLInputElement;
const skipButton = document.getElementById("skip-now") as HTMLButtonElement;

let currentSettings: ExtensionSettings;

function syncSettings(settings: ExtensionSettings): void {
  currentSettings = { ...DEFAULT_SETTINGS, ...settings };
  populateSpeedSelect(speedSelect, currentSettings.defaultSpeed);
  enabledToggle.checked = currentSettings.enabled;
}

async function skipActiveVideo(): Promise<void> {
  await chrome.runtime.sendMessage({ type: "SKIP_FIRST_PLAYING_VIDEO" });
}

async function loadSettings(): Promise<void> {
  const settings = (await chrome.runtime.sendMessage({
    type: "GET_SETTINGS",
  })) as ExtensionSettings;
  syncSettings(settings);
}

async function saveSettings(): Promise<void> {
  const settings: ExtensionSettings = {
    defaultSpeed: Number(speedSelect.value) as ExtensionSettings["defaultSpeed"],
    skipSeconds: currentSettings?.skipSeconds ?? DEFAULT_SETTINGS.skipSeconds,
    enabled: enabledToggle.checked,
  };
  await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    payload: settings,
  });
  currentSettings = settings;
}

speedSelect.addEventListener("change", saveSettings);
enabledToggle.addEventListener("change", saveSettings);
skipButton.addEventListener("click", skipActiveVideo);

chrome.runtime.onMessage.addListener((message: { type?: string; payload?: unknown }) => {
  if (message?.type === "SETTINGS_UPDATED") {
    const settings = message.payload as ExtensionSettings | undefined;
    if (settings) {
      syncSettings(settings);
    }
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings?.newValue) {
    syncSettings(changes.settings.newValue as ExtensionSettings);
  }
});

loadSettings();