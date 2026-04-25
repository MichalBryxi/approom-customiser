import { syncPrintButton } from './menu-button';
import type { PrintRow } from '../types';
import { normalizeText } from '../text';
import {
  getAppRoomFieldsetByLabel,
  getAppRoomFieldValue,
  getAppRoomMultiselectValue,
} from './app-room-fields';

const UI_WAIT_MS = 150;
const PAGE_WAIT_MS = 10000;
const POSITION_ITEM_SELECTOR = '.list-group.mb-2 > .list-group-item';
const RENTAL_GROUP_COLORS = [
  '#ff0000',
  '#0000ff',
  '#008000',
  '#00ffff',
  '#ff00ff',
  '#ffff00',
  '#000000',
];
const PRINT_CSS = `
  @page {
    size: landscape;
  }

  html,
  body {
    margin: 12px;
    color: #111827;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 20px;
    font-weight: 700;
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 6px 8px;
    table-layout: auto;
    font: inherit;
  }

  td {
    border: 1px solid #d1d5db;
    padding: 18px 10px;
    vertical-align: top;
    overflow-wrap: anywhere;
    font: inherit;
  }

  .rental-color-cell {
    width: 1%;
    min-width: 18px;
    padding: 0;
    white-space: nowrap;
  }

  .print-cell-customer,
  .print-cell-name {
    width: 1%;
    white-space: nowrap;
  }

  .print-cell-rentalArticle {
    width: auto;
  }
`;

type DetailPosition = {
  rentalArticle: string;
  name: string;
  height: string;
  weight: string;
};

type PrintRentalGroup = {
  color: string;
  rows: PrintRow[];
};

export class RentalPrintFeature {
  private isPrinting = false;

  mount(wrapper: HTMLElement) {
    syncPrintButton(wrapper, (event) => {
      event.preventDefault();
      event.stopPropagation();
      void this.handlePrintClick();
    });
  }

  private renderPrintPreview(printWindow: Window, groups: PrintRentalGroup[]) {
    const { document: printDocument } = printWindow;

    printDocument.open();
    printDocument.write('<!doctype html><html><head><title>Druckvorschau</title></head><body></body></html>');
    printDocument.close();

    const style = printDocument.createElement('style');
    style.textContent = PRINT_CSS;
    printDocument.head.append(style);

    const table = printWindow.document.createElement('table');
    const tbody = printWindow.document.createElement('tbody');

    for (const group of groups) {
      for (const row of group.rows) {
        const tr = printWindow.document.createElement('tr');
        const colorCell = printWindow.document.createElement('td');
        colorCell.className = 'rental-color-cell';
        colorCell.style.backgroundColor = group.color;
        colorCell.style.borderTop = `10px solid ${group.color}`;
        colorCell.setAttribute('aria-hidden', 'true');
        tr.append(colorCell);

        for (const cell of row) {
          const td = printWindow.document.createElement('td');
          td.className = `print-cell-${cell.key}`;
          td.textContent = cell.value;
          tr.append(td);
        }

        tbody.append(tr);
      }
    }

    table.append(tbody);
    printDocument.body.append(table);
  }

  private async startPrint(printWindow: Window) {
    printWindow.addEventListener(
      'afterprint',
      () => {
        printWindow.close();
      },
      { once: true },
    );

    printWindow.focus();
    await new Promise<void>((resolve) => {
      printWindow.requestAnimationFrame(() => {
        printWindow.requestAnimationFrame(() => resolve());
      });
    });
    printWindow.print();
  }

