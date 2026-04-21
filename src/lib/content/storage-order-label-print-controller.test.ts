import { vi } from 'vitest';

import { StorageOrderLabelPrintController } from './storage-order-label-print-controller';

function buildOrderPage() {
  document.body.innerHTML = `
    <button id="etiketten_button" type="button">Etikette drucken</button>
    <table id="bestell_artikel" class="table table-condensed table-block">
      <thead>
        <tr>
          <th>Pos.</th>
          <th>Anzahl einbuchen</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <input type="hidden" name="art_id[]" value="1006876">
          </td>
          <td>
            <input type="number" name="open[]" value="0">
          </td>
        </tr>
        <tr>
          <td>
            <input type="hidden" name="art_id[]" value="729239">
          </td>
          <td>
            <input type="number" name="open[]" value="3">
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

function appendModal() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div id="myModal">
      <div class="dd-item row">
        <input class="print_art_id" type="hidden" value="1006876">
        <input class="print_count" type="text" value="4">
      </div>
      <div class="dd-item row">
        <input class="print_art_id" type="hidden" value="729239">
        <input class="print_count" type="text" value="1">
      </div>
    </div>
  `;
  document.body.append(wrapper);
}

describe('StorageOrderLabelPrintController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    buildOrderPage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('replaces modal print counts with the current Anzahl einbuchen values', async () => {
    const controller = new StorageOrderLabelPrintController();
    controller.sync(true);

    document.querySelector<HTMLButtonElement>('#etiketten_button')?.click();
    appendModal();

    await vi.runAllTimersAsync();

    const printCounts = Array.from(
      document.querySelectorAll<HTMLInputElement>('#myModal .print_count'),
    ).map((input) => input.value);

    expect(printCounts).toEqual(['0', '3']);
  });

  it('stops overriding modal counts when the feature is disabled', async () => {
    const controller = new StorageOrderLabelPrintController();
    controller.sync(true);
    controller.sync(false);

    document.querySelector<HTMLButtonElement>('#etiketten_button')?.click();
    appendModal();

    await vi.runAllTimersAsync();

    const printCounts = Array.from(
      document.querySelectorAll<HTMLInputElement>('#myModal .print_count'),
    ).map((input) => input.value);

    expect(printCounts).toEqual(['4', '1']);
  });
});
