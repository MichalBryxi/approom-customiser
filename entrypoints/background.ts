import { defineBackground } from '#imports';
import { storage } from 'wxt/utils/storage';
import { STORAGE_KEY } from '../src/lib/content/registration-to-rental-automation';

const RESULT_URL_FILTER = {
  url: [{ pathEquals: '/customer_registration/result', hostEquals: 'erp.app-room.ch' }],
} as const;

export default defineBackground({
  type: 'module',
  main() {
    // Redirect from the customer-registration result page to the rental page.
    // Done in background because wxt:locationchange does not fire for this
    // Angular SPA navigation. Two listeners are needed:
    //   onCompleted        — full HTTP page load (form POSTed to server)
    //   onHistoryStateUpdated — SPA pushState navigation (Angular router)
    const handleResultPage = async (details: chrome.webNavigation.WebNavigationFramedCallbackDetails) => {
      console.log('[bg] result page detected via', details.type ?? 'navigation', 'tab =', details.tabId, 'frame =', details.frameId);
      const state = await storage.getItem(STORAGE_KEY);
      if (!state) {
        console.log('[bg] no rental state in storage, skipping redirect');
        return;
      }
      console.log('[bg] rental state found, redirecting tab to /rental/rent');
      await chrome.tabs.update(details.tabId, { url: 'https://erp.app-room.ch/rental/rent' });
    };

    chrome.webNavigation.onCompleted.addListener(handleResultPage, RESULT_URL_FILTER);
    chrome.webNavigation.onHistoryStateUpdated.addListener(handleResultPage, RESULT_URL_FILTER);

    const setSessionAccessLevel = () =>
      chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });

    chrome.runtime.onInstalled.addListener(() => { void setSessionAccessLevel(); });
    chrome.runtime.onStartup.addListener(() => { void setSessionAccessLevel(); });
    void setSessionAccessLevel();

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      void (async () => {
        const { isSavePrintJobMessage, savePrintJobFromBackground } = await import('../src/lib/print-job');
        if (!isSavePrintJobMessage(message)) {
          sendResponse(undefined);
          return;
        }

        await savePrintJobFromBackground(message.payload);
        sendResponse({ ok: true });
      })();

      return true;
    });

  },
});
