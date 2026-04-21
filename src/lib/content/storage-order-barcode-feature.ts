import { BarcodeCheckInController } from './barcode-check-in-controller';
import { StorageOrderWarningController } from './storage-order-warning-controller';
import { getSettings } from '../settings';
import type { ExtensionSettings } from '../types';

export class StorageOrderBarcodeFeature {
  private settings: ExtensionSettings | null = null;

  private observer: MutationObserver | null = null;

  private controller = new BarcodeCheckInController();

  private warningController = new StorageOrderWarningController();

  start() {
    void this.initialize();
  }

  private async initialize() {
    this.settings = await getSettings();

    chrome.storage.onChanged.addListener(this.handleStorageChange);

    this.observer = new MutationObserver(() => {
      this.syncPageControls();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.syncPageControls();
  }

  private readonly handleStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== 'sync' || !this.settings) {
      return;
    }

    if (changes.barcodeCheckIn || changes.checkInQuantityWarning) {
      this.settings = {
        ...this.settings,
        ...(changes.barcodeCheckIn
          ? { barcodeCheckIn: Boolean(changes.barcodeCheckIn.newValue) }
          : {}),
        ...(changes.checkInQuantityWarning
          ? { checkInQuantityWarning: Boolean(changes.checkInQuantityWarning.newValue) }
          : {}),
      };
      this.syncPageControls();
    }
  };

  private syncPageControls() {
    if (!this.settings) {
      return;
    }

    this.controller.sync(this.settings.barcodeCheckIn);
    this.warningController.sync(this.settings.checkInQuantityWarning);
  }
}
