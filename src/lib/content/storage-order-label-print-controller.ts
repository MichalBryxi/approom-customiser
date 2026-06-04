import { normalizeText } from '../text';
import { getColumnIndex, setInputValue } from './dom';

const APPLY_BUTTON_ID = 'approom-apply-checkin-qty';

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
  private pendingSnapshot: PrintQuantitySnapshot | null = null;
  private modalObserver: MutationObserver | null = null;

  sync(enabled: boolean) {
    if (!enabled) return;

    const button = document.querySelector<HTMLButtonElement>('#etiketten_button');
    if (!button) return;

    this.bindButtonListener(button);
  }

  private readonly handleButtonClick = () => {
    this.pendingSnapshot = this.capturePrintQuantitySnapshot();
    this.waitForModalAndInjectButton();
  };

  private bindButtonListener(button: HTMLButtonElement) {
    if (this.boundButton === button) return;
    this.detachButtonListener();
    this.boundButton = button;
    this.boundButton.addEventListener('click', this.handleButtonClick);
  }

  private detachButtonListener() {
    if (!this.boundButton) return;
    this.boundButton.removeEventListener('click', this.handleButtonClick);
    this.boundButton = null;
  }

  private getOrderTable() {
    return document.querySelector<HTMLTableElement>('#bestell_artikel');
  }

  private capturePrintQuantitySnapshot(): PrintQuantitySnapshot {
    const table = this.getOrderTable();
    if (!table) return [];

    const pendingColumnIndex = getColumnIndex(table, 'Anzahl einbuchen');

    return Array.from(table.tBodies[0]?.rows ?? [])
      .filter((row): row is HTMLTableRowElement => row instanceof HTMLTableRowElement)
      .map((row) => ({
        artId: normalizeText(row.querySelector<HTMLInputElement>('input[name="art_id[]"]')?.value),
        quantity:
          normalizeText(
            row.cells.item(pendingColumnIndex)?.querySelector<HTMLInputElement>('input')?.value,
          ) || '0',
      }))
      .filter((entry) => entry.artId);
  }

  private waitForModalAndInjectButton() {
    this.modalObserver?.disconnect();
    this.modalObserver = null;

    const tryInject = () => {
      const modal = document.querySelector<HTMLElement>('#myModal');
      const printContent = modal?.querySelector<HTMLElement>('#print_content');
      const headingDiv = printContent?.previousElementSibling as HTMLElement | null;
      if (!headingDiv || !modal.querySelectorAll('.dd-item.row').length) return false;
      if (headingDiv.querySelector(`#${APPLY_BUTTON_ID}`)) return true;

      headingDiv.style.display = 'flex';
      headingDiv.style.alignItems = 'center';
      headingDiv.style.justifyContent = 'space-between';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = APPLY_BUTTON_ID;
      btn.className = 'btn btn-default btn-xs';
      btn.innerHTML = '<i class="fa fa-calculator"></i> Anzahl auf Einbuchmenge setzen';
      btn.addEventListener('click', () => this.applySnapshot());
      headingDiv.append(btn);

      this.annotateRows(modal);
      this.refreshButtonState(btn);
      return true;
    };

    if (tryInject()) return;

    this.modalObserver = new MutationObserver(() => {
      if (tryInject()) {
        this.modalObserver?.disconnect();
        this.modalObserver = null;
      }
    });
    this.modalObserver.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      this.modalObserver?.disconnect();
      this.modalObserver = null;
    }, 5000);
  }

  private annotateRows(modal: HTMLElement) {
    if (!this.pendingSnapshot) return;
    const printQueue = buildPrintQueue(this.pendingSnapshot);

    for (const row of modal.querySelectorAll<HTMLElement>('.dd-item.row')) {
      const artId = normalizeText(row.querySelector<HTMLInputElement>('.print_art_id')?.value);
      const printCountInput = row.querySelector<HTMLInputElement>('.print_count');
      if (!artId || !printCountInput) continue;
      if (printCountInput.nextElementSibling?.classList.contains('approom-target-qty')) continue;

      const quantities = printQueue.get(artId);
      if (!quantities?.length) continue;

      const label = document.createElement('small');
      label.className = 'approom-target-qty';
      label.style.cssText = 'display:block; color:#888; margin-top:2px;';
      label.textContent = `→ ${quantities[0]}`;
      printCountInput.after(label);
    }
  }

  private refreshButtonState(btn: HTMLButtonElement) {
    if (!this.pendingSnapshot) return;

    const modal = document.querySelector<HTMLElement>('#myModal');
    const printRows = Array.from(modal?.querySelectorAll<HTMLElement>('.dd-item.row') ?? []);
    const printQueue = buildPrintQueue(this.pendingSnapshot);

    const alreadyMatches = printRows.every((row) => {
      const artId = normalizeText(row.querySelector<HTMLInputElement>('.print_art_id')?.value);
      const printCountInput = row.querySelector<HTMLInputElement>('.print_count');
      if (!artId || !printCountInput) return true;

      const quantities = printQueue.get(artId);
      if (!quantities?.length) return true;

      return normalizeText(printCountInput.value) === quantities[0];
    });

    btn.disabled = alreadyMatches;
  }

  private applySnapshot() {
    if (!this.pendingSnapshot) return;

    const modal = document.querySelector<HTMLElement>('#myModal');
    const printRows = Array.from(modal?.querySelectorAll<HTMLElement>('.dd-item.row') ?? []);
    const printQueue = buildPrintQueue(this.pendingSnapshot);

    for (const row of printRows) {
      const artId = normalizeText(row.querySelector<HTMLInputElement>('.print_art_id')?.value);
      const printCountInput = row.querySelector<HTMLInputElement>('.print_count');
      if (!artId || !printCountInput) continue;

      const quantities = printQueue.get(artId);
      const nextQuantity = quantities?.shift();
      if (typeof nextQuantity === 'undefined') continue;

      setInputValue(printCountInput, nextQuantity);
      if (quantities?.length === 0) printQueue.delete(artId);
    }

    const btn = document.getElementById(APPLY_BUTTON_ID) as HTMLButtonElement | null;
    if (btn) this.refreshButtonState(btn);
    this.pendingSnapshot = null;
  }
}
