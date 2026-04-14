import { syncPrintButton } from './menu-button';
import { extractPrintableRowsFromTable } from '../row-extraction';
import { getSettings } from '../settings';
import type { ExtensionSettings, PrintRow } from '../types';

export class RentalPrintFeature {
  private settings: ExtensionSettings | null = null;

  private observer: MutationObserver | null = null;

  start() {
    void this.initialize();
  }

  private async initialize() {
    this.settings = await getSettings();

    chrome.storage.onChanged.addListener(this.handleStorageChange);

    this.observer = new MutationObserver(() => {
      this.syncPageButton();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.syncPageButton();
  }

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
      this.syncPageButton();
    }
  };

  private syncPageButton() {
    if (!this.settings) {
      return;
    }

    syncPrintButton(this.settings.rentalPrintButton, (event) => {
      event.preventDefault();
      event.stopPropagation();
      void this.handlePrintClick();
    });
  }

  private renderPrintPreview(printWindow: Window, rows: PrintRow[]) {
    printWindow.document.title = 'Druckvorschau';
    printWindow.document.body.innerHTML = '';
    printWindow.document.body.style.margin = '12px';
    printWindow.document.body.style.fontFamily =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    printWindow.document.body.style.fontSize = '12px';

    const preview = printWindow.document.createElement('pre');
    preview.style.whiteSpace = 'pre-wrap';
    preview.style.margin = '0';
    preview.textContent = rows
      .map((row) => row.map(({ key, value }) => `${key}: ${value}`).join(' | '))
      .join('\n');

    printWindow.document.body.append(preview);
  }

  private startPrint(printWindow: Window) {
    printWindow.addEventListener(
      'afterprint',
      () => {
        printWindow.close();
      },
      { once: true },
    );

    printWindow.focus();
    printWindow.setTimeout(() => {
      printWindow.print();
    }, 50);
  }

  private async handlePrintClick() {
    const table = document.querySelector<HTMLTableElement>('table');
    if (!table) {
      window.alert('Keine Tabelle gefunden.');
      return;
    }

    const rows = extractPrintableRowsFromTable(table);
    if (rows.length === 0) {
      window.alert('Keine druckbaren Werte gefunden.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.alert('Druckfenster konnte nicht geöffnet werden.');
      return;
    }

    this.renderPrintPreview(printWindow, rows);
    this.startPrint(printWindow);
  }
}
