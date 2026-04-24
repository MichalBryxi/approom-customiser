import {
  CUSTOMER_REGISTRATION_FIELD_DEFINITIONS,
  CUSTOMER_REGISTRATION_LANGUAGES,
  DEFAULT_SETTINGS,
  FEATURE_DEFINITIONS,
  FEATURE_SETTING_GROUPS,
  getSettings,
  updateSetting,
} from '../../src/lib/settings';
import type { FeatureDescriptionPart } from '../../src/lib/settings';
import type { ExtensionSettings } from '../../src/lib/types';

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
    void updateSetting(settingId, input.checked);
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
    void updateSetting(settingId, input.value);
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

function appendCustomerRegistrationConfiguration(body: HTMLElement, settings: ExtensionSettings) {
  body.append(createCustomerRegistrationMatrix(settings));
}

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

        input.addEventListener('change', () => {
          void updateSetting(feature.id, input.checked);
        });

        body.append(wrapper);

        if (feature.id === 'customerRegistrationFields') {
          appendCustomerRegistrationConfiguration(body, settings);
        }
      }

      form.append(section);
    }
  } catch (error) {
    console.error('🦊 Options render failed.', error);
    showOptionsError('Einstellungen konnten nicht geladen werden.');
  }
}

void renderOptions();
