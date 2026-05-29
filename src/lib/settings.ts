import { storage } from 'wxt/utils/storage';

import { CHECK_IN_STATUS_COLORS } from './check-in-status-colors';
import type {
  CustomerRegistrationFieldId,
  CustomerRegistrationFieldLabelSettingId,
  CustomerRegistrationFieldMandatorySettingId,
  CustomerRegistrationFieldMoveSettingId,
  CustomerRegistrationLanguage,
  ExtensionSettings,
  FeatureId,
} from './types';
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

type CustomerRegistrationFieldDefinition = {
  id: CustomerRegistrationFieldId;
  label: string;
  formControlName: string;
  moveToExtraSetting: CustomerRegistrationFieldMoveSettingId;
  mandatorySetting: CustomerRegistrationFieldMandatorySettingId;
  labelSettings: Record<CustomerRegistrationLanguage, CustomerRegistrationFieldLabelSettingId>;
};

export const CUSTOMER_REGISTRATION_LANGUAGES: Array<{
  id: CustomerRegistrationLanguage;
  label: string;
}> = [
  { id: 'de', label: 'DE' },
  { id: 'en', label: 'EN' },
  { id: 'it', label: 'IT' },
  { id: 'fr', label: 'FR' },
];

export const FEATURE_SETTING_GROUPS = [
  {
    id: 'global',
    breadcrumb: 'Global (alle Seiten)',
  },
  {
    id: 'rental-rent',
    breadcrumb: 'Rental > Vermietungen',
  },
  {
    id: 'rental-fleet',
    breadcrumb: 'Rental > Mietflotte',
  },
  {
    id: 'storage-order',
    breadcrumb: 'Lager > Lagerbestellung > Bleistift',
  },
  {
    id: 'customer-registration',
    breadcrumb: 'Customer Registration > Customer',
  },
  {
    id: 'office-rechnungen',
    breadcrumb: 'Office > Rechnungen',
  },
] as const;

export type FeatureSettingGroupId = (typeof FEATURE_SETTING_GROUPS)[number]['id'];