  private waitForUiUpdate() {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, UI_WAIT_MS);
    });
  }

  private isVisible(element: Element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }

  private waitForCondition<T>(
    readValue: () => T | null | undefined | false,
    timeoutMs = PAGE_WAIT_MS,
    intervalMs = UI_WAIT_MS,
  ) {
    const startedAt = Date.now();

    return new Promise<T>((resolve, reject) => {
      const poll = () => {
        const value = readValue();
        if (value) {
          resolve(value);
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error('Timed out waiting for AppRoom UI.'));
          return;
        }

        window.setTimeout(poll, intervalMs);
      };

      poll();
    });
  }

  private getListRows() {
    const table = document.querySelector<HTMLTableElement>('table');
    return Array.from(table?.tBodies[0]?.rows ?? []).filter((row): row is HTMLTableRowElement =>
      row instanceof HTMLTableRowElement && this.isVisible(row),
    );
  }

  private findEditButton(scope: ParentNode = document) {
    return Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find((button) => {
      return this.isVisible(button) && normalizeText(button.textContent).includes('Bearbeiten');
    });
  }

  private getActionMenuCandidates(row: HTMLTableRowElement) {
    const buttons = Array.from(row.querySelectorAll<HTMLButtonElement>('button')).filter(
      (button) => !button.disabled && this.isVisible(button),
    );

    const likelyMenuButtons = buttons.filter((button) => {
      const label = normalizeText(button.textContent);
      const title = normalizeText(button.title);
      const ariaLabel = normalizeText(button.getAttribute('aria-label'));

      return (
        title.includes('Aktion') ||
        ariaLabel.includes('Aktion') ||
        button.matches('.dropdown-toggle, .dropdown-btn') ||
        button.querySelector(
          'i.fa-ellipsis-v, i.fa-ellipsis-vertical, i.fa-ellipsis-h, i.fa-bars, i.fa-list',
        ) !== null ||
        label === ''
      );
    });

    return (likelyMenuButtons.length > 0 ? likelyMenuButtons : buttons).reverse();
  }

  private async clickEditAction(row: HTMLTableRowElement) {
    row.scrollIntoView({ block: 'center' });
    await this.waitForUiUpdate();

    const directEditButton = this.findEditButton(row);
    if (directEditButton) {
      directEditButton.click();
      return;
    }

    for (const candidate of this.getActionMenuCandidates(row)) {
      candidate.click();
      await this.waitForUiUpdate();

      const editButton = this.findEditButton(row) ?? this.findEditButton(document);
      if (editButton) {
        editButton.click();
        return;
      }
    }

    throw new Error('Bearbeiten button not found for rental row.');
  }

  private hasRentalPositionList() {
    return document.querySelector(POSITION_ITEM_SELECTOR) !== null;
  }

  private async waitForDetailPage(previousUrl: string) {
    await this.waitForCondition(
      () => (window.location.href !== previousUrl || this.hasRentalPositionList() ? true : null),
      PAGE_WAIT_MS,
    );

    await this.waitForCondition(() => (this.hasRentalPositionList() ? true : null), PAGE_WAIT_MS);
  }

  private getNumericFieldValue(scope: ParentNode, fieldName: string, label: string) {
    return (
      normalizeText(
        scope
          .querySelector<HTMLInputElement>(`span[name="${fieldName}"] input`)
          ?.getAttribute('aria-valuenow'),
      ) || getAppRoomFieldValue(scope, label)
    );
  }

  private formatNameColumn(name: string, height: string, weight: string) {
    const formattedHeight = height ? `${height}cm` : '';
    const formattedWeight = weight ? `${weight}kg` : '';
    return [name, formattedHeight, formattedWeight].filter(Boolean).join(' / ');
  }

  private getCustomerName() {
    const customerFieldset = getAppRoomFieldsetByLabel(document, 'Kunde');
    const customerValue = getAppRoomMultiselectValue(customerFieldset);
    if (customerValue) {
      return customerValue.split(',')[0]?.trim() ?? customerValue;
    }

    const companyText = normalizeText(
      document.querySelector<HTMLElement>('[title^="Firma:"] .medium-text')?.textContent,
    );

    if (companyText) {
      return companyText;
    }

    const companyTitle = normalizeText(document.querySelector<HTMLElement>('[title^="Firma:"]')?.title);
    if (companyTitle) {
      return companyTitle.replace(/^Firma:\s*/, '').trim();
    }

    return '';
  }

  private async expandDetailPositions() {
    for (const item of this.getDetailPositionItems()) {
      const expandButton = item
        .querySelector<HTMLElement>('.pos-arrow button i.fa-chevron-down')
        ?.closest<HTMLButtonElement>('button');

      if (!expandButton) {
        continue;
      }

      expandButton.click();
      await this.waitForUiUpdate();
    }
  }

  private getDetailPositionItems() {
    return Array.from(document.querySelectorAll<HTMLElement>(POSITION_ITEM_SELECTOR));
  }

  private readDetailPosition(item: HTMLElement): DetailPosition {
    return {
      rentalArticle: getAppRoomMultiselectValue(getAppRoomFieldsetByLabel(item, 'Mietartikel')),
      name:
        normalizeText(item.querySelector<HTMLInputElement>('input[name="rental.object.fields.name"]')?.value) ||
        getAppRoomFieldValue(item, 'Name'),
      height: this.getNumericFieldValue(item, 'rental.object.fields.size', 'Körpergrösse'),
      weight: this.getNumericFieldValue(item, 'rental.object.fields.weight', 'Gewicht'),
    };
  }

  private detailPositionToPrintRow(customerName: string, position: DetailPosition): PrintRow | null {
    const nameColumn = this.formatNameColumn(position.name, position.height, position.weight);
    if (!position.rentalArticle && !nameColumn) {
      return null;
    }

    return [
      { key: 'customer', value: customerName },
      { key: 'rentalArticle', value: position.rentalArticle },
      { key: 'name', value: nameColumn },
    ];
  }

  private extractDetailRows() {
    const customerName = this.getCustomerName();
    const rows: PrintRow[] = [];

    for (const item of this.getDetailPositionItems()) {
      const row = this.detailPositionToPrintRow(customerName, this.readDetailPosition(item));
      if (row) {
        rows.push(row);
      }
    }

    return rows;
  }

  private async returnToListPage(listUrl: string) {
    window.history.back();

    await this.waitForCondition(() => {
      if (window.location.href === listUrl && this.getListRows().length > 0) {
        return true;
      }

      return this.getListRows().length > 0 && !this.hasRentalPositionList() ? true : null;
    }, PAGE_WAIT_MS);

    await this.waitForUiUpdate();
  }

  private async collectPrintableRowsFromDetails() {
    const listUrl = window.location.href;
    const initialRows = this.getListRows();

    if (initialRows.length === 0) {
      window.alert('Keine Tabelle gefunden.');
      return [];
    }

    const groups: PrintRentalGroup[] = [];

    for (let rowIndex = 0; rowIndex < initialRows.length; rowIndex += 1) {
      const currentRow = await this.waitForCondition(() => this.getListRows()[rowIndex], PAGE_WAIT_MS);
      const previousUrl = window.location.href;

      await this.clickEditAction(currentRow);
      await this.waitForDetailPage(previousUrl);
      await this.expandDetailPositions();
      const rows = this.extractDetailRows();
      if (rows.length > 0) {
        groups.push({
          color: RENTAL_GROUP_COLORS[rowIndex % RENTAL_GROUP_COLORS.length],
          rows,
        });
      }
      await this.returnToListPage(listUrl);
    }

    return groups;
  }

  private async handlePrintClick() {
    if (this.isPrinting) {
      return;
    }

    this.isPrinting = true;

    try {
      const groups = await this.collectPrintableRowsFromDetails();
      if (groups.length === 0) {
        window.alert('Keine druckbaren Werte gefunden.');
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        window.alert('Druckfenster konnte nicht geöffnet werden.');
        return;
      }

      this.renderPrintPreview(printWindow, groups);
      await this.startPrint(printWindow);
    } catch (error) {
      console.error(error);
      window.alert('Druckdaten konnten nicht aus den Reservierungsdetails gelesen werden.');
    } finally {
      this.isPrinting = false;
    }
  }
}
