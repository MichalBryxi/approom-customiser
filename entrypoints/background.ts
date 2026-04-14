import { defineBackground } from '#imports';

export default defineBackground({
  type: 'module',
  main() {
    const bootstrapExtension = async () => {
      const { ensureDefaultSettings } = await import('../src/lib/settings');

      await Promise.all([
        chrome.storage.session.setAccessLevel({
          accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS',
        }),
        ensureDefaultSettings(),
      ]);
    };

    chrome.runtime.onInstalled.addListener(() => {
      void bootstrapExtension();
    });

    chrome.runtime.onStartup.addListener(() => {
      void bootstrapExtension();
    });

    void bootstrapExtension();
  },
});
