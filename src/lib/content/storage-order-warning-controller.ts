import { CHECK_IN_STATUS_COLORS } from '../check-in-status-colors';
import { getColumnIndex } from './dom';

const WARNING_ROW_ATTRIBUTE = 'data-app-room-check-in-warning';
const COMPLETE_ROW_ATTRIBUTE = 'data-app-room-check-in-complete';

function parseNumericInputValue(input: HTMLInputElement | null) {
  const parsed = Number(input?.value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function setRowState(row: HTMLTableRowElement, state: 'warning' | 'complete' | 'clear') {
  const color =
    state === 'warning'
      ? CHECK_IN_STATUS_COLORS.warning
      : state === 'complete'
        ? CHECK_IN_STATUS_COLORS.complete
        : '';

  row.toggleAttribute(WARNING_ROW_ATTRIBUTE, state === 'warning');
  row.toggleAttribute(COMPLETE_ROW_ATTRIBUTE, state === 'complete');
  row.style.backgroundColor = color;

  Array.from(row.cells).forEach((cell) => {
    cell.style.backgroundColor = color;
  });
}

export class StorageOrderWarningController {
  private boundTable: HTMLTableElement | null = null;

  sync(enabled: boolean) {
    if (!enabled) {
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

  private getInputFromColumn(row: HTMLTableRowElement, columnIndex: number) {
    if (columnIndex < 0) {
      return null;
    }

    return row.cells.item(columnIndex)?.querySelector<HTMLInputElement>('input') ?? null;
  }

  private updateWarnings(table: HTMLTableElement) {
    const orderedColumnIndex = getColumnIndex(table, 'Anzahl bestellt');
    const checkedInColumnIndex = getColumnIndex(table, 'Anzahl eingebucht');
    const pendingColumnIndex = getColumnIndex(table, 'Anzahl einbuchen');

    Array.from(table.tBodies[0]?.rows ?? []).forEach((row) => {
      if (!(row instanceof HTMLTableRowElement)) {
        return;
      }

      const ordered = parseNumericInputValue(this.getInputFromColumn(row, orderedColumnIndex));
      const checkedIn = parseNumericInputValue(this.getInputFromColumn(row, checkedInColumnIndex));
      const pending = parseNumericInputValue(this.getInputFromColumn(row, pendingColumnIndex));
      const totalAfterCheckIn = checkedIn + pending;

      if (checkedIn >= ordered) {
        setRowState(row, 'clear');
        return;
      }

      if (totalAfterCheckIn < ordered) {
        setRowState(row, 'warning');
        return;
      }

      if (totalAfterCheckIn === ordered) {
        setRowState(row, 'complete');
        return;
      }

      setRowState(row, 'clear');
    });
  }
}
