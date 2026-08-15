import {
  CUSTOMER_REGISTRATION_FIELD_DEFINITIONS,
  CUSTOMER_REGISTRATION_LANGUAGES,
  DEFAULT_SETTINGS,
  FEATURE_DEFINITIONS,
  FEATURE_SETTING_GROUPS,
  getSettings,
  updateSetting,
} from '../../src/lib/settings';
import { reloadErpTabs } from '../../src/lib/extension-tabs';
import type { FeatureDescriptionPart } from '../../src/lib/settings';
import type { CustomerRegistrationLanguage, ExtensionSettings } from '../../src/lib/types';

function appendDescription(
  descriptionElement: HTMLElement,
  description: string,
  descriptionParts?: FeatureDescriptionPart[],
) {
  if (!descriptionParts) {
    descriptionElement.textContent = description;
    return;
  }

  for (const part of descriptionParts) {
    if (typeof part === 'string') {
      descriptionElement.append(document.createTextNode(part));
      continue;
    }

    const mark = document.createElement('span');
    mark.className = 'options__description-mark';
    mark.style.backgroundColor = part.backgroundColor;
    if (part.color) {
      mark.style.color = part.color;
    }
    mark.textContent = part.text;
    descriptionElement.append(mark);
  }
}

function createToggle(
  featureId: keyof ExtensionSettings,
  label: string,
  description: string,
  descriptionParts: FeatureDescriptionPart[] | undefined,
  checked: boolean,
) {
  const wrapper = document.createElement('label');
  wrapper.className = 'options__toggle';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = featureId;
  input.checked = checked;

  const body = document.createElement('span');
  body.className = 'options__toggle-body';

  const text = document.createElement('span');
  text.className = 'options__toggle-label';
  text.textContent = label;

  const detail = document.createElement('span');
  detail.className = 'options__toggle-description';
  appendDescription(detail, description, descriptionParts);

  body.append(text, detail);
  wrapper.append(input, body);
  return { wrapper, input };
}

function createSettingGroup(breadcrumb: string) {
  const section = document.createElement('section');
  section.className = 'options__group';

  const heading = document.createElement('h2');
  heading.className = 'options__group-heading';
  heading.textContent = breadcrumb;

  const body = document.createElement('div');
  body.className = 'options__group-body';

  section.append(heading, body);
  return { section, body };
}

function createMatrixCheckbox(settingId: keyof ExtensionSettings, checked: boolean) {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = settingId;
  input.checked = checked;
  input.addEventListener('change', () => {
    void updateSetting(settingId, input.checked).then(reloadErpTabs);
  });
  return input;
}

function createMatrixTextInput(settingId: keyof ExtensionSettings, value: string) {
  const input = document.createElement('input');
  input.className = 'options__matrix-text';
  input.type = 'text';
  input.name = settingId;
  input.value = value;
  input.addEventListener('change', () => {
    void updateSetting(settingId, input.value).then(reloadErpTabs);
  });
  return input;
}

