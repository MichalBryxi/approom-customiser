# Agent Instructions

## Project overview

- This project is a Chrome browser extension for customising `https://erp.app-room.ch/*`.
- It is built with WXT, TypeScript, and Chrome Manifest V3.
- The extension injects content scripts into the App-Room ERP UI and adds small workflow enhancements or page-specific customisations.

## Important conventions

- Do not write, add, maintain, or run automated tests for this project.
- Verify changes with `pnpm build` when validation is needed.
- User-facing labels, descriptions, validation messages, and settings text should be implemented in German unless the requested ERP page copy explicitly needs another language.
- Keep features small and page-specific. Prefer adding a dedicated controller under `src/lib/content/` and registering it in the shared feature runtime instead of adding one-off logic directly to `entrypoints/content.ts`.

## Where things live

- `entrypoints/content.ts` registers the content script for `https://erp.app-room.ch/*` and starts the shared runtime.
- `entrypoints/background.ts` bootstraps extension defaults and handles background-only work.
- `entrypoints/popup/` contains the compact extension popup UI with only the global enable/disable toggle and a link to settings.
- `entrypoints/options/` contains the full extension settings page for per-feature toggles.
- `entrypoints/print/` contains the extension print page used by the rental print feature.
- `src/lib/content/feature-runtime.ts` is the generic runtime that mounts configured features when URL and anchor conditions match.
- `src/lib/content/feature-config.ts` is the central registry for content features, their ERP page URL conditions, anchor selectors, labels, and controller mount/remove callbacks.
- `src/lib/content/rental-print-feature.ts` implements the rental row print button.
- `src/lib/content/barcode-check-in-controller.ts` implements barcode-based storage-order check-in.
- `src/lib/content/storage-order-warning-controller.ts` highlights storage-order rows by check-in status.
- `src/lib/content/storage-order-label-print-controller.ts` copies check-in quantities into label-print quantities.
- `src/lib/content/customer-registration-fields-controller.ts` customises the customer registration form for ERP-specific fields.
- `src/lib/settings.ts` defines default settings, popup setting groups, labels, and descriptions.
- `src/lib/types.ts` defines `FeatureId` and `ExtensionSettings`; add every new feature setting there.

## Settings model

- Each feature has a boolean setting keyed by its `FeatureId`.
- `extensionEnabled` is the global on/off switch. The popup should expose only this switch and a link to the options page.
- Defaults are defined in `DEFAULT_SETTINGS` in `src/lib/settings.ts`.
- Popup metadata is defined in `FEATURE_SETTING_GROUPS` and `FEATURE_DEFINITIONS`.
- Storage keys are generated as `sync:<featureId>` and persisted via WXT storage.
- `ensureDefaultSettings()` is called from the background script so newly added settings receive defaults without overwriting existing user choices.
- Runtime setting changes are watched by `ContentFeatureRuntime`; disabling a setting removes the mounted UI and calls the feature's optional `remove` handler.

## Adding or changing a feature

- Add or update the typed setting in `src/lib/types.ts` when the feature should be configurable.
- Add default value and German popup copy in `src/lib/settings.ts`.
- Add a controller or feature module under `src/lib/content/`.
- Register the feature in `src/lib/content/feature-config.ts` with the correct URL condition and anchor.
- Use hidden inline wrappers for behavior-only features via the existing `mountHiddenFeature` helper.
- Prefer stable selectors from the ERP DOM, such as IDs, `formcontrolname`, known table IDs, or clear text anchors already used by the page.
- When manipulating Angular-backed inputs, update the DOM value and dispatch bubbling `input` and `change` events so Angular state stays in sync.
- Avoid broad refactors and unrelated formatting changes; this repository is intentionally small and feature-focused.
