import { normalizeText } from '../text';
import { getColumnIndex, setInputValue } from './dom';

type PrintQuantitySnapshot = Array<{
  artId: string;
  quantity: string;
}>;

function buildPrintQueue(snapshot: PrintQuantitySnapshot) {
  const queue = new Map<string, string[]>();

  for (const entry of snapshot) {
    const existing = queue.get(entry.artId) ?? [];
    existing.push(entry.quantity);
    queue.set(entry.artId, existing);
  }

  return queue;
}

export class StorageOrderLabelPrintController {
  private boundButton: HTMLButtonElement | null = null;

  private applyInterval: number | null = null;

  private applyDeadlineTimeout: number | null = null;

  private pendingSnapshot: PrintQuantitySnapshot | null = null;

  sync(enabled: boolean) {
    if (!enabled) {
      return;
    }

    const button = document.querySelector<HTMLButtonElement>('#etiketten_button');
    if (!button) {
      return;
    }

    this.bindButtonListener(button);
  }

  private readonly handleButtonClick = () => {
    this.pendingSnapshot = this.capturePrintQuantitySnapshot();
    this.scheduleModalApply();
  };

  private bindButtonListener(button: HTMLButtonElement) {
    if (this.boundButton === button) {
      return;
    }

    this.detachButtonListener();
    this.boundButton = button;
    this.boundButton.addEventListener('click', this.handleButtonClick);
  }

  private detachButtonListener() {
    if (!this.boundButton) {
      return;
    }

    this.boundButton.removeEventListener('click', this.handleButtonClick);
    this.boundButton = null;
  }

  private clearPendingApply() {
    if (this.applyInterval !== null) {
      if (typeof window !== 'undefined') {
        window.clearInterval(this.applyInterval);
      }
      this.applyInterval = null;
    }

    if (this.applyDeadlineTimeout !== null) {
      if (typeof window !== 'undefined') {
        window.clearTimeout(this.applyDeadlineTimeout);
      }
      this.applyDeadlineTimeout = null;
    }

    this.pendingSnapshot = null;
  }

  private getOrderTable() {
    return document.querySelector<HTMLTableElement>('#bestell_artikel');
  }

  private capturePrintQuantitySnapshot(): PrintQuantitySnapshot {
    const table = this.getOrderTable();
    if (!table) {
      return [];
    }

    const pendingColumnIndex = getColumnIndex(table, 'Anzahl einbuchen');

    return Array.from(table.tBodies[0]?.rows ?? [])
      .filter((row): row is HTMLTableRowElement => row instanceof HTMLTableRowElement)
      .map((row) => ({
        artId: normalizeText(
          row.querySelector<HTMLInputElement>('input[name="art_id[]"]')?.value,
        ),
        quantity:
          normalizeText(
            row.cells
              .item(pendingColumnIndex)
              ?.querySelector<HTMLInputElement>('input')
              ?.value,
          ) || '0',
      }))
      .filter((entry) => entry.artId);
  }

  private scheduleModalApply() {
    if (!this.pendingSnapshot) {
      return;
    }

    this.tryApplyPendingSnapshot();

    if (this.applyInterval !== null) {
      window.clearInterval(this.applyInterval);
    }

    this.applyInterval = window.setInterval(() => {
      this.tryApplyPendingSnapshot();
    }, 100);

    if (this.applyDeadlineTimeout !== null) {
      window.clearTimeout(this.applyDeadlineTimeout);
    }

    this.applyDeadlineTimeout = window.setTimeout(() => {
      this.clearPendingApply();
    }, 2000);
  }

  private tryApplyPendingSnapshot() {
    if (!this.pendingSnapshot) {
      return false;
    }

    if (typeof document === 'undefined' || !document.body) {
      this.clearPendingApply();
      return false;
    }

    const modal = document.querySelector<HTMLElement>('#myModal');
    const printRows = Array.from(modal?.querySelectorAll<HTMLElement>('.dd-item.row') ?? []);
    if (!modal || printRows.length === 0) {
      return false;
    }

    const printQueue = buildPrintQueue(this.pendingSnapshot);

    for (const row of printRows) {
      const artId = normalizeText(
        row.querySelector<HTMLInputElement>('.print_art_id')?.value,
      );
      const printCountInput = row.querySelector<HTMLInputElement>('.print_count');
      if (!artId || !printCountInput) {
        continue;
      }

      const quantities = printQueue.get(artId);
      const nextQuantity = quantities?.shift();
      if (typeof nextQuantity === 'undefined') {
        continue;
      }

      setInputValue(printCountInput, nextQuantity);
      if (quantities && quantities.length === 0) {
        printQueue.delete(artId);
      }
    }

    return true;
  }
}
