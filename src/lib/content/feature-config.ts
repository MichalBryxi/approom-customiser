import { BarcodeCheckInController } from './barcode-check-in-controller';
import type { ContentFeatureDefinition } from './feature-runtime';
import { RentalPrintFeature } from './rental-print-feature';
import { StorageOrderLabelPrintController } from './storage-order-label-print-controller';
import { StorageOrderWarningController } from './storage-order-warning-controller';

const rentalPrintFeature = new RentalPrintFeature();
const barcodeCheckInController = new BarcodeCheckInController();
const storageOrderWarningController = new StorageOrderWarningController();
const storageOrderLabelPrintController = new StorageOrderLabelPrintController();

const currentOrderDom = {
  selector: '#panel_current_order_step2, .panel-heading.hbuilt',
  textIncludes: 'Aktuelle Bestellung ID',
};

export const CONTENT_FEATURES: ContentFeatureDefinition[] = [
  {
    id: 'rentalPrintButton',
    label: 'Rental-Druckbutton',
    url: { pathEquals: '/rental/rent' },
    dom: { selector: 'button', textIncludes: 'Zeitachse' },
    sync: (enabled) => rentalPrintFeature.sync(enabled),
  },
  {
    id: 'barcodeCheckIn',
    label: 'Per Barcode einbuchen',
    url: { pathPrefix: '/org/storage/' },
    dom: currentOrderDom,
    sync: (enabled) => barcodeCheckInController.sync(enabled),
  },
  {
    id: 'checkInQuantityWarning',
    label: 'Warnung bei zu kleiner Einbuchmenge',
    url: { pathPrefix: '/org/storage/' },
    dom: currentOrderDom,
    sync: (enabled) => storageOrderWarningController.sync(enabled),
  },
  {
    id: 'printLabelsByCheckInQuantity',
    label: 'Etiketten nach Einbuchmenge drucken',
    url: { pathPrefix: '/org/storage/' },
    dom: currentOrderDom,
    sync: (enabled) => storageOrderLabelPrintController.sync(enabled),
  },
];
