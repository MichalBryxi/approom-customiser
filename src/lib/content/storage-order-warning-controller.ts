const WARNING_ROW_ATTRIBUTE = 'data-app-room-check-in-warning';
const WARNING_COLOR = '#f8d7da';

function normalizeText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function parseNumericInputValue(input: HTMLInputElement | null) {
  const parsed = Number(input?.value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function setRowWarningState(row: HTMLTableRowElement, enabled: boolean) {
  row.toggleAttribute(WARNING_ROW_ATTRIBUTE, enabled);
  row.style.backgroundColor = enabled ? WARNING_COLOR : '';

  Array.from(row.cells).forEach((cell) => {
    cell.style.backgroundColor = enabled ? WARNING_COLOR : '';
  });
}

export class StorageOrderWarningController {
  private boundTable: HTMLTableElement | null = null;

  sync(enabled: boolean) {
    if (!enabled) {
      this.detachTableListeners();
      this.clearAllWarnings();
      return;
    }

    const table = document.querySelector<HTMLTableElement>('#bestell_artikel');
    if (!table) {
      return;
    }

    this.bindTableListeners(table);
    this.updateWarnings(table);
  }

  private readonly handleTableInput = () => {
    if (this.boundTable) {
      this.updateWarnings(this.boundTable);
    }
  };

  private bindTableListeners(table: HTMLTableElement) {
    if (this.boundTable === table) {
      return;
    }

    this.detachTableListeners();
    this.boundTable = table;
    this.boundTable.addEventListener('input', this.handleTableInput);
    this.boundTable.addEventListener('change', this.handleTableInput);
  }

  private detachTableListeners() {
    if (!this.boundTable) {
      return;
    }

    this.boundTable.removeEventListener('input', this.handleTableInput);
    this.boundTable.removeEventListener('change', this.handleTableInput);
    this.boundTable = null;
  }

  private clearAllWarnings() {
    document
      .querySelectorAll<HTMLTableRowElement>(`#bestell_artikel tbody tr[${WARNING_ROW_ATTRIBUTE}]`)
      .forEach((row) => {
        setRowWarningState(row, false);
      });
  }

  private getColumnIndex(table: HTMLTableElement, headerLabel: string) {
    const headers = Array.from(table.tHead?.querySelectorAll('th') ?? []);
    const normalizedHeaderLabel = normalizeText(headerLabel).toLowerCase();

    return headers.findIndex(
      (header) => normalizeText(header.textContent).toLowerCase() === normalizedHeaderLabel,
    );
  }

  private getInputFromColumn(row: HTMLTableRowElement, columnIndex: number) {
    if (columnIndex < 0) {
      return null;
    }

    return row.cells.item(columnIndex)?.querySelector<HTMLInputElement>('input') ?? null;
  }

  private updateWarnings(table: HTMLTableElement) {
    const orderedColumnIndex = this.getColumnIndex(table, 'Anzahl bestellt');
    const checkedInColumnIndex = this.getColumnIndex(table, 'Anzahl eingebucht');
    const pendingColumnIndex = this.getColumnIndex(table, 'Anzahl einbuchen');

    Array.from(table.tBodies[0]?.rows ?? []).forEach((row) => {
      if (!(row instanceof HTMLTableRowElement)) {
        return;
      }

      const ordered = parseNumericInputValue(this.getInputFromColumn(row, orderedColumnIndex));
      const checkedIn = parseNumericInputValue(this.getInputFromColumn(row, checkedInColumnIndex));
      const pending = parseNumericInputValue(this.getInputFromColumn(row, pendingColumnIndex));

      setRowWarningState(row, pending < ordered + checkedIn);
    });
  }
}
