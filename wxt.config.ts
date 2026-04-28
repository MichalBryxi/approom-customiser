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
  outDir: 'build',
  startUrls: ['https://erp.app-room.ch/rental/rent'],
  webExt: {
    binaries: chromiumBinary
      ? {
          chrome: chromiumBinary,
        }
      : undefined,
  },
  manifest: {
    name: 'AppRoom Customiser',
    description: 'Customises the App-Room ERP interface with configurable workflow helpers.',
    permissions: ['storage'],
    host_permissions: ['https://erp.app-room.ch/*'],
    action: {
      default_title: 'AppRoom Customiser',
      default_popup: 'popup.html',
    },
  },
});
