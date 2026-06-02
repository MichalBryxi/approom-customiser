export type FeatureId =
  | 'sidebarNoCollapse'
  | 'rentalPrintButton'
  | 'rentalFleetPrintButton'
  | 'checkInQuantityWarning'
  | 'printLabelsByCheckInQuantity'
  | 'customerRegistrationFields'
  | 'registrationToRental'
  | 'unterschriftHighlight'
  | 'rentalHideRechnungButton'
  | 'rentalSignatureNamePrefill'
  | 'rentalSignatureSaveButton'
  | 'rechnungenMitarbeiterPreis'
  | 'rentalErfasstDurchFilter'
  | 'absenceCalendarExport';

export type CustomerRegistrationFieldId =
  | 'salutation'
  | 'firstname'
  | 'lastname'
  | 'street'
  | 'zip'
  | 'city'
  | 'mobile'
  | 'mail'
  | 'phone_private'
  | 'phone_work'
  | 'website'
  | 'birthday';

export type CustomerRegistrationFieldMoveSettingId =
  `customerRegistrationField.${CustomerRegistrationFieldId}.moveToExtra`;

export type CustomerRegistrationFieldMandatorySettingId =
  `customerRegistrationField.${CustomerRegistrationFieldId}.mandatory`;

export type CustomerRegistrationLanguage = 'de' | 'en' | 'fr' | 'it';

export type CustomerRegistrationFieldLabelSettingId =
  `customerRegistrationField.${CustomerRegistrationFieldId}.label.${CustomerRegistrationLanguage}`;

export type RentalFleetRow = {
  rentEan: string;
  groesse: string;
  mietart: string;
  produkt: string;
  mietobjekt: string;
  artNr: string;
  modell: string;
  marke: string;
  farbe: string;
  rahmennummer: string;
  jahrgang: string;
};

export type ExtensionSettings = {
  extensionEnabled: boolean;
  sidebarNoCollapse: boolean;
  rentalPrintButton: boolean;
  rentalFleetPrintButton: boolean;
  rentalPrintSkipMietobjektPattern: string;
  checkInQuantityWarning: boolean;
  printLabelsByCheckInQuantity: boolean;
  customerRegistrationFields: boolean;
  registrationToRental: boolean;
  unterschriftHighlight: boolean;
  rentalHideRechnungButton: boolean;
  rentalSignatureNamePrefill: boolean;
  rentalSignatureSaveButton: boolean;
  rechnungenMitarbeiterPreis: boolean;
  rechnungenMitarbeiterPreisProzent: number;
  rechnungenMitarbeiterPreisKundentypPattern: string;
  rentalErfasstDurchFilter: boolean;
  rentalErfasstDurchFilterPattern: string;
  absenceCalendarExport: boolean;
  absenceCalendarExportMarkActive: boolean;
  customerRegistrationDefaultLanguage: CustomerRegistrationLanguage;
} & Record<CustomerRegistrationFieldMoveSettingId, boolean> &
  Record<CustomerRegistrationFieldMandatorySettingId, boolean> &
  Record<CustomerRegistrationFieldLabelSettingId, string>;

export type PrintJobEntry = {
  key: string;
  value: string;
  subValue?: string;
};

export type PrintRow = PrintJobEntry[];

export type PrintJob = {
  sourceUrl: string;
  createdAt: string;
  entries: PrintJobEntry[];
};
