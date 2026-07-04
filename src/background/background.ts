import { DEFAULT_SETTINGS, type ExtensionSettings } from "@/types";
import { getSettings, saveSettings } from "./storage";

function broadcastSettings(settings: ExtensionSettings): void {
  chrome.runtime.sendMessage({ type: "SETTINGS_UPDATED", payload: settings }).catch(() => undefined);
}

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await getSettings();
  if (!existing.defaultSpeed) {
    await saveSettings(DEFAULT_SETTINGS);
    broadcastSettings(DEFAULT_SETTINGS);
  }
});

chrome.runtime.onMessage.addListener(
  (
    message: { type: string; payload?: unknown },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => {
    if (message.type === "GET_SETTINGS") {
      getSettings().then((settings) => sendResponse(settings));
      return true;
    }
    if (message.type === "SAVE_SETTINGS") {
      const payload = message.payload as ExtensionSettings;
      saveSettings(payload)
        .then(() => {
          broadcastSettings(payload);
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { type: "SETTINGS_UPDATED", payload }).catch(() => undefined);
              }
            });
          });
          sendResponse({ success: true });
        })
        .catch(() => sendResponse({ success: false }));
      return true;
    }

    if (message.type === "APPLY_PLAYBACK_RATE" && typeof message.payload === "number") {
      const speed = message.payload;
      getSettings().then((current) => {
        const nextSettings: ExtensionSettings = {
          ...current,
          defaultSpeed: speed as ExtensionSettings["defaultSpeed"],
        };
        saveSettings(nextSettings)
          .then(() => {
            broadcastSettings(nextSettings);
            chrome.tabs.query({}, (tabs) => {
              tabs.forEach((tab) => {
                if (tab.id) {
                  chrome.tabs.sendMessage(tab.id, { type: "SETTINGS_UPDATED", payload: nextSettings }).catch(() => undefined);
                }
              });
            });
            sendResponse({ success: true });
          })
          .catch(() => sendResponse({ success: false }));
      });
      return true;
    }

    if (message.type === "SKIP_FIRST_PLAYING_VIDEO") {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: "SKIP_FIRST_PLAYING_VIDEO" }).catch(() => undefined);
          }
        });
      });
      sendResponse({ success: true });
      return true;
    }
  },
);