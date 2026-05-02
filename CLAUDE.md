# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

Chrome Manifest V3 extension (WXT + TypeScript) that injects configurable workflow helpers into the App-Room ERP at `https://erp.app-room.ch/*`. Each helper is a small feature tied to a specific ERP page that the user can toggle on/off via the extension settings page. The extension has no backend — all state is stored in Chrome sync storage.

## Commands

```bash
pnpm dev          # Start WXT dev workflow; launches Chromium and opens erp.app-room.ch
pnpm build        # Production build → build/chrome-mv3/
pnpm zip          # Chrome Web Store ZIP
pnpm clean        # Clean build artifacts
pnpm release:patch / release:minor / release:major  # Bump version + build + zip
```

Chromium binary is auto-detected at `/Applications/Chromium.app/Contents/MacOS/Chromium` on macOS. Override: `CHROMIUM_BIN="/path/to/chromium" pnpm dev`.

Load unpacked in `chrome://extensions`: `build/chromium-mv3-dev` for dev, `build/chrome-mv3` for production builds.

**No automated tests.** Validate changes with `pnpm build`.

## Architecture

### Entry points

| File | Role |
|------|------|
| `entrypoints/content.ts` | Content script; registers on all `erp.app-room.ch` URLs; starts `ContentFeatureRuntime` |
| `entrypoints/background.ts` | Service worker; calls `ensureDefaultSettings()` on install; handles print job messages |
| `entrypoints/popup/main.ts` | Compact popup: global on/off toggle + link to settings |
| `entrypoints/options/main.ts` | Full settings page: per-feature toggles + inline config (rental skip pattern, registration field matrix) |
| `entrypoints/print/main.ts` | Extension print preview page used by the rental print feature |

### Feature registry pattern

`src/lib/content/feature-runtime.ts` (`ContentFeatureRuntime`) is the core engine:
- Loads settings on startup, re-evaluates on `wxt:locationchange`
- For each feature in `CONTENT_FEATURES`, checks URL conditions and waits for the anchor selector to appear in the DOM
- Mounts/removes features via WXT's `createIntegratedUi`
- Watches per-feature settings: disabling a setting calls the feature's `remove()` and unmounts the UI

`src/lib/content/feature-config.ts` (`CONTENT_FEATURES`) is the central registry. Each entry has:
- `id` — must match a `FeatureId` in `src/lib/types.ts`
- `url` — `{ pathEquals }`, `{ pathStartsWith }`, or `{ pathEquals, searchIncludes }`
- `anchor` — CSS selector or XPath; runtime waits for this element before mounting
- `append` — `'before'` or `'after'` the anchor (defaults to after)
- `mount(wrapper)` / `remove()` callbacks

For behavior-only features (no visible UI), mount a hidden wrapper using the `mountHiddenFeature` helper in feature-config.ts.

### Existing features

| `FeatureId` | ERP URL | Anchor selector | What it does |
|---|---|---|---|
| `rentalPrintButton` | `/rental/rent` | XPath: button containing "Zeitachse" | Adds "Drücken" to row action menus; opens print preview with row data |
| `barcodeCheckIn` | `/start.php?men_link=storage` | `#panel_current_order_step2` | Barcode input that increments matching article quantities |
| `checkInQuantityWarning` | same | `#bestell_artikel` | Color-highlights rows by check-in status (warning / complete) |
| `printLabelsByCheckInQuantity` | same | `#etiketten_button` | Auto-fills label-print quantities from current check-in amounts |
| `customerRegistrationFields` | `/customer_registration/customer` | `app-registration form` | Per-field: move to "Extra" section, mark mandatory, override multilingual labels |

### Settings model

- `src/lib/types.ts` — `FeatureId` union; `ExtensionSettings` interface (add every new setting here)
- `src/lib/settings.ts` — `DEFAULT_SETTINGS`, `FEATURE_DEFINITIONS` (German labels/descriptions), `FEATURE_SETTING_GROUPS` (breadcrumbs for the options page)
- Storage keys: `sync:<settingId>`, managed via WXT storage API
- `ensureDefaultSettings()` writes only missing keys — safe to call on every extension start

