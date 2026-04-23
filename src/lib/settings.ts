import { storage } from 'wxt/utils/storage';

import type { ExtensionSettings, FeatureId } from './types';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  rentalPrintButton: true,
  barcodeCheckIn: true,
  checkInQuantityWarning: true,
  printLabelsByCheckInQuantity: true,
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
  {
    id: 'printLabelsByCheckInQuantity',
    label: 'Etiketten nach Einbuchmenge drucken',
  },
];

const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as FeatureId[];

const SETTING_STORAGE_KEYS = SETTINGS_KEYS.reduce(
  (acc, key) => ({
    ...acc,
    [key]: `sync:${key}` as const,
  }),
  {} as Record<FeatureId, `sync:${FeatureId}`>,
);

export async function ensureDefaultSettings() {
  const current = await storage.getItems(SETTINGS_KEYS.map((key) => SETTING_STORAGE_KEYS[key]));
  const missingEntries = current
    .map((entry, index) => ({
      key: SETTINGS_KEYS[index]!,
      value: entry.value,
    }))
    .filter((entry) => entry.value === null)
    .map((entry) => ({
      key: SETTING_STORAGE_KEYS[entry.key],
      value: DEFAULT_SETTINGS[entry.key],
    }));

  if (missingEntries.length > 0) {
    await storage.setItems(missingEntries);
  }
}

export async function getSettings(): Promise<ExtensionSettings> {
  const entries = await Promise.all(
    SETTINGS_KEYS.map(async (key) => [
      key,
      await storage.getItem<boolean>(SETTING_STORAGE_KEYS[key], {
        fallback: DEFAULT_SETTINGS[key],
      }),
    ]),
  );

  return Object.fromEntries(entries) as ExtensionSettings;
}

export async function updateSetting(featureId: FeatureId, enabled: boolean) {
  await storage.setItem(SETTING_STORAGE_KEYS[featureId], enabled);
}

export function watchSetting(
  featureId: FeatureId,
  callback: (newValue: boolean, oldValue: boolean) => void,
) {
  return storage.watch<boolean>(SETTING_STORAGE_KEYS[featureId], (newValue, oldValue) => {
    callback(
      newValue ?? DEFAULT_SETTINGS[featureId],
      oldValue ?? DEFAULT_SETTINGS[featureId],
    );
  });
}