export const CUSTOMER_REGISTRATION_FIELD_DEFINITIONS: CustomerRegistrationFieldDefinition[] = [
  {
    id: 'salutation',
    label: 'Anrede',
    formControlName: 'sal_id',
    moveToExtraSetting: 'customerRegistrationField.salutation.moveToExtra',
    mandatorySetting: 'customerRegistrationField.salutation.mandatory',
    labelSettings: {
      de: 'customerRegistrationField.salutation.label.de',
      en: 'customerRegistrationField.salutation.label.en',
      it: 'customerRegistrationField.salutation.label.it',
      fr: 'customerRegistrationField.salutation.label.fr',
    },
  },
  {
    id: 'firstname',
    label: 'Vorname',
    formControlName: 'firstname',
    moveToExtraSetting: 'customerRegistrationField.firstname.moveToExtra',
    mandatorySetting: 'customerRegistrationField.firstname.mandatory',
    labelSettings: {
      de: 'customerRegistrationField.firstname.label.de',
      en: 'customerRegistrationField.firstname.label.en',
      it: 'customerRegistrationField.firstname.label.it',
      fr: 'customerRegistrationField.firstname.label.fr',
    },
  },
  {
    id: 'lastname',
    label: 'Name',
    formControlName: 'lastname',
    moveToExtraSetting: 'customerRegistrationField.lastname.moveToExtra',
    mandatorySetting: 'customerRegistrationField.lastname.mandatory',
    labelSettings: {
      de: 'customerRegistrationField.lastname.label.de',
      en: 'customerRegistrationField.lastname.label.en',
      it: 'customerRegistrationField.lastname.label.it',
      fr: 'customerRegistrationField.lastname.label.fr',
    },
  },
  {
    id: 'street',
    label: 'Strasse',
    formControlName: 'street',
    moveToExtraSetting: 'customerRegistrationField.street.moveToExtra',
    mandatorySetting: 'customerRegistrationField.street.mandatory',
    labelSettings: {
      de: 'customerRegistrationField.street.label.de',
      en: 'customerRegistrationField.street.label.en',
      it: 'customerRegistrationField.street.label.it',
      fr: 'customerRegistrationField.street.label.fr',
    },
  },
  {
    id: 'zip',
    label: 'PLZ',
    formControlName: 'zip',
    moveToExtraSetting: 'customerRegistrationField.zip.moveToExtra',
    mandatorySetting: 'customerRegistrationField.zip.mandatory',
    labelSettings: {
      de: 'customerRegistrationField.zip.label.de',
      en: 'customerRegistrationField.zip.label.en',
      it: 'customerRegistrationField.zip.label.it',
      fr: 'customerRegistrationField.zip.label.fr',
    },
  },
  {
    id: 'city',
    label: 'Ort',
    formControlName: 'city',
    moveToExtraSetting: 'customerRegistrationField.city.moveToExtra',
    mandatorySetting: 'customerRegistrationField.city.mandatory',
    labelSettings: {
      de: 'customerRegistrationField.city.label.de',
      en: 'customerRegistrationField.city.label.en',
      it: 'customerRegistrationField.city.label.it',
      fr: 'customerRegistrationField.city.label.fr',
    },
  },
  {
    id: 'mobile',
    label: 'Tel. Mobile',
    formControlName: 'mobile',
    moveToExtraSetting: 'customerRegistrationField.mobile.moveToExtra',
    mandatorySetting: 'customerRegistrationField.mobile.mandatory',
    labelSettings: {
      de: 'customerRegistrationField.mobile.label.de',
      en: 'customerRegistrationField.mobile.label.en',
      it: 'customerRegistrationField.mobile.label.it',
      fr: 'customerRegistrationField.mobile.label.fr',
    },
  },
  {
    id: 'mail',
    label: 'E-Mail Adresse',
    formControlName: 'mail',
    moveToExtraSetting: 'customerRegistrationField.mail.moveToExtra',
    mandatorySetting: 'customerRegistrationField.mail.mandatory',
    labelSettings: {
      de: 'customerRegistrationField.mail.label.de',
      en: 'customerRegistrationField.mail.label.en',
      it: 'customerRegistrationField.mail.label.it',
      fr: 'customerRegistrationField.mail.label.fr',
    },
  },
  {
    id: 'phone_private',
    label: 'Tel. Privat',
    formControlName: 'phone_private',
    moveToExtraSetting: 'customerRegistrationField.phone_private.moveToExtra',
    mandatorySetting: 'customerRegistrationField.phone_private.mandatory',
    labelSettings: {
      de: 'customerRegistrationField.phone_private.label.de',
      en: 'customerRegistrationField.phone_private.label.en',
      it: 'customerRegistrationField.phone_private.label.it',
      fr: 'customerRegistrationField.phone_private.label.fr',
    },
  },
  {
    id: 'phone_work',
    label: 'Tel. Geschäft',
    formControlName: 'phone_work',
    moveToExtraSetting: 'customerRegistrationField.phone_work.moveToExtra',
    mandatorySetting: 'customerRegistrationField.phone_work.mandatory',
    labelSettings: {
      de: 'customerRegistrationField.phone_work.label.de',
      en: 'customerRegistrationField.phone_work.label.en',
      it: 'customerRegistrationField.phone_work.label.it',
      fr: 'customerRegistrationField.phone_work.label.fr',
    },
  },
  {
    id: 'website',
    label: 'Website',
    formControlName: 'website',
    moveToExtraSetting: 'customerRegistrationField.website.moveToExtra',
    mandatorySetting: 'customerRegistrationField.website.mandatory',
    labelSettings: {
      de: 'customerRegistrationField.website.label.de',
      en: 'customerRegistrationField.website.label.en',
      it: 'customerRegistrationField.website.label.it',
      fr: 'customerRegistrationField.website.label.fr',
    },
  },
  {
    id: 'birthday',
    label: 'Geburtstag',
    formControlName: 'birthday',
    moveToExtraSetting: 'customerRegistrationField.birthday.moveToExtra',
    mandatorySetting: 'customerRegistrationField.birthday.mandatory',
    labelSettings: {
      de: 'customerRegistrationField.birthday.label.de',
      en: 'customerRegistrationField.birthday.label.en',
      it: 'customerRegistrationField.birthday.label.it',
      fr: 'customerRegistrationField.birthday.label.fr',
    },
  },
];

