import { DEFAULT_SETTINGS, ensureDefaultSettings, getSettings } from './settings';

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
    snapshot() {
      return { ...state };
    },
  };
}

describe('settings', () => {
  it('fills in missing defaults without overwriting existing values', async () => {
    const sync = createStorageArea({ rentalPrintButton: false, barcodeCheckIn: false });
    globalThis.chrome = {
      storage: {
        sync,
      },
    } as typeof chrome;

    await ensureDefaultSettings();
    expect(sync.snapshot()).toEqual({ rentalPrintButton: false, barcodeCheckIn: false });
  });

  it('returns defaults when storage is empty', async () => {
    const sync = createStorageArea();
    globalThis.chrome = {
      storage: {
        sync,
      },
    } as typeof chrome;

    await ensureDefaultSettings();
    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });
});
