const ROOT_SELECTOR = '[data-app-room-barcode-check-in="true"]';
const START_BUTTON_SELECTOR = '[data-app-room-barcode-check-in-start="true"]';
const ACTIVE_CONTROLS_SELECTOR = '[data-app-room-barcode-check-in-active="true"]';
const INPUT_SELECTOR = '[data-app-room-barcode-check-in-input="true"]';
const SCAN_DELAY_MS = 500;
const CURRENT_ORDER_HEADING_ID = 'panel_current_order_step2';

function normalizeText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeBarcode(value: string | null | undefined) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function setInputValue(input: HTMLInputElement, value: number | string) {
  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function syncCheckboxState(checkbox: HTMLInputElement, checked: boolean) {
  const wrapper = checkbox.parentElement;
  if (wrapper?.classList.contains('icheckbox_square-green')) {
    wrapper.classList.toggle('checked', checked);
  }
}

function isEditableInput(input: HTMLInputElement | null) {
  return Boolean(input) && !input.readOnly && !input.disabled;
}

function isCurrentOrderHeading(element: HTMLElement | null | undefined) {
  return Boolean(element) && normalizeText(element?.textContent).includes('Aktuelle Bestellung ID');
}

function getCurrentOrderHeading() {
  const headingById = document.getElementById(CURRENT_ORDER_HEADING_ID);
  if (headingById instanceof HTMLElement && isCurrentOrderHeading(headingById)) {
    return headingById;
  }

  return (
    Array.from(document.querySelectorAll<HTMLElement>('.panel-heading.hbuilt')).find(
      isCurrentOrderHeading,
    ) ?? null
  );
}

export class BarcodeCheckInController {
  private sessionActive = false;

  private scanTimeout: number | null = null;

  sync(enabled: boolean, mountTarget = getCurrentOrderHeading()) {
    if (!enabled) {
      this.reset();
      this.removeControls();
      return;
    }

    if (!mountTarget) {
      return;
    }

    const root = this.ensureControls(mountTarget);
    this.updateMode(root);
  }

  reset() {
    this.sessionActive = false;
    this.clearScanTimeout();
  }

  private clearScanTimeout() {
    if (this.scanTimeout !== null) {
      window.clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }

  private removeControls() {
    document.querySelectorAll<HTMLElement>(ROOT_SELECTOR).forEach((element) => element.remove());
  }

  private ensureControls(mountTarget: HTMLElement) {
    const [existing, ...duplicates] = Array.from(
      document.querySelectorAll<HTMLDivElement>(ROOT_SELECTOR),
    );

    duplicates.forEach((element) => element.remove());

    if (existing) {
      if (existing.parentElement !== mountTarget) {
        mountTarget.append(existing);
      }

      return existing;
    }

    const root = document.createElement('div');
    root.dataset.appRoomBarcodeCheckIn = 'true';
    root.style.display = 'inline-flex';
    root.style.alignItems = 'center';
    root.style.flexWrap = 'wrap';
    root.style.gap = '8px';
    root.style.margin = '0 0 0 12px';
    root.style.verticalAlign = 'middle';

    const startButton = document.createElement('button');
    startButton.type = 'button';
    startButton.className = 'btn btn-primary';
    startButton.dataset.appRoomBarcodeCheckInStart = 'true';

    const icon = document.createElement('i');
    icon.className = 'fal fa-barcode';
    icon.setAttribute('aria-hidden', 'true');
    startButton.append(icon, document.createTextNode(' Per Barcode einbuchen'));
    startButton.addEventListener('click', this.handleStartClick);

    const activeControls = document.createElement('div');
    activeControls.dataset.appRoomBarcodeCheckInActive = 'true';
    activeControls.style.display = 'none';
    activeControls.style.alignItems = 'center';
    activeControls.style.flexWrap = 'wrap';
    activeControls.style.gap = '8px';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control input-sm';
    input.dataset.appRoomBarcodeCheckInInput = 'true';
    input.placeholder = 'Barcode scannen';
    input.autocomplete = 'off';
    input.style.width = '220px';
    input.addEventListener('input', this.handleScanInput);

    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'btn btn-success';
    confirmButton.dataset.appRoomBarcodeCheckInConfirm = 'true';
    confirmButton.textContent = 'Einbuchen bestätigen';
    confirmButton.addEventListener('click', this.handleConfirmClick);

    activeControls.append(input, confirmButton);
    root.append(startButton, activeControls);
    mountTarget.append(root);
    return root;
  }

  private updateMode(root: HTMLElement) {
    const startButton = root.querySelector<HTMLButtonElement>(START_BUTTON_SELECTOR);
    const activeControls = root.querySelector<HTMLElement>(ACTIVE_CONTROLS_SELECTOR);

    if (startButton) {
      startButton.style.display = this.sessionActive ? 'none' : '';
    }

    if (activeControls) {
      activeControls.style.display = this.sessionActive ? 'flex' : 'none';
    }
  }

  private readonly handleStartClick = (event: MouseEvent) => {
    event.preventDefault();
    this.zeroEditableCheckInInputs();
    this.sessionActive = true;
    this.sync(true);
    this.getScannerInput()?.focus();
  };

  private readonly handleScanInput = () => {
    this.clearScanTimeout();

    this.scanTimeout = window.setTimeout(() => {
      this.scanTimeout = null;
      this.processScannedBarcode();
    }, SCAN_DELAY_MS);
  };

  private readonly handleConfirmClick = (event: MouseEvent) => {
    event.preventDefault();
    this.clearScanTimeout();
    this.confirmCheckInSelection();
    this.sessionActive = false;
    const input = this.getScannerInput();
    if (input) {
      input.value = '';
    }
    this.sync(true);
  };

  private getScannerInput() {
    return document.querySelector<HTMLInputElement>(INPUT_SELECTOR);
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

  private getOrderRows() {
    const table = this.getOrderTable();
    if (!table) {
      return [];
    }

    return Array.from(table.tBodies[0]?.rows ?? []).filter((row): row is HTMLTableRowElement =>
      row instanceof HTMLTableRowElement,
    );
  }

  private getInputFromColumn(row: HTMLTableRowElement, columnLabel: string) {
    const table = row.closest('table');
    if (!(table instanceof HTMLTableElement)) {
      return null;
    }

    const columnIndex = this.getColumnIndex(table, columnLabel);
    if (columnIndex < 0) {
      return null;
    }

    return row.cells.item(columnIndex)?.querySelector<HTMLInputElement>('input') ?? null;
  }

  private getCheckboxFromRow(row: HTMLTableRowElement) {
    const table = row.closest('table');
    if (!(table instanceof HTMLTableElement)) {
      return null;
    }

    const columnIndex = this.getColumnIndex(table, 'Eingebucht');
    if (columnIndex < 0) {
      return null;
    }

    return (
      row.cells.item(columnIndex)?.querySelector<HTMLInputElement>('input[type="checkbox"]') ?? null
    );
  }

  private zeroEditableCheckInInputs() {
    for (const row of this.getOrderRows()) {
      const input = this.getInputFromColumn(row, 'Anzahl einbuchen');
      if (!isEditableInput(input)) {
        continue;
      }

      setInputValue(input, 0);
    }
  }

  private scoreRowBarcodeMatch(row: HTMLTableRowElement, scannedBarcode: string) {
    const table = row.closest('table');
    if (!(table instanceof HTMLTableElement)) {
      return 0;
    }

    const columnIndex = this.getColumnIndex(table, 'Barcode');
    if (columnIndex < 0) {
      return 0;
    }

    const barcodeCell = row.cells.item(columnIndex);
    const barcodeText = normalizeText(barcodeCell?.textContent);
    const normalizedWholeCell = normalizeBarcode(barcodeText);
    const tokens = barcodeText
      .split(/\s+/)
      .map((token) => normalizeBarcode(token))
      .filter(Boolean);

    for (const token of tokens) {
      if (token === scannedBarcode) {
        return 100;
      }
    }

    for (const token of tokens) {
      if (token.includes(scannedBarcode) || scannedBarcode.includes(token)) {
        return 50;
      }
    }

    if (
      normalizedWholeCell &&
      (normalizedWholeCell.includes(scannedBarcode) || scannedBarcode.includes(normalizedWholeCell))
    ) {
      return 25;
    }

    return 0;
  }

  private processScannedBarcode() {
    if (!this.sessionActive) {
      return;
    }

    const input = this.getScannerInput();
    const scannedBarcode = normalizeBarcode(input?.value);
    if (!input || !scannedBarcode) {
      return;
    }

    const matchingRow = this.getOrderRows()
      .map((row) => ({
        row,
        score: this.scoreRowBarcodeMatch(row, scannedBarcode),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)[0]?.row;

    if (!matchingRow) {
      window.alert(`Kein passender Artikel für den Barcode "${input.value}" gefunden.`);
      input.select();
      return;
    }

    const quantityInput = this.getInputFromColumn(matchingRow, 'Anzahl einbuchen');
    if (!isEditableInput(quantityInput)) {
      window.alert(`Der Artikel für den Barcode "${input.value}" kann nicht eingebucht werden.`);
      input.select();
      return;
    }

    const nextValue = Number(quantityInput.value || '0') + 1;
    setInputValue(quantityInput, nextValue);
    input.value = '';
    input.focus();
  }

  private confirmCheckInSelection() {
    for (const row of this.getOrderRows()) {
      const quantityInput = this.getInputFromColumn(row, 'Anzahl einbuchen');
      if (!isEditableInput(quantityInput) || Number(quantityInput.value || '0') <= 0) {
        continue;
      }

      const checkbox = this.getCheckboxFromRow(row);
      if (!checkbox || checkbox.disabled || checkbox.checked) {
        continue;
      }

      checkbox.click();
      if (!checkbox.checked) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }

      syncCheckboxState(checkbox, true);
    }
  }
}
