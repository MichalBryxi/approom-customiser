export type FeatureId = 'rentalPrintButton';

export type ExtensionSettings = {
  rentalPrintButton: boolean;
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
