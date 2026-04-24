import { storage } from 'wxt/utils/storage';

import { CHECK_IN_STATUS_COLORS } from './check-in-status-colors';
import type { ExtensionSettings, FeatureId } from './types';
export type ExtensionSettingId = keyof ExtensionSettings;

export type FeatureDescriptionPart =
  | string
  | {
      text: string;
      backgroundColor: string;
    };

type FeatureDefinition = {
  id: FeatureId;
  groupId: FeatureSettingGroupId;
  label: string;
  description: string;
  descriptionParts?: FeatureDescriptionPart[];
};

export const FEATURE_SETTING_GROUPS = [
  {
    id: 'rental-rent',
    breadcrumb: 'Rental > Vermietungen',
  },
  {
    id: 'storage-order',
    breadcrumb: 'Lager > Lagerbestellung > Bleistift',
  },
  {
    id: 'customer-registration',
    breadcrumb: 'Customer Registration > Customer',
  },
] as const;

export type FeatureSettingGroupId = (typeof FEATURE_SETTING_GROUPS)[number]['id'];

export const DEFAULT_SETTINGS: ExtensionSettings = {
  extensionEnabled: true,
  rentalPrintButton: true,
  barcodeCheckIn: true,
  checkInQuantityWarning: true,
  printLabelsByCheckInQuantity: true,
  customerRegistrationFields: true,
};

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    id: 'rentalPrintButton',
    groupId: 'rental-rent',
    label: 'Rental-Druckbutton',
    description:
      'Fügt in Mietansichten einen Druckbutton hinzu, um sichtbare Zeilendetails schnell zu drucken.',
  },
  {
    id: 'barcodeCheckIn',
    groupId: 'storage-order',
    label: 'Per Barcode einbuchen',
    description:
      'Fügt der aktuellen Bestellung eine Barcode-Eingabe hinzu, die passende Artikel beim Scannen hochzählt.',
  },
  {
    id: 'checkInQuantityWarning',
    groupId: 'storage-order',
    label: 'Warnung bei zu kleiner Einbuchmenge',
    description:
      'Markiert Zeilen nach Einbuchstatus: Eingebucht + Einbuchen kleiner als Bestellt, oder Eingebucht + Einbuchen gleich Bestellt. Bereits vollständig eingebuchte Zeilen bleiben unmarkiert.',
    descriptionParts: [
      'Markiert Zeilen nach Einbuchstatus: ',
      {
        text: 'Eingebucht + Einbuchen < Bestellt',
        backgroundColor: CHECK_IN_STATUS_COLORS.warning,
      },
      ', oder ',
      {
        text: 'Eingebucht + Einbuchen = Bestellt',
        backgroundColor: CHECK_IN_STATUS_COLORS.complete,
      },
      '. Bereits vollständig eingebuchte Zeilen bleiben unmarkiert.',
    ],
  },
  {
    id: 'printLabelsByCheckInQuantity',
    groupId: 'storage-order',
    label: 'Etiketten nach Einbuchmenge drucken',
    description:
      'Übernimmt beim Öffnen des Etikettendrucks die aktuelle Anzahl einbuchen als Druckmenge.',
  },
  {
    id: 'customerRegistrationFields',
    groupId: 'customer-registration',
    label: 'Registrierungsfelder',
    description:
      'Passt die Kundenregistrierung an: verschiebt zusätzliche Adress- und Kontaktdaten in den Bereich Extra, benennt Strasse um und macht Tel. Mobile obligatorisch.',
  },
];

const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as ExtensionSettingId[];

const SETTING_STORAGE_KEYS = SETTINGS_KEYS.reduce(
  (acc, key) => ({
    ...acc,
    [key]: `sync:${key}` as const,
  }),
  {} as Record<ExtensionSettingId, `sync:${ExtensionSettingId}`>,
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

export async function updateSetting(settingId: ExtensionSettingId, enabled: boolean) {
  await storage.setItem(SETTING_STORAGE_KEYS[settingId], enabled);
}

export function watchSetting(
  settingId: ExtensionSettingId,
  callback: (newValue: boolean, oldValue: boolean) => void,
) {
  return storage.watch<boolean>(SETTING_STORAGE_KEYS[settingId], (newValue, oldValue) => {
    callback(
      newValue ?? DEFAULT_SETTINGS[settingId],
      oldValue ?? DEFAULT_SETTINGS[settingId],
    );
  });
}
