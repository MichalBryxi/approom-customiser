import { syncPrintButton } from './menu-button';
import type { PrintRow } from '../types';

const UI_WAIT_MS = 150;
const PAGE_WAIT_MS = 10000;
const PRINT_DELAY_MS = 50;
const POSITION_ITEM_SELECTOR = '.list-group.mb-2 > .list-group-item';

type DetailPosition = {
  rentalArticle: string;
  name: string;
  height: string;
  weight: string;
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

  private renderPrintPreview(printWindow: Window, rows: PrintRow[]) {
    printWindow.document.title = 'Druckvorschau';
    const style = printWindow.document.createElement('style');
    style.textContent = '@page { size: landscape; }';
    printWindow.document.head.append(style);
    printWindow.document.body.innerHTML = '';
    printWindow.document.body.style.margin = '12px';
    printWindow.document.body.style.fontFamily =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    printWindow.document.body.style.fontSize = '20px';
    printWindow.document.body.style.fontWeight = '700';
    const table = printWindow.document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    const tbody = printWindow.document.createElement('tbody');

    for (const row of rows) {
      const tr = printWindow.document.createElement('tr');

      for (const cell of row) {
        const td = printWindow.document.createElement('td');
        td.textContent = cell.value;
        td.style.border = '1px solid #d1d5db';
        td.style.padding = '18px 10px';
        td.style.verticalAlign = 'top';
        tr.append(td);
      }

      tbody.append(tr);
    }

    table.append(tbody);
    printWindow.document.body.append(table);
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
    }, PRINT_DELAY_MS);
  }

  private waitForUiUpdate() {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, UI_WAIT_MS);
    });
  }

  private normalizeText(value: string | null | undefined) {
    return value?.replace(/\s+/g, ' ').trim() ?? '';
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
      return this.isVisible(button) && this.normalizeText(button.textContent).includes('Bearbeiten');
    });
  }

  private getActionMenuCandidates(row: HTMLTableRowElement) {
    const buttons = Array.from(row.querySelectorAll<HTMLButtonElement>('button')).filter(
      (button) => !button.disabled && this.isVisible(button),
    );

    const likelyMenuButtons = buttons.filter((button) => {
      const label = this.normalizeText(button.textContent);
      const title = this.normalizeText(button.title);
      const ariaLabel = this.normalizeText(button.getAttribute('aria-label'));

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

  private getLegendLabel(legend: HTMLLegendElement | null) {
    return this.normalizeText(legend?.textContent).replace(/\*/g, '').trim();
  }

  private getFieldsetByLabel(scope: ParentNode, label: string) {
    const candidates: Array<{ fieldset: HTMLFieldSetElement; label: string }> = [];

    for (const fieldset of scope.querySelectorAll<HTMLFieldSetElement>('fieldset')) {
      candidates.push({
        fieldset,
        label: this.getLegendLabel(fieldset.querySelector('legend')),
      });
    }

    for (const legend of scope.querySelectorAll<HTMLLegendElement>('legend')) {
      const nextElement = legend.nextElementSibling;
      if (nextElement instanceof HTMLFieldSetElement) {
        candidates.push({
          fieldset: nextElement,
          label: this.getLegendLabel(legend),
        });
      }
    }

    const exact = candidates.find((candidate) => candidate.label === label);
    if (exact) {
      return exact.fieldset;
    }

    return candidates.find((candidate) => candidate.label.includes(label))?.fieldset;
  }

  private getMultiselectValue(fieldset: HTMLFieldSetElement | undefined) {
    return this.normalizeText(fieldset?.querySelector<HTMLElement>('.multiselect__single')?.textContent);
  }

  private getInputValue(fieldset: HTMLFieldSetElement | undefined) {
    const input = fieldset?.querySelector<HTMLInputElement>('input');
    return this.normalizeText(input?.value) || this.normalizeText(input?.getAttribute('aria-valuenow'));
  }

  private getFieldValue(scope: ParentNode, label: string) {
    return this.getInputValue(this.getFieldsetByLabel(scope, label));
  }

  private getNumericFieldValue(scope: ParentNode, fieldName: string, label: string) {
    return (
      this.normalizeText(
        scope
          .querySelector<HTMLInputElement>(`span[name="${fieldName}"] input`)
          ?.getAttribute('aria-valuenow'),
      ) || this.getFieldValue(scope, label)
    );
  }

  private formatNameColumn(name: string, height: string, weight: string) {
    const formattedHeight = height ? `${height}cm` : '';
    const formattedWeight = weight ? `${weight}kg` : '';
    return [name, formattedHeight, formattedWeight].filter(Boolean).join(' / ');
  }

  private getCustomerName() {
    const customerFieldset = this.getFieldsetByLabel(document, 'Kunde');
    const customerValue = this.getMultiselectValue(customerFieldset);
    if (customerValue) {
      return customerValue.split(',')[0]?.trim() ?? customerValue;
    }

    const companyText = this.normalizeText(
      document.querySelector<HTMLElement>('[title^="Firma:"] .medium-text')?.textContent,
    );

    if (companyText) {
      return companyText;
    }

    const companyTitle = this.normalizeText(document.querySelector<HTMLElement>('[title^="Firma:"]')?.title);
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
      rentalArticle: this.getMultiselectValue(this.getFieldsetByLabel(item, 'Mietartikel')),
      name:
        this.normalizeText(item.querySelector<HTMLInputElement>('input[name="rental.object.fields.name"]')?.value) ||
        this.getFieldValue(item, 'Name'),
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

    const rows: PrintRow[] = [];

    for (let rowIndex = 0; rowIndex < initialRows.length; rowIndex += 1) {
      const currentRow = await this.waitForCondition(() => this.getListRows()[rowIndex], PAGE_WAIT_MS);
      const previousUrl = window.location.href;

      await this.clickEditAction(currentRow);
      await this.waitForDetailPage(previousUrl);
      await this.expandDetailPositions();
      rows.push(...this.extractDetailRows());
      await this.returnToListPage(listUrl);
    }

    return rows;
  }

  private async handlePrintClick() {
    if (this.isPrinting) {
      return;
    }

    this.isPrinting = true;

    try {
      const rows = await this.collectPrintableRowsFromDetails();
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
    } catch (error) {
      console.error(error);
      window.alert('Druckdaten konnten nicht aus den Reservierungsdetails gelesen werden.');
    } finally {
      this.isPrinting = false;
    }
  }
}
