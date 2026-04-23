import { vi } from 'vitest';

import { ContentFeatureRuntime, type ContentFeatureDefinition } from './feature-runtime';
import type { ExtensionSettings } from '../types';

const ENABLED_SETTINGS: ExtensionSettings = {
  rentalPrintButton: true,
  barcodeCheckIn: true,
  checkInQuantityWarning: true,
  printLabelsByCheckInQuantity: true,
};

function installChromeStorage(settings: ExtensionSettings) {
  let storageListener:
    | ((
        changes: Record<string, chrome.storage.StorageChange>,
        areaName: string,
      ) => void)
    | null = null;

  vi.stubGlobal('chrome', {
    storage: {
      sync: {
        get: vi.fn(async () => settings),
      },
      onChanged: {
        addListener: vi.fn((listener) => {
          storageListener = listener;
        }),
        removeListener: vi.fn((listener) => {
          if (storageListener === listener) {
            storageListener = null;
          }
        }),
      },
    },
  });

  return {
    emitStorageChange(changes: Record<string, chrome.storage.StorageChange>) {
      storageListener?.(changes, 'sync');
    },
  };
}

function setPath(path: string) {
  history.replaceState({}, '', path);
}

async function flushRuntime() {
  await Promise.resolve();
  await new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
  await Promise.resolve();
}

function buildFeature(sync = vi.fn()): ContentFeatureDefinition {
  return {
    id: 'rentalPrintButton',
    label: 'Rental-Druckbutton',
    url: { pathEquals: '/rental/rent' },
    dom: { selector: 'button', textIncludes: 'Zeitachse' },
    sync,
  };
}

describe('ContentFeatureRuntime', () => {
  let runtime: ContentFeatureRuntime | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    setPath('/');
  });

  afterEach(() => {
    runtime?.stop();
    runtime = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('syncs a feature when its configured URL and DOM target match', async () => {
    installChromeStorage(ENABLED_SETTINGS);
    setPath('/rental/rent');
    const sync = vi.fn();
    runtime = new ContentFeatureRuntime([buildFeature(sync)]);

    runtime.start();
    await flushRuntime();

    expect(sync).toHaveBeenLastCalledWith(false);

    const button = document.createElement('button');
    button.textContent = 'Zeitachse';
    document.body.append(button);
    await flushRuntime();

    expect(sync).toHaveBeenLastCalledWith(true);
  });

  it('re-syncs features on URL and storage changes from the central runtime', async () => {
    const storage = installChromeStorage(ENABLED_SETTINGS);
    setPath('/rental/rent');
    document.body.innerHTML = '<button>Zeitachse</button>';
    const sync = vi.fn();
    runtime = new ContentFeatureRuntime([buildFeature(sync)]);

    runtime.start();
    await flushRuntime();

    expect(sync).toHaveBeenLastCalledWith(true);

    history.pushState({}, '', '/rental/other');
    await flushRuntime();

    expect(sync).toHaveBeenLastCalledWith(false);

    history.pushState({}, '', '/rental/rent');
    await flushRuntime();

    expect(sync).toHaveBeenLastCalledWith(true);

    storage.emitStorageChange({
      rentalPrintButton: {
        oldValue: true,
        newValue: false,
      },
    });
    await flushRuntime();

    expect(sync).toHaveBeenLastCalledWith(false);
  });
});
