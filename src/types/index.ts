export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export type SpeedValue = typeof SPEED_OPTIONS[number];

export interface ExtensionSettings {
  defaultSpeed: SpeedValue;
  skipSeconds: number;
  enabled: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  defaultSpeed: 1.5,
  skipSeconds: 10,
  enabled: true,
};
