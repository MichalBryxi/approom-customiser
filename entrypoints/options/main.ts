import {
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
      }

      form.append(section);
    }
  } catch (error) {
    console.error('🦊 Options render failed.', error);
    showOptionsError('Einstellungen konnten nicht geladen werden.');
  }
}

void renderOptions();
