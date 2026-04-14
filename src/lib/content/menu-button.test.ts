import { syncPrintButton } from './menu-button';

describe('syncPrintButton', () => {
  it('adds the print button once and reuses it on later syncs', () => {
    document.body.innerHTML = `
      <div id="dropdown-right">
        <div>
          <button type="button" class="btn btn-secondary">Original</button>
        </div>
      </div>
    `;

    const menu = document.querySelector('#dropdown-right') as HTMLElement;
    const first = syncPrintButton(menu, true, () => undefined);
    const second = syncPrintButton(menu, true, () => undefined);

    expect(first).toBeInstanceOf(HTMLButtonElement);
    expect(second).toBe(first);
    expect(menu.querySelectorAll('[data-app-room-print-button="true"]')).toHaveLength(1);
  });

  it('removes the print button when the feature is disabled', () => {
    document.body.innerHTML = `
      <div id="dropdown-right">
        <div>
          <button type="button" class="btn btn-secondary">Original</button>
          <button type="button" data-app-room-print-button="true">Drücken</button>
        </div>
      </div>
    `;

    const menu = document.querySelector('#dropdown-right') as HTMLElement;
    syncPrintButton(menu, false, () => undefined);

    expect(menu.querySelector('[data-app-room-print-button="true"]')).toBeNull();
  });
});