The `customerRegistrationFields` feature uses a flat key pattern for per-field settings:
`customerRegistrationField.<fieldId>.moveToExtra`, `.mandatory`, `.label.<lang>` (lang: `de | en | it | fr`).

## Adding or changing a feature

1. Add the typed setting to `src/lib/types.ts` (`FeatureId` union + `ExtensionSettings` field)
2. Add default value to `DEFAULT_SETTINGS` and German label/description to `FEATURE_DEFINITIONS` in `src/lib/settings.ts`
3. Create a controller class under `src/lib/content/`
4. Register it in `src/lib/content/feature-config.ts` with the correct URL condition and anchor selector

## DOM observation and polling rules

MutationObservers are fine — the problem is feedback loops and active polling, not observers themselves.

- **No active polling**: never use `while`-loops or `setInterval` to check `location.pathname` or DOM state. One-shot async waits (e.g. `waitForElement` using `setTimeout`) that resolve once and stop are acceptable.
- **URL changes**: prefer `wxt:locationchange` over writing a custom URL-watching MutationObserver. `wxt:locationchange` is also called by the feature runtime on every navigation, so `handleNavigation()` / `sync()` re-runs automatically.
- **Anchor timing matters**: use the most specific anchor that is only in the DOM once the relevant content is fully rendered. For example, `app-registration form button[type="submit"]` guarantees all form inputs exist, whereas `app-registration form` appears before Angular has rendered the inputs.
- **Idempotency is mandatory for any observer callback**: a function called by a MutationObserver must be a no-op when the DOM is already in the desired state. Setting `element.textContent = value` always replaces the text node even when the string is identical — use the `setText()` helper (which checks before mutating) instead. Non-idempotent mutations inside an observer callback cause infinite loops: observer fires → mutation → observer fires → …
- **Cross-frame / cross-page state**: use WXT's `storage` API (`storage.getItem` / `storage.setItem`) instead of `sessionStorage` or `localStorage`. Use the `local:` prefix — **do not use `session:`**. `chrome.storage.session` throws "Access to storage is not allowed from this context" in content scripts running inside subframes (e.g. the customer registration page when embedded in the ERP). `chrome.storage.local` works reliably in all content-script contexts. Always call `clearState()` explicitly after use so `local:` state does not linger across browser restarts.

- **Reacting to ERP page navigation from the background**: `wxt:locationchange` in content scripts does not fire for the Angular SPA at `customer_registration/` (the SPA's pushState is not intercepted by WXT after `document_idle`). Use `chrome.webNavigation.onCompleted` (full HTTP loads) **and** `chrome.webNavigation.onHistoryStateUpdated` (SPA pushState navigations) in `background.ts` to reliably detect navigation to a specific URL. Requires `webNavigation` in `permissions`. Use `chrome.tabs.update(tabId, { url })` to redirect — no `tabs` permission needed when the target URL matches `host_permissions`. See `handleResultPage` in `background.ts`.

- **Language selector on `/customer_registration/customer`**: the `ng-select` at `ng-select.language-select` does **not** mutate the `lang` attribute on the existing `<span lang="...">` when the user picks a language — it **replaces** the span with a new element. Observing `span[lang]` for `attributeFilter: ['lang']` does not fire. Instead observe the parent `.ng-value-container` for `{ childList: true, subtree: true }`. See `bindLanguageObserver()` in `customer-registration-fields-controller.ts`.

## Conventions

- All user-facing text (options page, popup labels, descriptions) must be in **German**
- The options page at `entrypoints/options/` is German-only
- Use stable ERP DOM selectors: element IDs, `formcontrolname` attributes, known table IDs — not fragile class names
- When writing to Angular-backed inputs: set the DOM `.value` and dispatch bubbling `input` and `change` events so Angular's form state stays in sync
- Avoid broad refactors and unrelated formatting changes — the repo is intentionally small and feature-focused
