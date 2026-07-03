import type { ExtensionSettings } from "@/types";

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get("settings");
  return (result.settings as ExtensionSettings) || ({} as ExtensionSettings);
}

export async function saveSettings(
  settings: ExtensionSettings | Partial<ExtensionSettings>,
): Promise<void> {
  await chrome.storage.sync.set({ settings });
}