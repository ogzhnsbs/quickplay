import type { ExtensionSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import {
  initVideoObserver,
  applySpeedToAll,
  applySpeed,
  skipFirstPlayingVideo,
  hasVideos,
} from "./video-manager";
import { initOverlay, getActiveSpeed, setActiveSpeed } from "./overlay";
import {
  adjustSpeedForShortcut,
  getSpeedShortcutDirection,
  isEditableTarget,
  isShortcutEvent,
} from "./shortcut-utils";

let interactiveFeaturesInitialized = false;
let onVideoHover: ((video: HTMLVideoElement) => void) | null = null;
let currentSettings: ExtensionSettings = DEFAULT_SETTINGS;

function ensureInteractiveFeatures(): void {
  if (interactiveFeaturesInitialized) return;

  interactiveFeaturesInitialized = true;
  setActiveSpeed(currentSettings.defaultSpeed, false);
  onVideoHover = initOverlay(currentSettings, () => {});
  window.addEventListener("keydown", handleKeyboardShortcuts, true);
}

function handleKeyboardShortcuts(event: KeyboardEvent): void {
  if (!isShortcutEvent(event)) return;
  if (isEditableTarget(event)) return;
  if (!hasVideos()) return;

  const key = (event.key ?? "").toLowerCase();

  if (key === "e") {
    event.preventDefault();
    void chrome.storage.sync.get("settings").then((result) => {
      const settings = { ...DEFAULT_SETTINGS, ...(result.settings as ExtensionSettings) };
      const nextEnabled = !settings.enabled;
      const updatedSettings = { ...settings, enabled: nextEnabled };
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
    void chrome.runtime.sendMessage({ type: "APPLY_PLAYBACK_RATE", payload: nextSpeed });
    return;
  }

  const speedDirection = getSpeedShortcutDirection(key);
  if (speedDirection) {
    event.preventDefault();
    const nextSpeed = adjustSpeedForShortcut(getActiveSpeed(), speedDirection);
    setActiveSpeed(nextSpeed);
    applySpeedToAll(nextSpeed);
    void chrome.runtime.sendMessage({ type: "APPLY_PLAYBACK_RATE", payload: nextSpeed });
  }
}

function applySettingsUpdate(settings: ExtensionSettings, shouldApplySpeed: boolean): void {
  const previousSpeed = getActiveSpeed();
  setActiveSpeed(settings.defaultSpeed, false);

  if (shouldApplySpeed && settings.enabled && previousSpeed !== settings.defaultSpeed) {
    applySpeedToAll(settings.defaultSpeed);
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
      setActiveSpeed(message.payload, false);
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
        currentSettings = { ...DEFAULT_SETTINGS, ...settings };
        if (hasVideos()) {
          ensureInteractiveFeatures();
          applySettingsUpdate(currentSettings, true);
        }
      }
      sendResponse({ success: true });
      return true;
    }

    return false;
  },
);

async function init(): Promise<void> {
  currentSettings = await loadSettings();

  if (!currentSettings.enabled) {
    return;
  }

  const registeredVideos = new Set<HTMLVideoElement>();

  initVideoObserver(
    (videos) => {
      if (videos.length === 0) return;

      ensureInteractiveFeatures();

      const speed = getActiveSpeed();
      for (const video of videos) {
        applySpeed(video, speed);
        if (onVideoHover && !registeredVideos.has(video)) {
          registeredVideos.add(video);
          onVideoHover(video);
        }
      }
    },
    () => (interactiveFeaturesInitialized ? getActiveSpeed() : currentSettings.defaultSpeed),
  );

  if (hasVideos()) {
    ensureInteractiveFeatures();
    applySpeedToAll(getActiveSpeed());
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (!changes.settings) return;

    const newSettings = changes.settings.newValue as ExtensionSettings | undefined;
    const oldSettings = changes.settings.oldValue as ExtensionSettings | undefined;
    if (!newSettings) return;

    currentSettings = { ...DEFAULT_SETTINGS, ...newSettings };

    if (oldSettings?.defaultSpeed === newSettings.defaultSpeed) return;
    if (!hasVideos()) return;

    ensureInteractiveFeatures();
    applySettingsUpdate(currentSettings, true);
  });
}

init();
