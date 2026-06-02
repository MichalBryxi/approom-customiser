# Changelog

## [0.17.1] - 2026-05-29

### Fixes
- **Mietflotte-Etiketten**: label layout overhauled — circle now uses `@page` margin as the single source of truth for edge clearance (1.5 mm non-printable zone + 2.5 mm visual margin), so the circle no longer overflows; `aspect-ratio: 1` keeps it square without hardcoded dimensions; font scales down automatically to fit any size string inside the circle. Label page size updated to 60 × 35 mm. Content rotated 90° to print portrait on the landscape stock.
- **Sidebar collapse**: also forces `padding-inline: 0` on `.sidebar-menu.collapsed .content`, preventing the ERP from applying a 14 px inline padding that shifted content even when the width override was already in effect.

## [0.17.0] - 2026-05-29

### New features
- **Mietflotte print button**: new "Drucken" button on the Rental > Mietflotte > Mietobjekte page. Reads all visible rows from the table and opens a print-ready page — one 55 × 30 mm label per row — containing the Rent-EAN in large text, a Code128 barcode, and the Grösse in large text. The barcode is generated inline with no external dependencies. Appears under a new "Rental > Mietflotte" section in the settings page.

## [0.16.2] - 2026-05-28

### Fixes
- **Prevent sidebar collapse**: top and bottom parts of the sidebar are now always fully visible when the feature is on — previously they only expanded on hover.

## [0.16.1] - 2026-05-28

### Fixes
- **Prevent sidebar collapse**: also keeps the main content area in place when the sidebar collapses — without this the content shifted left even though the sidebar stayed open.

## [0.16.0] - 2026-05-28

### New features
- **Prevent sidebar collapse**: new global setting (enabled by default) that injects a CSS override on all ERP pages, keeping the sidebar at its configured width (`--sidebar-width`, default 248 px) and preventing it from collapsing to 0. Appears under a new "Global (alle Seiten)" section in the settings page.

## [0.15.0] - 2026-05-28

### Improvements
- **Rental print button — rental period and time-of-day indicator**: the print table now shows Mietbeginn and Mietende from the overview list for each position — inline, in smaller text, next to the rental article name. Bookings starting before 12:00 get a **dashed** coloured top bar (morning); from 12:00 onwards a **solid** bar (afternoon/evening). This makes it easy to distinguish morning and afternoon groups at a glance on the printout.

## [0.15.0] - 2026-06-02

### New features
- **Abwesenheitskalender — CSV-Export**: adds a "CSV exportieren" button next to "Feiertagsverwaltung" in the absence calendar header. Exports the currently displayed month as a semicolon-delimited CSV with UTF-8 BOM (Excel-compatible). Column headers are formatted as `DD.MM.YYYY`. Optional sub-setting "Nicht-Arbeitstage mit „-" markieren" fills grey (non-working) cells with `-` instead of leaving them blank.

## [0.14.0] - 2026-05-23

### New features
- **Einstellungen — Changelog-Link**: the version number in the settings footer is now a link to the changelog on GitHub.

## [0.13.1] - 2026-05-23

### Changes
- **Unterschrift-Button hervorheben (Liste)**: replaced rAF retry loop with a container-scoped `MutationObserver` — purely event-driven, no artificial attempt cap or timeout.

## [0.13.0] - 2026-05-23

### New features
- **Unterschrift-Button hervorheben (Liste)**: the existing "Unterschrift-Button hervorheben" toggle now also pulses the "Unterschreiben" button red in the action dropdown on the rental list page. A container-scoped `MutationObserver` detects the dynamically-inserted dropdown content with no polling and no timeout.
- **Einstellungen — Untergeordnete Optionen**: feature toggles that have sub-settings are now wrapped in a collapsible `<details>` block. Sub-settings are visually greyed out and non-interactive while the parent feature is disabled.

## [0.12.0] - 2026-05-21

### New features
- **Einstellungen — Versionsanzeige**: the extension version is now displayed in the footer of the settings page.