function createCustomerRegistrationMatrix(settings: ExtensionSettings) {
  const wrapper = document.createElement('div');
  wrapper.className = 'options__matrix-wrap';

  const heading = document.createElement('h3');
  heading.className = 'options__subheading';
  heading.textContent = 'Registrierungsfelder';

  const table = document.createElement('table');
  table.className = 'options__matrix';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const headers = [
    'Feld',
    'In Extra verschieben',
    'Pflichtfeld',
    ...CUSTOMER_REGISTRATION_LANGUAGES.map((language) => `Beschriftung ${language.label}`),
  ];

  for (const label of headers) {
    const header = document.createElement('th');
    header.scope = 'col';
    header.textContent = label;
    headerRow.append(header);
  }

  thead.append(headerRow);

  const scroll = document.createElement('div');
  scroll.className = 'options__matrix-scroll';

  const tbody = document.createElement('tbody');
  for (const field of CUSTOMER_REGISTRATION_FIELD_DEFINITIONS) {
    const row = document.createElement('tr');

    const labelCell = document.createElement('th');
    labelCell.scope = 'row';
    labelCell.textContent = field.label;

    const moveCell = document.createElement('td');
    moveCell.append(
      createMatrixCheckbox(
        field.moveToExtraSetting,
        settings[field.moveToExtraSetting] ?? DEFAULT_SETTINGS[field.moveToExtraSetting],
      ),
    );

    const mandatoryCell = document.createElement('td');
    mandatoryCell.append(
      createMatrixCheckbox(
        field.mandatorySetting,
        settings[field.mandatorySetting] ?? DEFAULT_SETTINGS[field.mandatorySetting],
      ),
    );

    row.append(labelCell, moveCell, mandatoryCell);

    for (const language of CUSTOMER_REGISTRATION_LANGUAGES) {
      const labelSetting = field.labelSettings[language.id];
      const cell = document.createElement('td');
      cell.append(
        createMatrixTextInput(
          labelSetting,
          settings[labelSetting] ?? DEFAULT_SETTINGS[labelSetting],
        ),
      );
      row.append(cell);
    }

    tbody.append(row);
  }

  table.append(thead, tbody);
  scroll.append(table);
  wrapper.append(heading, scroll);
  return wrapper;
}

function createNestedField(
  labelText: string,
  input: HTMLInputElement | HTMLSelectElement,
  extraNodes: Node[] = [],
) {
  const wrapper = document.createElement('div');
  wrapper.className = 'options__nested-options';
  const label = document.createElement('label');
  label.className = 'options__field';
  const text = document.createElement('span');
  text.className = 'options__field-label';
  text.textContent = labelText;
  label.append(text, input, ...extraNodes);
  wrapper.append(label);
  return wrapper;
}

type HintPart = string | { href: string; label: string };

function createHint(parts: HintPart[]) {
  const hint = document.createElement('p');
  hint.className = 'options__field-hint';
  for (const part of parts) {
    if (typeof part === 'string') {
      hint.append(document.createTextNode(part));
      continue;
    }
    const link = document.createElement('a');
    link.href = part.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = part.label;
    hint.append(link);
  }
  return hint;
}

function createFieldError() {
  const error = document.createElement('p');
  error.className = 'options__field-error';
  error.hidden = true;
  return error;
}

// Klebetiketten (Zebra label) output was blank/oversized in testing — hide
// just this field without deleting it. Kassenbon/Auftrag printing works.
const CUPS_PRINT_ETIKETTE_FIELD_ENABLED = false;

const PRINTER_MANAGEMENT_LINK = { href: 'https://erp.app-room.ch/printer', label: 'erp.app-room.ch/printer' };

async function requestCupsServerPermission(url: string): Promise<boolean> {
  const parsed = new URL(url);
  const origin = `${parsed.protocol}//${parsed.host}/*`;
  try {
    return await chrome.permissions.request({ origins: [origin] });
  } catch (error) {
    console.error('🦊 CUPS permission request failed.', error);
    return false;
  }
}

const FEATURE_EXTRA_CONFIG: Partial<
  Record<keyof ExtensionSettings, (body: HTMLElement, settings: ExtensionSettings) => void>
