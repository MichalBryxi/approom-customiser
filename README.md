# AppRoom Customiser

A Chrome/Edge extension that adds configurable workflow helpers to the [App-Room ERP](https://erp.app-room.ch). Each helper targets a specific bottleneck in the daily rental and check-in workflow and can be toggled individually from the settings page.

→ [Full feature descriptions and store listing copy](store/listing.md)

---

## Features

### Rental — print current view
**The problem:** Printing a rental's details requires navigating to a separate page, losing context.  
**The fix:** Adds a "Print" button directly in each rental row's action menu. One click opens a clean print preview with the visible row data.

### Rental — Unterschrift reminder
**The problem:** Staff occasionally hands over equipment without collecting the customer's signature.  
**The fix:** The signature button pulses red on every rental detail page — impossible to miss, impossible to forget.

### Customer registration → open rental
**The problem:** Registering a new customer and immediately opening a rental for them requires navigating across multiple pages, searching for the customer, and manually selecting a duration.  
**The fix:** Duration buttons (Half day / 1 day / 2 days) appear next to the registration form's submit button. Clicking one registers the customer *and* opens a new rental pre-filled with their name and the chosen duration — in one click.

### Barcode check-in
**The problem:** Checking articles back in requires finding each row in a table and editing the quantity by hand.  
**The fix:** Adds a barcode scanner input to the storage order view. Scanning an article barcode finds the matching row and increments its check-in quantity automatically.

### Check-in quantity warning
**The problem:** It is easy to miss rows where the pending check-in quantity does not add up to the ordered quantity.  
**The fix:** Colour-codes each row: yellow when the total will still fall short, green when it will exactly match. Rows already fully checked in stay neutral.

### Label printing by check-in quantity
**The problem:** Opening the label print dialog requires re-entering the same quantities already visible in the check-in table.  
**The fix:** Pre-fills the label print dialog with the current check-in quantities the moment it opens.

### Registration field customisation
**The problem:** The customer registration form shows every field at equal prominence, and field labels may not match your staff's working language.  
**The fix:** A per-field settings matrix lets you hide rarely-used fields behind a collapsible "Extra" section, mark fields as mandatory, and override labels in German, English, Italian and French.

---

## Development

```bash
pnpm install
pnpm dev          # Launches Chromium at erp.app-room.ch
pnpm build        # Production build → build/chrome-mv3/
pnpm zip          # Chrome Web Store ZIP
```

Chromium is auto-detected at `/Applications/Chromium.app/Contents/MacOS/Chromium` on macOS.  
Override: `CHROMIUM_BIN="/path/to/chromium" pnpm dev`

Load unpacked in `chrome://extensions`:
- Dev: `build/chromium-mv3-dev`
- Production: `build/chrome-mv3`

See [CLAUDE.md](CLAUDE.md) for architecture notes and contribution guidelines.

## Publishing

```bash
pnpm zip                  # builds the submission archive
pnpm submit:init          # one-time: configure Chrome Web Store API credentials
pnpm submit               # upload to Chrome Web Store (and Edge Add-ons if configured)
```

Store listing copy, screenshots, and privacy policy are in [store/](store/).
