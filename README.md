# App-Room ERP Enhancer

Chrome extension for `https://erp.app-room.ch/rental/rent` that injects configurable workflow helpers into the App-Room ERP rental page.

## Current feature

- `rentalPrintButton`: adds a `Drücken` action to the row menu and prints the clicked row's currently visible columns as plain `key: value` lines.

## Stack

- WXT
- TypeScript
- Chrome Manifest V3
- Vitest

## Local development

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the WXT dev workflow:

   ```bash
   pnpm dev
   ```

   `pnpm dev` targets Chromium and should launch Chromium instead of Chrome. By default the repo looks for `/Applications/Chromium.app/Contents/MacOS/Chromium` on macOS and common Chromium paths on Linux.

   If your Chromium binary lives elsewhere, override it explicitly:

   ```bash
   CHROMIUM_BIN="/path/to/Chromium" pnpm dev
   ```

   On Linux, this is often one of:

   ```bash
   CHROMIUM_BIN="/usr/bin/chromium" pnpm dev
   CHROMIUM_BIN="/usr/bin/chromium-browser" pnpm dev
   ```

3. Create the production build for packaging:

   ```bash
   pnpm build
   ```

4. Open the Extensions page in Chromium with `chrome://extensions`.
5. Enable `Developer mode`.
6. Click `Load unpacked`.
7. Select `build/chromium-mv3-dev` when using `pnpm dev`.
8. Select `build/chrome-mv3` when using `pnpm build`.
9. After rebuilding, click the extension's `Reload` button in the Extensions page.

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
3. Upload the generated archive from `build/*.zip` to the Chrome Web Store dashboard.

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
