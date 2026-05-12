# AppRoom Customiser

A Chrome/Edge extension that adds configurable workflow helpers to the [App-Room ERP](https://erp.app-room.ch). Each helper targets a specific bottleneck in the daily rental and check-in workflow and can be toggled individually from the settings page.

→ [Feature descriptions and store listing copy](store/listing.md)

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
