import { syncPrintButton } from './menu-button';
import { savePrintJob } from '../print-job';
import { extractVisibleEntriesFromRow } from '../row-extraction';
import { getSettings } from '../settings';
import type { ExtensionSettings, PrintJob } from '../types';

export class RentalPrintFeature {
  private activeRow: HTMLTableRowElement | null = null;

  private settings: ExtensionSettings | null = null;

  private observer: MutationObserver | null = null;

  start() {
    void this.initialize();
  }

  private async initialize() {
    this.settings = await getSettings();

    document.addEventListener('click', this.handleDocumentClick, true);
    chrome.storage.onChanged.addListener(this.handleStorageChange);

    this.observer = new MutationObserver(() => {
      this.syncMenuButton();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.syncMenuButton();
  }

  private readonly handleDocumentClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const row = target.closest('tbody tr');
    if (row instanceof HTMLTableRowElement) {
      this.activeRow = row;
    }
  };

  private readonly handleStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== 'sync' || !this.settings) {
      return;
    }

    if (changes.rentalPrintButton) {
      this.settings = {
        ...this.settings,
        rentalPrintButton: Boolean(changes.rentalPrintButton.newValue),
      };
      this.syncMenuButton();
    }
  };

  private syncMenuButton() {
    const menuRoot = document.querySelector<HTMLElement>('#dropdown-right');
    if (!menuRoot || !this.settings) {
      return;
    }

    syncPrintButton(menuRoot, this.settings.rentalPrintButton, (event) => {
      event.preventDefault();
      event.stopPropagation();
      void this.handlePrintClick();
    });
  }

  private async handlePrintClick() {
    if (!(this.activeRow instanceof HTMLTableRowElement) || !document.contains(this.activeRow)) {
      window.alert('Keine aktive Zeile gefunden.');
      return;
    }

    const entries = extractVisibleEntriesFromRow(this.activeRow);
    if (entries.length === 0) {
      window.alert('Keine druckbaren Werte gefunden.');
      return;
    }

    const printJob: PrintJob = {
      sourceUrl: window.location.href,
      createdAt: new Date().toISOString(),
      entries,
    };

    await savePrintJob(printJob);
    window.open(chrome.runtime.getURL('print.html'), '_blank', 'noopener,noreferrer');
  }
}
