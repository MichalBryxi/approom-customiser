import { syncPrintButton } from './menu-button';
import { extractPrintableRowsFromTable } from '../row-extraction';
import type { PrintRow } from '../types';

export class RentalPrintFeature {
  mount(wrapper: HTMLElement) {
    syncPrintButton(wrapper, (event) => {
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
        td.style.padding = '16px 8px';
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
    }, 50);
  }

  private waitForUiUpdate() {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, 150);
    });
  }

  private getExpandButton(row: HTMLTableRowElement) {
    return row.querySelector<HTMLButtonElement>('td:nth-child(14) button');
  }

  private isCollapsedExpandButton(button: HTMLButtonElement) {
    return button.querySelector('i.fa-chevron-down') !== null;
  }

  private async expandRowsForPrint(table: HTMLTableElement) {
    const rows = Array.from(table.tBodies[0]?.rows ?? []).filter((row): row is HTMLTableRowElement =>
      row instanceof HTMLTableRowElement,
    );

    for (const row of rows) {
      const expandButton = this.getExpandButton(row);
      if (!expandButton || !this.isCollapsedExpandButton(expandButton)) {
        continue;
      }

      expandButton.click();
      await this.waitForUiUpdate();
    }
  }

  private async handlePrintClick() {
    const table = document.querySelector<HTMLTableElement>('table');
    if (!table) {
      window.alert('Keine Tabelle gefunden.');
      return;
    }

    await this.expandRowsForPrint(table);

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
