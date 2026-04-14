# App-Room ERP Enhancer

Chromium extension for `https://erp.app-room.ch/rental/rent` that injects configurable workflow helpers into the App-Room ERP rental page.

## Current feature

- `rentalPrintButton`: adds a `Drücken` action to the row menu and prints the clicked row's currently visible columns as plain `key: value` lines.

## Stack

- WXT
- TypeScript
- Chromium / Chrome Manifest V3
- Vitest

## Local development

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the WXT dev workflow:

   ```bash
   CHROMIUM_BIN="/Applications/Chromium.app/Contents/MacOS/Chromium" pnpm dev
   ```

   WXT targets `chromium` for local development. Set `CHROMIUM_BIN` to your local Chromium executable so WXT opens Chromium instead of falling back to Chrome.

   On Linux, this is often one of:

   ```bash
   CHROMIUM_BIN="/usr/bin/chromium" pnpm dev
   CHROMIUM_BIN="/usr/bin/chromium-browser" pnpm dev
   ```

3. Or create a Chromium-targeted build output:

   ```bash
   pnpm build:chromium
   ```

4. For Chrome Web Store packaging, keep using the Chrome-family build:

   ```bash
   pnpm build
   ```

5. Open the Extensions page in Chromium with `chrome://extensions`.
6. Enable `Developer mode`.
7. Click `Load unpacked`.
8. Select `.output/chromium-mv3` when using `pnpm dev` or `pnpm build:chromium`.
9. Select `.output/chrome-mv3` when using `pnpm build`.
10. After rebuilding, click the extension's `Reload` button in the Extensions page.

## Testing

Run unit tests with:

```bash
pnpm test
```

## Packaging for the Chrome Web Store

1. Increase the version in `package.json`.
2. Build the Chrome Web Store ZIP package:

   ```bash
   pnpm zip
   ```

3. Upload the generated archive from `.output/*/*.zip` to the Chrome Web Store dashboard.

If you want a Chromium-named ZIP for side-loading or non-store distribution:

```bash
pnpm zip:chromium
```

Optional WXT submit helpers:

```bash
pnpm submit:init
pnpm submit
```

## Manual verification checklist

- Fresh install shows the popup checkbox enabled by default.
- On `https://erp.app-room.ch/rental/rent`, opening a row action menu shows one `Drücken` button.
- Clicking `Drücken` opens the extension print page and then Chrome's print dialog.
- Disabling the feature in the popup suppresses the injected button without reinstalling.

## Chrome Web Store assets still needed outside this repo

- Store listing description text
- Screenshots
- Promo graphics if desired
- Final branded icons if you want custom store and toolbar branding
