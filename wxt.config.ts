import { existsSync } from 'node:fs';
import { platform } from 'node:os';

import { defineConfig } from 'wxt';

function getDefaultChromiumBinary() {
  if (process.env.CHROMIUM_BIN) {
    return process.env.CHROMIUM_BIN;
  }

  const candidates =
    platform() === 'darwin'
      ? ['/Applications/Chromium.app/Contents/MacOS/Chromium']
      : ['/usr/bin/chromium', '/usr/bin/chromium-browser'];

  return candidates.find((candidate) => existsSync(candidate));
}

const chromiumBinary = getDefaultChromiumBinary();

export default defineConfig({
  webExt: {
    binaries: chromiumBinary
      ? {
          chromium: chromiumBinary,
        }
      : undefined,
  },
  manifest: {
    name: 'App-Room ERP Enhancer',
    description: 'Enhances the App-Room ERP rental page with configurable workflow helpers.',
    permissions: ['storage'],
    host_permissions: ['https://erp.app-room.ch/rental/*'],
    action: {
      default_title: 'App-Room ERP Enhancer',
      default_popup: 'popup.html',
    },
  },
});
