import { BarcodeCheckInController } from './barcode-check-in-controller';
import { CustomerRegistrationFieldsController } from './customer-registration-fields-controller';
import type { ContentFeatureDefinition } from './feature-runtime';
import { RentalPrintFeature } from './rental-print-feature';
import { StorageOrderLabelPrintController } from './storage-order-label-print-controller';
import { StorageOrderWarningController } from './storage-order-warning-controller';
import { UnterschriftHighlightController } from './unterschrift-highlight-controller';

const rentalPrintFeature = new RentalPrintFeature();
const barcodeCheckInController = new BarcodeCheckInController();
const storageOrderWarningController = new StorageOrderWarningController();
const storageOrderLabelPrintController = new StorageOrderLabelPrintController();
const customerRegistrationFieldsController = new CustomerRegistrationFieldsController();
const unterschriftHighlightController = new UnterschriftHighlightController();

const rentalTimelineButtonAnchor = '//button[contains(normalize-space(.), "Zeitachse")]';
const currentOrderHeadingAnchor = '#panel_current_order_step2';
const storageOrderFrameUrl = {
  pathEquals: '/start.php',
  searchIncludes: 'men_link=storage',
};

function mountHiddenFeature(wrapper: HTMLElement, onMount: () => void) {
  wrapper.hidden = true;
  onMount();
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
  },
  {
    id: 'checkInQuantityWarning',
    label: 'Warnung bei zu kleiner Einbuchmenge',
    url: storageOrderFrameUrl,
    anchor: '#bestell_artikel',
    append: 'before',
    mount: (wrapper) =>
      mountHiddenFeature(wrapper, () => storageOrderWarningController.sync(true)),
  },
  {
    id: 'printLabelsByCheckInQuantity',
    label: 'Etiketten nach Einbuchmenge drucken',
    url: storageOrderFrameUrl,
    anchor: '#etiketten_button',
    append: 'before',
    mount: (wrapper) =>
      mountHiddenFeature(wrapper, () => storageOrderLabelPrintController.sync(true)),
  },
  {
    id: 'customerRegistrationFields',
    label: 'Registrierungsfelder',
    url: { pathEquals: '/customer_registration/customer' },
    anchor: 'app-registration form button[type="submit"]',
    append: 'before',
    mount: (wrapper) =>
      mountHiddenFeature(wrapper, () => customerRegistrationFieldsController.sync(true)),
  },
  {
    id: 'unterschriftHighlight',
    label: 'Unterschrift-Button hervorheben',
    url: { pathStartsWith: '/rental/rent/' },
    anchor: '//button[contains(normalize-space(.), "Unterschrift")]',
    append: 'before',
    mount: (wrapper) =>
      mountHiddenFeature(wrapper, () =>
        unterschriftHighlightController.apply(wrapper.nextElementSibling as HTMLButtonElement | null),
      ),
  },
  {
    id: 'registrationToRental',
    label: 'Anmelden & Vermietung offen',
    url: { pathEquals: '/customer_registration/customer' },
    anchor: 'app-registration form button[type="submit"]',
    append: 'before',
    mount: (wrapper) =>
      mountHiddenFeature(wrapper, () => customerRegistrationFieldsController.syncRentalButtons(true)),
  },
];