> = {
  rentalPrintButton(body, settings) {
    const input = document.createElement('input');
    input.className = 'options__matrix-text';
    input.type = 'text';
    input.name = 'rentalPrintSkipMietobjektPattern';
    input.value = settings.rentalPrintSkipMietobjektPattern ?? DEFAULT_SETTINGS.rentalPrintSkipMietobjektPattern;
    input.addEventListener('change', () => {
      void updateSetting('rentalPrintSkipMietobjektPattern', input.value).then(reloadErpTabs);
    });
    body.append(createNestedField('Positionen überspringen, wenn Mietobjekt auf Regex passt (z. B. .*Helm.*)', input));
  },

  customerRegistrationFields(body, settings) {
    const langOptions: { value: CustomerRegistrationLanguage; label: string }[] = [
      { value: 'de', label: 'Deutsch' },
      { value: 'en', label: 'English' },
      { value: 'fr', label: 'Français' },
      { value: 'it', label: 'Italiano' },
    ];
    const select = document.createElement('select');
    select.className = 'options__matrix-text';
    select.name = 'customerRegistrationDefaultLanguage';
    for (const { value, label } of langOptions) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      opt.selected = value === (settings.customerRegistrationDefaultLanguage ?? DEFAULT_SETTINGS.customerRegistrationDefaultLanguage);
      select.append(opt);
    }
    select.addEventListener('change', () => {
      void updateSetting('customerRegistrationDefaultLanguage', select.value as CustomerRegistrationLanguage).then(reloadErpTabs);
    });
    body.append(createNestedField('Standardsprache', select));
    body.append(createCustomerRegistrationMatrix(settings));
  },

  rentalErfasstDurchFilter(body, settings) {
    const input = document.createElement('input');
    input.className = 'options__matrix-text';
    input.type = 'text';
    input.name = 'rentalErfasstDurchFilterPattern';
    input.value = settings.rentalErfasstDurchFilterPattern ?? DEFAULT_SETTINGS.rentalErfasstDurchFilterPattern;
    input.addEventListener('change', () => {
      void updateSetting('rentalErfasstDurchFilterPattern', input.value).then(reloadErpTabs);
    });
    body.append(createNestedField('Regex-Muster (leer = alles anzeigen)', input));
  },

  absenceCalendarExport(body, settings) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'absenceCalendarExportMarkActive';
    input.checked = settings.absenceCalendarExportMarkActive ?? DEFAULT_SETTINGS.absenceCalendarExportMarkActive;
    input.addEventListener('change', () => {
      void updateSetting('absenceCalendarExportMarkActive', input.checked).then(reloadErpTabs);
    });
    const label = document.createElement('label');
    label.className = 'options__field';
    const text = document.createElement('span');
    text.className = 'options__field-label';
    text.textContent = 'Nicht-Arbeitstage mit „-" markieren';
    label.append(input, text);
    const wrapper = document.createElement('div');
    wrapper.className = 'options__nested-options';
    wrapper.append(label);
    body.append(wrapper);

    const patternInput = document.createElement('input');
    patternInput.className = 'options__matrix-text';
    patternInput.type = 'text';
    patternInput.name = 'absenceCalendarExportMandantPattern';
    patternInput.value = settings.absenceCalendarExportMandantPattern ?? DEFAULT_SETTINGS.absenceCalendarExportMandantPattern;
    patternInput.addEventListener('change', () => {
      void updateSetting('absenceCalendarExportMandantPattern', patternInput.value).then(reloadErpTabs);
    });
    body.append(createNestedField('Mandant-Filter: Regex (leer = Schaltfläche ausblenden)', patternInput));
  },

  rechnungenMitarbeiterPreis(body, settings) {
    const percentInput = document.createElement('input');
    percentInput.className = 'options__matrix-text';
    percentInput.type = 'number';
    percentInput.min = '0';
    percentInput.step = '1';
    percentInput.name = 'rechnungenMitarbeiterPreisProzent';
    percentInput.value = String(settings.rechnungenMitarbeiterPreisProzent ?? DEFAULT_SETTINGS.rechnungenMitarbeiterPreisProzent);
    percentInput.addEventListener('change', () => {
      const val = parseFloat(percentInput.value);
      if (!isNaN(val)) void updateSetting('rechnungenMitarbeiterPreisProzent', val).then(reloadErpTabs);
    });
    body.append(createNestedField('Mitarbeiterpreis: EP + N%', percentInput));

    const patternInput = document.createElement('input');
    patternInput.className = 'options__matrix-text';
    patternInput.type = 'text';
    patternInput.name = 'rechnungenMitarbeiterPreisKundentypPattern';
    patternInput.value = settings.rechnungenMitarbeiterPreisKundentypPattern ?? DEFAULT_SETTINGS.rechnungenMitarbeiterPreisKundentypPattern;
    patternInput.addEventListener('change', () => {
      void updateSetting('rechnungenMitarbeiterPreisKundentypPattern', patternInput.value).then(reloadErpTabs);
    });
    body.append(createNestedField('Nur anzeigen wenn Kundentyp passt (Regex, leer = immer)', patternInput));
  },

  cupsPrint(body, settings) {
    const serverInput = document.createElement('input');
    serverInput.className = 'options__matrix-text';
    serverInput.type = 'text';
    serverInput.name = 'cupsServerUrl';
    serverInput.placeholder = 'http://192.168.1.12:631';
    serverInput.value = settings.cupsServerUrl ?? DEFAULT_SETTINGS.cupsServerUrl;

    const serverError = createFieldError();

    const permissionStatus = document.createElement('p');
    permissionStatus.className = 'options__field-hint';

    const grantButton = document.createElement('button');
    grantButton.type = 'button';
    grantButton.className = 'options__button';
    grantButton.textContent = 'Berechtigung erteilen';

    async function refreshPermissionStatus() {
      const value = serverInput.value.trim();
      if (!value) {
        permissionStatus.textContent = '';
        grantButton.hidden = true;
        return;
      }

      let origin: string;
      try {
        const parsed = new URL(value);
        origin = `${parsed.protocol}//${parsed.host}/*`;
      } catch {
        permissionStatus.textContent = '';
        grantButton.hidden = true;
        return;
      }

      const granted = await chrome.permissions.contains({ origins: [origin] });
      permissionStatus.textContent = granted
        ? '✓ Berechtigung erteilt.'
        : 'Berechtigung noch nicht erteilt — ohne sie schlägt der Druck mit einem CORS-Fehler fehl.';
      grantButton.hidden = granted;
    }

    grantButton.addEventListener('click', () => {
      void (async () => {
        serverError.hidden = true;
        const value = serverInput.value.trim();
        if (!value) {
          return;
        }

        try {
          new URL(value);
        } catch {
          serverError.textContent = 'Ungültige URL. Beispiel: http://192.168.1.12:631';
          serverError.hidden = false;
          return;
        }

        const granted = await requestCupsServerPermission(value);
        if (!granted) {
          serverError.textContent =
            'Berechtigung wurde nicht erteilt — der automatische Druck funktioniert erst, wenn sie erteilt wird.';
          serverError.hidden = false;
        }
        await refreshPermissionStatus();
      })();
    });

    serverInput.addEventListener('change', () => {
      void (async () => {
        serverError.hidden = true;
        const value = serverInput.value.trim();

        if (value) {
          try {
            new URL(value);
          } catch {
            serverError.textContent = 'Ungültige URL. Beispiel: http://192.168.1.12:631';
            serverError.hidden = false;
            return;
          }

          const granted = await requestCupsServerPermission(value);
          if (!granted) {
            serverError.textContent =
              'Berechtigung wurde nicht erteilt — der automatische Druck funktioniert erst, wenn sie erteilt wird.';
            serverError.hidden = false;
          }
        }

        await updateSetting('cupsServerUrl', value);
        await refreshPermissionStatus();
        await reloadErpTabs();
      })();
    });

    void refreshPermissionStatus();

    body.append(
      createNestedField(
        'CUPS-Server-Adresse',
        serverInput,
        [
          createHint([
            'Schema, Host und Port des lokalen CUPS-Servers. Zu finden unter ',
            PRINTER_MANAGEMENT_LINK,
            ' → „Drucker Verwaltung" anklicken und die URL aus der Adresszeile kopieren.',
          ]),
          permissionStatus,
          grantButton,
          serverError,
        ],
      ),
    );

    if (CUPS_PRINT_ETIKETTE_FIELD_ENABLED) {
      const etiketteInput = document.createElement('input');
      etiketteInput.className = 'options__matrix-text';
      etiketteInput.type = 'text';
      etiketteInput.name = 'cupsPrintEtikettePrinterName';
      etiketteInput.placeholder = 'z. B. Zebra_GK420t';
      etiketteInput.value = settings.cupsPrintEtikettePrinterName ?? DEFAULT_SETTINGS.cupsPrintEtikettePrinterName;
      etiketteInput.addEventListener('change', () => {
        void updateSetting('cupsPrintEtikettePrinterName', etiketteInput.value.trim()).then(reloadErpTabs);
      });
      body.append(
        createNestedField('Etikettendrucker (Klebetiketten)', etiketteInput, [
          createHint([
            'CUPS-Druckername. Leer lassen = kein Direktdruck für diesen Dokumenttyp. Zu finden unter ',
            PRINTER_MANAGEMENT_LINK,
            ' unter „Etikettendrucker".',
          ]),
        ]),
      );
    }

    const auftragInput = document.createElement('input');
    auftragInput.className = 'options__matrix-text';
    auftragInput.type = 'text';
    auftragInput.name = 'cupsPrintAuftragPrinterName';
    auftragInput.placeholder = 'z. B. pr-1039';
    auftragInput.value = settings.cupsPrintAuftragPrinterName ?? DEFAULT_SETTINGS.cupsPrintAuftragPrinterName;
    auftragInput.addEventListener('change', () => {
      void updateSetting('cupsPrintAuftragPrinterName', auftragInput.value.trim()).then(reloadErpTabs);
    });
    body.append(
      createNestedField('Kassenbon-/Auftragsdrucker', auftragInput, [
        createHint([
          'CUPS-Druckername. Leer lassen = kein Direktdruck für diesen Dokumenttyp. Zu finden unter ',
          PRINTER_MANAGEMENT_LINK,
          ' unter „Kassenbon Drucker".',
        ]),
      ]),
    );
  },
};

