import { vi } from 'vitest';

import { DEFAULT_SETTINGS } from '../../src/lib/settings';

function createStorageArea(initialValues: Record<string, unknown> = {}) {
  const state = { ...initialValues };

  return {
    async get(keys: string[] | string) {
      const keyList = Array.isArray(keys) ? keys : [keys];
      return keyList.reduce<Record<string, unknown>>((acc, key) => {
        if (key in state) {
          acc[key] = state[key];
        }
        return acc;
      }, {});
    },
    async set(values: Record<string, unknown>) {
      Object.assign(state, values);
    },
  };
}

describe('popup', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = `
      <main class="popup">
        <form id="settings-form" class="popup__form"></form>
      </main>
    `;

    globalThis.chrome = {
      storage: {
        sync: createStorageArea(DEFAULT_SETTINGS),
      },
    } as typeof chrome;
  });

  it('renders all feature toggles into the popup form', async () => {
    await import('./main');
    await Promise.resolve();

    const toggles = document.querySelectorAll('.popup__toggle');

    expect(toggles).toHaveLength(4);
    expect(document.body.textContent).toContain('Rental-Druckbutton');
    expect(document.body.textContent).toContain('Per Barcode einbuchen');
    expect(document.body.textContent).toContain('Warnung bei zu kleiner Einbuchmenge');
    expect(document.body.textContent).toContain('Etiketten nach Einbuchmenge drucken');
  });
});
