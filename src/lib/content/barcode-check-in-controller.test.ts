import { vi } from 'vitest';

import { BarcodeCheckInController } from './barcode-check-in-controller';

function currentOrderHeadingHtml() {
  return `
    <div class="panel-heading hbuilt" id="panel_current_order_step2">
      <div class="panel-tools" id="panel_current_order_step3">
        <a class="showhide"><i class="fa fa-chevron-up"></i></a>
      </div>
      &nbsp;Aktuelle Bestellung ID : 313
    </div>
  `;
}

function buildOrderPage({ includeHeading = true } = {}) {
  document.body.innerHTML = `
    ${includeHeading ? currentOrderHeadingHtml() : ''}
    <table id="bestell_artikel" class="table table-condensed table-block">
      <thead>
        <tr>
          <th>Pos.</th>
          <th>Barcode</th>
          <th>Anzahl einbuchen</th>
          <th>Eingebucht</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>1006876<br>5037835215991</td>
          <td>
            <input type="number" name="open[]" value="4">
          </td>
          <td>
            <div class="icheckbox_square-green">
              <input type="checkbox" class="einbuchen" name="art_einbuchen[]" value="0">
            </div>
          </td>
        </tr>
        <tr>
          <td>2</td>
          <td>729239<br>5037835215793</td>
          <td>
            <input type="number" name="open[]" value="3" readonly>
          </td>
          <td>
            <div class="icheckbox_square-green checked disabled">
              <input type="checkbox" class="einbuchen" name="art_einbuchen[]" value="1" checked disabled>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

describe('BarcodeCheckInController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    buildOrderPage();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('injects the start button and toggles it into scan mode', () => {
    const controller = new BarcodeCheckInController();

    controller.sync(true);

    const startButton = document.querySelector<HTMLButtonElement>(
      '[data-app-room-barcode-check-in-start="true"]',
    );
    expect(startButton?.textContent).toContain('Per Barcode einbuchen');

    startButton?.click();

    const quantityInputs = document.querySelectorAll<HTMLInputElement>('input[name="open[]"]');
    expect(quantityInputs[0]?.value).toBe('0');
    expect(quantityInputs[1]?.value).toBe('3');
    expect(startButton?.style.display).toBe('none');
    expect(
      document.querySelector<HTMLElement>('[data-app-room-barcode-check-in-active="true"]')?.style
        .display,
    ).toBe('flex');
  });

  it('mounts the controls inside the current order heading after it appears', () => {
    buildOrderPage({ includeHeading: false });

    const controller = new BarcodeCheckInController();

    controller.sync(true);

    expect(document.querySelector('[data-app-room-barcode-check-in="true"]')).toBeNull();

    document.body.insertAdjacentHTML('afterbegin', currentOrderHeadingHtml());
    controller.sync(true);

    const heading = document.querySelector<HTMLElement>('#panel_current_order_step2');
    const controls = document.querySelector<HTMLElement>('[data-app-room-barcode-check-in="true"]');

    expect(controls).not.toBeNull();
    expect(heading?.contains(controls)).toBe(true);
  });

  it('increments the matching quantity after a debounced barcode scan', () => {
    const controller = new BarcodeCheckInController();
    controller.sync(true);

    document
      .querySelector<HTMLButtonElement>('[data-app-room-barcode-check-in-start="true"]')
      ?.click();

    const scannerInput = document.querySelector<HTMLInputElement>(
      '[data-app-room-barcode-check-in-input="true"]',
    );
    const quantityInput = document.querySelector<HTMLInputElement>('input[name="open[]"]');
    scannerInput!.value = '5037835215991';
    scannerInput?.dispatchEvent(new Event('input', { bubbles: true }));

    vi.advanceTimersByTime(500);

    expect(quantityInput?.value).toBe('1');
    expect(scannerInput?.value).toBe('');
  });

  it('checks rows with positive quantities on confirmation and restores the start button', () => {
    const controller = new BarcodeCheckInController();
    controller.sync(true);

    document
      .querySelector<HTMLButtonElement>('[data-app-room-barcode-check-in-start="true"]')
      ?.click();

    const scannerInput = document.querySelector<HTMLInputElement>(
      '[data-app-room-barcode-check-in-input="true"]',
    );
    scannerInput!.value = '1006876';
    scannerInput?.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(500);

    document
      .querySelector<HTMLButtonElement>('[data-app-room-barcode-check-in-confirm="true"]')
      ?.click();

    const startButton = document.querySelector<HTMLElement>(
      '[data-app-room-barcode-check-in-start="true"]',
    );
    const checkbox = document.querySelector<HTMLInputElement>('input.einbuchen');
    const wrapper = checkbox?.parentElement;

    expect(checkbox?.checked).toBe(true);
    expect(wrapper?.classList.contains('checked')).toBe(true);
    expect(startButton?.style.display).toBe('');
    expect(
      document.querySelector<HTMLElement>('[data-app-room-barcode-check-in-active="true"]')?.style
        .display,
    ).toBe('none');
  });

  it('alerts when the scanned barcode does not match any row', () => {
    const controller = new BarcodeCheckInController();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

    controller.sync(true);
    document
      .querySelector<HTMLButtonElement>('[data-app-room-barcode-check-in-start="true"]')
      ?.click();

    const scannerInput = document.querySelector<HTMLInputElement>(
      '[data-app-room-barcode-check-in-input="true"]',
    );
    scannerInput!.value = '999999999';
    scannerInput?.dispatchEvent(new Event('input', { bubbles: true }));

    vi.advanceTimersByTime(500);

    expect(alertSpy).toHaveBeenCalledWith(
      'Kein passender Artikel für den Barcode "999999999" gefunden.',
    );
  });
});
