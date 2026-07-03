import type { ExtensionSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import {
  initVideoObserver,
  applySpeedToAll,
  applySpeed,
  skipFirstPlayingVideo,
} from "./video-manager";
import { initOverlay, getActiveSpeed, setActiveSpeed } from "./overlay";
import { adjustSpeedForShortcut, getSpeedShortcutDirection, isShortcutEvent } from "./shortcut-utils";

function handleKeyboardShortcuts(event: KeyboardEvent): void {
  if (!isShortcutEvent(event)) return;

  const key = event.key.toLowerCase();

  if (key === "e") {
    event.preventDefault();
    void chrome.storage.sync.get("settings").then((result) => {
      const currentSettings = { ...DEFAULT_SETTINGS, ...(result.settings as ExtensionSettings) };
      const nextEnabled = !currentSettings.enabled;
      const updatedSettings = { ...currentSettings, enabled: nextEnabled };
      void chrome.storage.sync.set({ settings: updatedSettings });
    });
    return;
  }

  if (key === "k" || event.code === "KeyK") {
    event.preventDefault();
    skipFirstPlayingVideo();
    return;
  }

  if (key === "0" || event.code === "Digit0") {
    event.preventDefault();
    const nextSpeed = 1;
    setActiveSpeed(nextSpeed);
    applySpeedToAll(nextSpeed);
    return;
  }

  const speedDirection = getSpeedShortcutDirection(key);
  if (speedDirection) {
    event.preventDefault();
    const nextSpeed = adjustSpeedForShortcut(getActiveSpeed(), speedDirection);
    setActiveSpeed(nextSpeed);
    applySpeedToAll(nextSpeed);
  }
}

async function loadSettings(): Promise<ExtensionSettings> {
  try {
    const result = await chrome.storage.sync.get("settings");
    return { ...DEFAULT_SETTINGS, ...(result.settings as ExtensionSettings) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

chrome.runtime.onMessage.addListener(
  (message: { type?: string; payload?: unknown }, _sender, sendResponse) => {
    if (message?.type === "APPLY_PLAYBACK_RATE" && typeof message.payload === "number") {
      setActiveSpeed(message.payload);
      applySpeedToAll(message.payload);
      sendResponse({ success: true });
      return true;
    }

    if (message?.type === "SKIP_FIRST_PLAYING_VIDEO") {
      skipFirstPlayingVideo();
      sendResponse({ success: true });
      return true;
    }

    if (message?.type === "SETTINGS_UPDATED") {
      const settings = message.payload as ExtensionSettings | undefined;
      if (settings) {
        setActiveSpeed(settings.defaultSpeed);
        if (settings.enabled) {
          applySpeedToAll(settings.defaultSpeed);
        }
      }
      sendResponse({ success: true });
      return true;
    }

    return false;
  },
);

async function init(): Promise<void> {
  const settings = await loadSettings();

  if (!settings.enabled) {
    return;
  }

  // Sync overlay activeSpeed with saved settings
  setActiveSpeed(settings.defaultSpeed);

  const onVideoHover = initOverlay(settings, () => {});

  // Track videos we've already registered hover handlers for
  const registeredVideos = new Set<HTMLVideoElement>();

  initVideoObserver(
    (videos) => {
      const currentSpeed = getActiveSpeed();
      for (const v of videos) {
        applySpeed(v, currentSpeed);
        if (!registeredVideos.has(v)) {
          registeredVideos.add(v);
          onVideoHover(v);
        }
      }
    },
    getActiveSpeed,
  );

  applySpeedToAll(getActiveSpeed());

  window.addEventListener("keydown", handleKeyboardShortcuts, true);

  // React to setting changes from popup OR overlay speed button clicks
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
      const newSettings = changes.settings.newValue as ExtensionSettings;
      if (newSettings && newSettings.defaultSpeed !== undefined) {
        setActiveSpeed(newSettings.defaultSpeed);
        if (newSettings.enabled) {
          applySpeedToAll(newSettings.defaultSpeed);
        }
      }
    }
  });
}

init();