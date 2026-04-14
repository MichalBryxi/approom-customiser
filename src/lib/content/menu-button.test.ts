import { syncPrintButton } from './menu-button';

describe('syncPrintButton', () => {
  it('adds the print button once and reuses it on later syncs', () => {
    document.body.innerHTML = `
      <span>
        <button type="button" class="btn btn-secondary">Zeitachse</button>
        <button type="button" class="btn btn-secondary">Vorbereiten</button>
      </span>
    `;

    const first = syncPrintButton(true, () => undefined);
    const second = syncPrintButton(true, () => undefined);

    expect(first).toBeInstanceOf(HTMLButtonElement);
    expect(second).toBe(first);
    expect(document.querySelectorAll('[data-app-room-print-button="true"]')).toHaveLength(1);
    expect(first?.nextElementSibling?.textContent).toContain('Zeitachse');
  });

  it('removes the print button when the feature is disabled', () => {
    document.body.innerHTML = `
      <span>
        <button type="button" data-app-room-print-button="true">Drucken</button>
        <button type="button" class="btn btn-secondary">Zeitachse</button>
      </span>
    `;

    syncPrintButton(false, () => undefined);

    expect(document.querySelector('[data-app-room-print-button="true"]')).toBeNull();
  });

  it('does not inject anything when the toolbar anchor is missing', () => {
    document.body.innerHTML = `
      <span>
        <button type="button" class="btn btn-secondary">Vorbereiten</button>
      </span>
    `;

    const result = syncPrintButton(true, () => undefined);

    expect(result).toBeNull();
    expect(document.querySelector('[data-app-room-print-button="true"]')).toBeNull();
  });
});
