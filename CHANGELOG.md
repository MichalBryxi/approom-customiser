# Changelog

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