export const DEFAULT_SETTINGS: ExtensionSettings = {
  extensionEnabled: true,
  sidebarNoCollapse: false,
  rentalPrintButton: true,
  rentalPrintSkipMietobjektPattern: '.*Helm.*',
  rentalFleetPrintButton: true,
  checkInQuantityWarning: true,
  printLabelsByCheckInQuantity: true,
  customerRegistrationFields: true,
  registrationToRental: true,
  unterschriftHighlight: true,
  rentalHideRechnungButton: true,
  rentalSignatureNamePrefill: true,
  rentalSignatureSaveButton: true,
  rechnungenMitarbeiterPreis: true,
  rechnungenMitarbeiterPreisProzent: 12,
  rechnungenMitarbeiterPreisKundentypPattern: '.*Mitarbeiter.*',
  rentalErfasstDurchFilter: true,
  rentalErfasstDurchFilterPattern: '',
  customerRegistrationDefaultLanguage: 'en',
  'customerRegistrationField.salutation.moveToExtra': true,
  'customerRegistrationField.firstname.moveToExtra': false,
  'customerRegistrationField.lastname.moveToExtra': false,
  'customerRegistrationField.street.moveToExtra': false,
  'customerRegistrationField.zip.moveToExtra': true,
  'customerRegistrationField.city.moveToExtra': true,
  'customerRegistrationField.mobile.moveToExtra': false,
  'customerRegistrationField.mail.moveToExtra': false,
  'customerRegistrationField.phone_private.moveToExtra': true,
  'customerRegistrationField.phone_work.moveToExtra': true,
  'customerRegistrationField.website.moveToExtra': true,
  'customerRegistrationField.birthday.moveToExtra': true,
  'customerRegistrationField.salutation.mandatory': false,
  'customerRegistrationField.firstname.mandatory': true,
  'customerRegistrationField.lastname.mandatory': true,
  'customerRegistrationField.street.mandatory': false,
  'customerRegistrationField.zip.mandatory': false,
  'customerRegistrationField.city.mandatory': false,
  'customerRegistrationField.mobile.mandatory': true,
  'customerRegistrationField.mail.mandatory': true,
  'customerRegistrationField.phone_private.mandatory': false,
  'customerRegistrationField.phone_work.mandatory': false,
  'customerRegistrationField.website.mandatory': false,
  'customerRegistrationField.birthday.mandatory': false,
  'customerRegistrationField.salutation.label.de': '',
  'customerRegistrationField.salutation.label.en': '',
  'customerRegistrationField.salutation.label.it': '',
  'customerRegistrationField.salutation.label.fr': '',
  'customerRegistrationField.firstname.label.de': '',
  'customerRegistrationField.firstname.label.en': '',
  'customerRegistrationField.firstname.label.it': '',
  'customerRegistrationField.firstname.label.fr': '',
  'customerRegistrationField.lastname.label.de': '',
  'customerRegistrationField.lastname.label.en': '',
  'customerRegistrationField.lastname.label.it': '',
  'customerRegistrationField.lastname.label.fr': '',
  'customerRegistrationField.street.label.de': 'Hotelname & Adresse',
  'customerRegistrationField.street.label.en': 'Hotel name & address',
  'customerRegistrationField.street.label.it': "Nome e indirizzo dell'hotel",
  'customerRegistrationField.street.label.fr': "Nom et adresse de l'hôtel",
  'customerRegistrationField.zip.label.de': '',
  'customerRegistrationField.zip.label.en': '',
  'customerRegistrationField.zip.label.it': '',
  'customerRegistrationField.zip.label.fr': '',
  'customerRegistrationField.city.label.de': '',
  'customerRegistrationField.city.label.en': '',
  'customerRegistrationField.city.label.it': '',
  'customerRegistrationField.city.label.fr': '',
  'customerRegistrationField.mobile.label.de': '',
  'customerRegistrationField.mobile.label.en': '',
  'customerRegistrationField.mobile.label.it': '',
  'customerRegistrationField.mobile.label.fr': '',
  'customerRegistrationField.mail.label.de': '',
  'customerRegistrationField.mail.label.en': '',
  'customerRegistrationField.mail.label.it': '',
  'customerRegistrationField.mail.label.fr': '',
  'customerRegistrationField.phone_private.label.de': '',
  'customerRegistrationField.phone_private.label.en': '',
  'customerRegistrationField.phone_private.label.it': '',
  'customerRegistrationField.phone_private.label.fr': '',
  'customerRegistrationField.phone_work.label.de': '',
  'customerRegistrationField.phone_work.label.en': '',
  'customerRegistrationField.phone_work.label.it': '',
  'customerRegistrationField.phone_work.label.fr': '',
  'customerRegistrationField.website.label.de': '',
  'customerRegistrationField.website.label.en': '',
  'customerRegistrationField.website.label.it': '',
  'customerRegistrationField.website.label.fr': '',
  'customerRegistrationField.birthday.label.de': '',
  'customerRegistrationField.birthday.label.en': '',
  'customerRegistrationField.birthday.label.it': '',
  'customerRegistrationField.birthday.label.fr': '',
};

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    id: 'sidebarNoCollapse',
    groupId: 'global',
    label: 'Seitenleiste nicht einklappen',
    description:
      'Hält die Seitenleiste immer offen — auch wenn der ERP-Schalter sie einzuklappen versucht.',
  },
  {
    id: 'rentalFleetPrintButton',
    groupId: 'rental-fleet',
    label: 'Mietflotte-Druckbutton',
    description:
      'Fügt in der Mietflotte-Übersicht einen „Drucken"-Button hinzu. Beim Klick öffnet sich eine druckfertige Seite mit einer Etikette pro Zeile — die letzten vier Stellen der Rent-EAN sowie die Grösse in einem Kreis. Druckereinstellungen: Seitenformat 60 × 35 mm (2.36″ × 1.38″), Rand 1.5 mm. Der PDF verwendet intern einen Seitenrand von 4 mm (1.5 mm Druckertoleranz + 2.5 mm optischer Abstand) — diese Werte sind im Code festgelegt und müssen nicht am Drucker eingestellt werden.',
  },
  {
    id: 'rentalPrintButton',
    groupId: 'rental-rent',
    label: 'Rental-Druckbutton',
    description:
      'Fügt in der Mietliste einen „Drücken"-Button hinzu. Beim Klick öffnet sich eine Druckansicht mit allen sichtbaren Reservierungen — pro Position eine Zeile mit Kundenname, Mietartikel, Mietzeiten sowie Name und Körpermasse. Vormittagsbuchungen sind am gestrichelten, Nachmittagsbuchungen am durchgehenden farbigen Balken erkennbar.',
  },
  {
    id: 'checkInQuantityWarning',
    groupId: 'storage-order',
    label: 'Warnung bei zu kleiner Einbuchmenge',
    description:
      'Färbt Zeilen ein, sobald die eingebuchte Menge nicht mit der bestellten Menge übereinstimmt. Vollständig abgearbeitete Zeilen bleiben unmarkiert.',
    descriptionParts: [
      'Färbt Zeilen ein, sobald die eingebuchte Menge nicht mit der bestellten Menge übereinstimmt: ',
      {
        text: 'Eingebucht + Einbuchen < Bestellt',
        backgroundColor: CHECK_IN_STATUS_COLORS.warning,
      },
      ', oder ',
      {
        text: 'Eingebucht + Einbuchen = Bestellt',
        backgroundColor: CHECK_IN_STATUS_COLORS.complete,
      },
      '. Vollständig abgearbeitete Zeilen bleiben unmarkiert.',
    ],
  },
  {
    id: 'printLabelsByCheckInQuantity',
    groupId: 'storage-order',
    label: 'Etiketten nach Einbuchmenge drucken',
    description:
      'Füllt beim Öffnen des Etikettendrucks die Druckmengen automatisch mit den aktuellen Einbuchmengen aus.',
  },
  {
    id: 'customerRegistrationFields',
    groupId: 'customer-registration',
    label: 'Registrierungsfelder',
    description:
      'Erlaubt es, einzelne Felder des Registrierungsformulars als Pflichtfeld zu markieren, in den Extra-Bereich zu verschieben oder mit einer eigenen Beschriftung zu versehen.',
  },
  {
    id: 'registrationToRental',
    groupId: 'customer-registration',
    label: 'Anmelden & Vermietung offen',
    description:
      'Fügt neben „Anmelden" einen zweiten Button hinzu, der nach der Registrierung direkt eine neue Vermietung für diesen Kunden öffnet.',
  },
  {
    id: 'unterschriftHighlight',
    groupId: 'rental-rent',
    label: 'Nicht unterschriebene Vermietungen markieren',
    description:
      'Lässt den „Unterschreiben"-Button rot aufblinken — in der Liste beim Öffnen des Aktionsmenüs und auf der Detailseite — damit keine Unterschrift vergessen geht.',
  },
  {
    id: 'rentalHideRechnungButton',
    groupId: 'rental-rent',
    label: '"Rechnung"-Button ausblenden',
    description: 'Blendet den „Rechnung"-Button auf der Mietdetailseite aus.',
  },
  {
    id: 'rentalSignatureNamePrefill',
    groupId: 'rental-rent',
    label: '"Unterschrift"-Dialog: Name vorausfüllen',
    description:
      'Füllt das Namensfeld im Unterschrift-Dialog automatisch mit dem Kundennamen aus.',
  },
  {
    id: 'rentalSignatureSaveButton',
    groupId: 'rental-rent',
    label: '"Unterschrift"-Dialog: Speichern-Button grün',
    description: 'Hebt den Speichern-Button im Unterschrift-Dialog grün hervor, damit er besser sichtbar ist.',
  },
  {
    id: 'rechnungenMitarbeiterPreis',
    groupId: 'office-rechnungen',
    label: 'Mitarbeiterpreis-Button',
    description:
      'Fügt pro Rechnungsposition einen Button hinzu, der den Einzelpreis auf den Einkaufspreis plus konfigurierten Aufschlag setzt.',
  },
  {
    id: 'rentalErfasstDurchFilter',
    groupId: 'rental-rent',
    label: '"Erfasst durch" filtern',
    description:
      'Filtert das „Erfasst durch"-Dropdown so, dass nur bestimmte Mitarbeiter zur Auswahl stehen.',
  },
];

