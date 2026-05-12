# Privacy Policy — AppRoom Customiser

_Last updated: 2026-05-07_

## What this extension does

AppRoom Customiser is a browser extension that adds workflow helpers to the App-Room ERP at `erp.app-room.ch`. It operates entirely within your browser.

## Data collection

This extension **does not collect, transmit, or share any personal data**. No analytics, no tracking, no external servers.

## Data storage

The extension stores only the following data, entirely within your browser:

- **Extension settings** (which features are enabled, field configuration) — stored in `chrome.storage.sync` so your preferences are available across your own devices signed in to the same browser profile.
- **Temporary automation state** (customer name and rental duration used during the registration-to-rental workflow) — stored in `chrome.storage.local` and deleted immediately after the workflow completes.

No data is ever sent to any server outside your browser.

## Permissions

- **storage** — to save and read extension settings.
- **webNavigation** — to detect when the App-Room registration page finishes submitting, so the extension can redirect to the rental screen automatically.
- **Host permission for erp.app-room.ch** — to inject the workflow helpers into the App-Room ERP only. No other websites are accessed.

## Contact

Questions? Open an issue on [GitHub](https://github.com/MichalBryxi/approom-customiser).
