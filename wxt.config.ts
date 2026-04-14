import { defineConfig } from 'wxt';

export default defineConfig({
  webExt: {
    binaries: process.env.CHROMIUM_BIN
      ? {
          chromium: process.env.CHROMIUM_BIN,
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