const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as ExtensionSettingId[];

const SETTING_STORAGE_KEYS = SETTINGS_KEYS.reduce(
  (acc, key) => ({
    ...acc,
    [key]: `local:${key}` as const,
  }),
  {} as Record<ExtensionSettingId, `local:${ExtensionSettingId}`>,
);

export async function getSettings(): Promise<ExtensionSettings> {
  const entries = await Promise.all(
    SETTINGS_KEYS.map(async (key) => [
      key,
      await storage.getItem(SETTING_STORAGE_KEYS[key], {
        fallback: DEFAULT_SETTINGS[key],
      }),
    ]),
  );

  return Object.fromEntries(entries) as ExtensionSettings;
}

export async function updateSetting<TSettingId extends ExtensionSettingId>(
  settingId: TSettingId,
  value: ExtensionSettings[TSettingId],
) {
  await storage.setItem(SETTING_STORAGE_KEYS[settingId], value);
}

export function watchSetting<TSettingId extends ExtensionSettingId>(
  settingId: TSettingId,
  callback: (
    newValue: ExtensionSettings[TSettingId],
    oldValue: ExtensionSettings[TSettingId],
  ) => void,
) {
  return storage.watch<ExtensionSettings[TSettingId]>(
    SETTING_STORAGE_KEYS[settingId],
    (newValue, oldValue) => {
    callback(
      newValue ?? DEFAULT_SETTINGS[settingId],
      oldValue ?? DEFAULT_SETTINGS[settingId],
    );
    },
  );
}
