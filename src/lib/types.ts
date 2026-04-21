export type FeatureId = 'rentalPrintButton' | 'barcodeCheckIn' | 'checkInQuantityWarning';

export type ExtensionSettings = {
  rentalPrintButton: boolean;
  barcodeCheckIn: boolean;
  checkInQuantityWarning: boolean;
};

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