function showOptionsError(message: string) {
  const form = document.querySelector<HTMLFormElement>('#settings-form');
  if (!form) {
    return;
  }

  const notice = document.createElement('p');
  notice.className = 'options__error';
  notice.textContent = message;
  form.replaceChildren(notice);
}

async function renderOptions() {
  const form = document.querySelector<HTMLFormElement>('#settings-form');
  if (!form) {
    return;
  }

  try {
    const settings = await getSettings();
    form.replaceChildren();

    for (const settingGroup of FEATURE_SETTING_GROUPS) {
      const groupFeatures = FEATURE_DEFINITIONS.filter(
        (feature) => feature.groupId === settingGroup.id,
      );

      if (groupFeatures.length === 0) {
        continue;
      }

      const { section, body } = createSettingGroup(settingGroup.breadcrumb);

      for (const feature of groupFeatures) {
        const initialValue = settings[feature.id] ?? DEFAULT_SETTINGS[feature.id];
        const { wrapper, input } = createToggle(
          feature.id,
          feature.label,
          feature.description,
          feature.descriptionParts,
          initialValue,
        );

        const extraConfigFn = FEATURE_EXTRA_CONFIG[feature.id];

        if (extraConfigFn) {
          const configDiv = document.createElement('div');
          configDiv.className = 'options__feature-config';
          configDiv.inert = !initialValue;
          extraConfigFn(configDiv, settings);

          wrapper.addEventListener('click', (e) => e.stopPropagation());
          input.addEventListener('change', () => {
            void updateSetting(feature.id, input.checked).then(reloadErpTabs);
            configDiv.inert = !input.checked;
          });

          const summary = document.createElement('summary');
          summary.append(wrapper);

          const details = document.createElement('details');
          details.className = 'options__feature';
          details.open = true;
          details.append(summary, configDiv);
          body.append(details);
        } else {
          input.addEventListener('change', () => {
            void updateSetting(feature.id, input.checked).then(reloadErpTabs);
          });
          body.append(wrapper);
        }
      }

      form.append(section);
    }
  } catch (error) {
    console.error('🦊 Options render failed.', error);
    showOptionsError('Einstellungen konnten nicht geladen werden.');
  }
}

function renderVersion() {
  const footer = document.getElementById('options-footer');
  if (!footer) return;
  const version = chrome.runtime.getManifest().version;
  const link = document.createElement('a');
  link.href = `https://github.com/MichalBryxi/approom-customiser/blob/main/CHANGELOG.md`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = `v${version}`;
  footer.append(link);
}

void renderOptions();
renderVersion();