### Changes
- **Release-Automatisierung**: `pnpm release:patch/minor/major` now fully automates the release — bumps `package.json`, builds, zips, and pushes the commit + tag to GitHub. Update `CHANGELOG.md` before running.

## [0.11.0] - 2026-05-21

### New features
- **Rechnungen — Mitarbeiterpreis: Kundentyp-Filter**: the EP+N% button is now only shown when the selected "Kundentyp" tags match a configurable regex pattern. Default: `.*Mitarbeiter.*`. Empty pattern disables the filter (button always shown).

## [0.10.0] - 2026-05-16

### New features
- **Kundenregistrierung — Standardsprache**: configurable default language for the registration form. On every page load the extension automatically selects the configured language in the "Sprachauswahl" dropdown. Default: English.

## [0.9.1] - 2026-05-16

### Changes
- **Rechnungen — Mitarbeiterpreis**: button now sits in the "Preis" column and writes `(EP+N%) × Menge` directly to the total price field. Button disabled state uses exact comparison.
- Removed stale `submit:init` script (command no longer exists in current WXT).

## [0.9.0] - 2026-05-16

### Changes
- Settings are now stored in `local` (non-synced) storage. Each device keeps its own configuration. Existing synced settings are not migrated — defaults apply on first run.

## [0.8.2] - 2026-05-15

### Improvements
- Extracted shared `setInputValue` and `getColumnIndex` DOM utilities, replacing identical copies in three controllers.
- Removed all debug `console.log` and `logErpDebug` calls from content scripts and background.

## [0.8.1] - 2026-05-15

### Improvements
- Extracted shared `injectStyle` utility used by three controllers.
- Options page: extracted `createNestedField` helper and replaced per-feature `if` dispatch chain with a data-driven lookup map.

## [0.8.0] - 2026-05-15

### New features
- **Rental — "Erfasst durch" filtern**: hides entries in the "Buchung erfasst durch" dropdown that do not match a configurable regex pattern. Empty pattern (default) shows all entries.

## [0.7.0] - 2026-05-15

### New features
- **Office > Rechnungen — Mitarbeiterpreis-Button**: adds an "EP+N%" button next to the unit price field on each invoice line. Clicking it calculates `EP × (1 + N%)` and fills in the price. The button disables itself when the current price already matches. N is configurable in extension settings (default: 12).

## [0.6.0] - 2026-05-12

### Removed
- **Barcode check-in**: feature removed entirely.

## [0.5.0] - 2026-05-09

### New features
- **Rental — "Rechnung"-Button ausblenden**: hides the "Rechnung" button on individual rental pages (toggleable).
- **Rental — Unterschrift-Dialog: Name vorausfüllen**: when the Unterschrift dialog opens, caches the customer name from the greeting text ("Hi …") and pre-fills the Name field once the checkbox is accepted and the field appears.
- **Rental — Unterschrift-Dialog: Speichern-Button grün**: styles the save button in the signature dialog with a green background to match other positive actions.

### Improvements
- **Anrede hidden by default**: the Anrede field is now moved to the Extra section by default (was: visible).
- **Observer feedback-loop fix**: `applyFieldCustomisations` now disconnects the form MutationObserver before applying DOM changes and reconnects in a `finally` block, eliminating the class of infinite-loop bugs where dispatched events triggered the observer again.

### Bug fixes
- Fixed infinite MutationObserver loop on the registration form: clicking a duration button (Halbtag / 1 Tag / 2 Tage) caused the page spinner to hang indefinitely because `applyNonMandatoryDefaults` re-applied `setInputValue` on every observer fire, dispatching events that re-triggered Angular, which re-triggered the observer.

## [0.4.0] - 2025-12-01

- Initial Chrome / Edge Web Store release candidate.
- Unterschrift-Button pulsing red highlight.
- Registration → rental automation with Halbtag / 1 Tag / 2 Tage duration buttons.
- Registration field customisation (Extra section, mandatory fields, multilingual labels).
- Barcode check-in, check-in quantity warning, label printing by check-in quantity.
- Rental print button.
