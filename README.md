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

   WXT builds the extension for Chrome and keeps watching for changes.

3. Or create a normal production build:

   ```bash
   pnpm build
   ```

4. Open `chrome://extensions`.
5. Enable `Developer mode`.
6. Click `Load unpacked`.
7. Select `.output/chrome-mv3`.
8. After rebuilding, click the extension's `Reload` button in `chrome://extensions`.

## Testing

Run unit tests with:

```bash
pnpm test
```

## Packaging for the Chrome Web Store

1. Increase the version in `package.json`.
2. Build the ZIP package:

   ```bash
   pnpm zip
   ```

3. Upload the generated archive from `.output/*/*.zip` to the Chrome Web Store dashboard.

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
