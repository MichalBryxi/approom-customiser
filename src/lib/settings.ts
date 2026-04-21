import type { ExtensionSettings, FeatureId } from './types';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  rentalPrintButton: true,
  barcodeCheckIn: true,
  checkInQuantityWarning: true,
};

export const FEATURE_DEFINITIONS: Array<{ id: FeatureId; label: string }> = [
  {
    id: 'rentalPrintButton',
    label: 'Rental-Druckbutton',
  },
  {
    id: 'barcodeCheckIn',
    label: 'Per Barcode einbuchen',
  },
  {
    id: 'checkInQuantityWarning',
    label: 'Warnung bei zu kleiner Einbuchmenge',
  },
];

const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as FeatureId[];

export async function ensureDefaultSettings() {
  const current = await chrome.storage.sync.get(SETTINGS_KEYS);
  const missingEntries = SETTINGS_KEYS.reduce<Partial<ExtensionSettings>>((acc, key) => {
    if (typeof current[key] === 'undefined') {
      acc[key] = DEFAULT_SETTINGS[key];
    }
    return acc;
  }, {});

  if (Object.keys(missingEntries).length > 0) {
    await chrome.storage.sync.set(missingEntries);
  }
}

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.sync.get(SETTINGS_KEYS);
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
  } as ExtensionSettings;
}

export async function updateSetting(featureId: FeatureId, enabled: boolean) {
  await chrome.storage.sync.set({ [featureId]: enabled });
}
