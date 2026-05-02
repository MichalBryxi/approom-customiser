import { BarcodeCheckInController } from './barcode-check-in-controller';
import { CustomerRegistrationFieldsController } from './customer-registration-fields-controller';
import type { ContentFeatureDefinition } from './feature-runtime';
import { RentalPrintFeature } from './rental-print-feature';
import { StorageOrderLabelPrintController } from './storage-order-label-print-controller';
import { StorageOrderWarningController } from './storage-order-warning-controller';

const rentalPrintFeature = new RentalPrintFeature();
const barcodeCheckInController = new BarcodeCheckInController();
const storageOrderWarningController = new StorageOrderWarningController();
const storageOrderLabelPrintController = new StorageOrderLabelPrintController();
const customerRegistrationFieldsController = new CustomerRegistrationFieldsController();

const rentalTimelineButtonAnchor = '//button[contains(normalize-space(.), "Zeitachse")]';
const currentOrderHeadingAnchor = '#panel_current_order_step2';
const storageOrderFrameUrl = {
  pathEquals: '/start.php',
  searchIncludes: 'men_link=storage',
};

function mountHiddenFeature(wrapper: HTMLElement, sync: (enabled: boolean) => void) {
  wrapper.hidden = true;
  sync(true);
}

export const CONTENT_FEATURES: ContentFeatureDefinition[] = [
  {
    id: 'rentalPrintButton',
    label: 'Rental-Druckbutton',
    url: { pathEquals: '/rental/rent' },
    anchor: rentalTimelineButtonAnchor,
    append: 'before',
    mount: (wrapper) => rentalPrintFeature.mount(wrapper),
  },
  {
    id: 'barcodeCheckIn',
    label: 'Per Barcode einbuchen',
    url: storageOrderFrameUrl,
    anchor: currentOrderHeadingAnchor,
    mount: (wrapper) => barcodeCheckInController.sync(true, wrapper),
    remove: () => barcodeCheckInController.sync(false),
  },
  {
    id: 'checkInQuantityWarning',
    label: 'Warnung bei zu kleiner Einbuchmenge',
    url: storageOrderFrameUrl,
    anchor: '#bestell_artikel',
    append: 'before',
    mount: (wrapper) =>
      mountHiddenFeature(wrapper, (enabled) => storageOrderWarningController.sync(enabled)),
    remove: () => storageOrderWarningController.sync(false),
  },
  {
    id: 'printLabelsByCheckInQuantity',
    label: 'Etiketten nach Einbuchmenge drucken',
    url: storageOrderFrameUrl,
    anchor: '#etiketten_button',
    append: 'before',
    mount: (wrapper) =>
      mountHiddenFeature(wrapper, (enabled) => storageOrderLabelPrintController.sync(enabled)),
    remove: () => storageOrderLabelPrintController.sync(false),
  },
  {
    id: 'customerRegistrationFields',
    label: 'Registrierungsfelder',
    url: { pathEquals: '/customer_registration/customer' },
    anchor: 'app-registration form button[type="submit"]',
    append: 'before',
    mount: (wrapper) =>
      mountHiddenFeature(wrapper, (enabled) =>
        customerRegistrationFieldsController.sync(enabled),
      ),
    remove: () => customerRegistrationFieldsController.sync(false),
  },
  {
    id: 'registrationToRental',
    label: 'Anmelden & Vermietung offen',
    url: { pathEquals: '/customer_registration/customer' },
    anchor: 'app-registration form button[type="submit"]',
    append: 'before',
    mount: (wrapper) =>
      mountHiddenFeature(wrapper, (enabled) =>
        customerRegistrationFieldsController.syncRentalButtons(enabled),
      ),
    remove: () => customerRegistrationFieldsController.syncRentalButtons(false),
  },
];
