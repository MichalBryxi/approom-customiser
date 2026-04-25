export type FeatureId =
  | 'rentalPrintButton'
  | 'barcodeCheckIn'
  | 'checkInQuantityWarning'
  | 'printLabelsByCheckInQuantity'
  | 'customerRegistrationFields';

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

export type ExtensionSettings = {
  extensionEnabled: boolean;
  rentalPrintButton: boolean;
  rentalPrintSkipMietobjektPattern: string;
  barcodeCheckIn: boolean;
  checkInQuantityWarning: boolean;
  printLabelsByCheckInQuantity: boolean;
  customerRegistrationFields: boolean;
} & Record<CustomerRegistrationFieldMoveSettingId, boolean> &
  Record<CustomerRegistrationFieldMandatorySettingId, boolean> &
  Record<CustomerRegistrationFieldLabelSettingId, string>;

export type PrintJobEntry = {
  key: string;
  value: string;
};

export type PrintRow = PrintJobEntry[];

export type PrintJob = {
  sourceUrl: string;
  createdAt: string;
  entries: PrintJobEntry[];
};
