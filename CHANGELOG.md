# Changelog

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
