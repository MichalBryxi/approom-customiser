type PrintQuantitySnapshot = Array<{
  artId: string;
  quantity: string;
}>;

function normalizeText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function buildPrintQueue(snapshot: PrintQuantitySnapshot) {
  const queue = new Map<string, string[]>();

  for (const entry of snapshot) {
    const existing = queue.get(entry.artId) ?? [];
    existing.push(entry.quantity);
    queue.set(entry.artId, existing);
  }

  return queue;
}

function setInputValue(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export class StorageOrderLabelPrintController {
  private boundButton: HTMLButtonElement | null = null;

  private modalObserver: MutationObserver | null = null;

  private applyTimeout: number | null = null;

  private pendingSnapshot: PrintQuantitySnapshot | null = null;

  sync(enabled: boolean) {
    if (!enabled) {
      this.detachButtonListener();
      this.clearPendingApply();
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
    if (this.modalObserver) {
      this.modalObserver.disconnect();
      this.modalObserver = null;
    }

    if (this.applyTimeout !== null) {
      window.clearTimeout(this.applyTimeout);
      this.applyTimeout = null;
    }

    this.pendingSnapshot = null;
  }

  private getOrderTable() {
    return document.querySelector<HTMLTableElement>('#bestell_artikel');
  }

  private getColumnIndex(table: HTMLTableElement, headerLabel: string) {
    const headers = Array.from(table.tHead?.querySelectorAll('th') ?? []);
    const normalizedHeaderLabel = normalizeText(headerLabel).toLowerCase();

    return headers.findIndex(
      (header) => normalizeText(header.textContent).toLowerCase() === normalizedHeaderLabel,
    );
  }

  private capturePrintQuantitySnapshot(): PrintQuantitySnapshot {
    const table = this.getOrderTable();
    if (!table) {
      return [];
    }

    const pendingColumnIndex = this.getColumnIndex(table, 'Anzahl einbuchen');

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

    if (this.tryApplyPendingSnapshot()) {
      return;
    }

    if (this.modalObserver) {
      this.modalObserver.disconnect();
    }

    this.modalObserver = new MutationObserver(() => {
      this.tryApplyPendingSnapshot();
    });

    this.modalObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    if (this.applyTimeout !== null) {
      window.clearTimeout(this.applyTimeout);
    }

    this.applyTimeout = window.setTimeout(() => {
      this.clearPendingApply();
    }, 3000);
  }

  private tryApplyPendingSnapshot() {
    if (!this.pendingSnapshot) {
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

    this.clearPendingApply();
    return true;
  }
}
