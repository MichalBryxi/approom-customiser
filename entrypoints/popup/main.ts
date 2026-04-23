import {
  DEFAULT_SETTINGS,
  FEATURE_DEFINITIONS,
  FEATURE_SETTING_GROUPS,
  getSettings,
  updateSetting,
} from '../../src/lib/settings';
import type { FeatureDescriptionPart } from '../../src/lib/settings';
import type { ExtensionSettings } from '../../src/lib/types';

function appendTooltipDescription(
  tooltip: HTMLElement,
  description: string,
  descriptionParts?: FeatureDescriptionPart[],
) {
  if (!descriptionParts) {
    tooltip.textContent = description;
    return;
  }

  for (const part of descriptionParts) {
    if (typeof part === 'string') {
      tooltip.append(document.createTextNode(part));
      continue;
    }

    const mark = document.createElement('span');
    mark.className = 'popup__tooltip-mark';
    mark.style.backgroundColor = part.backgroundColor;
    mark.textContent = part.text;
    tooltip.append(mark);
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
  wrapper.className = 'popup__toggle';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = featureId;
  input.checked = checked;

  const text = document.createElement('span');
  text.className = 'popup__toggle-text';
  text.textContent = label;

  const help = document.createElement('span');
  help.className = 'popup__help';
  help.tabIndex = 0;
  help.setAttribute('role', 'button');
  help.setAttribute('aria-label', `${label}: ${description}`);
  help.textContent = '?';

  const tooltip = document.createElement('span');
  tooltip.className = 'popup__tooltip';
  appendTooltipDescription(tooltip, description, descriptionParts);
  help.append(tooltip);

  wrapper.append(input, text, help);
  return { wrapper, input };
}

function createSettingGroup(breadcrumb: string) {
  const group = document.createElement('details');
  group.className = 'popup__group';
  group.open = true;

  const summary = document.createElement('summary');
  summary.className = 'popup__group-summary';
  summary.textContent = breadcrumb;

  const body = document.createElement('div');
  body.className = 'popup__group-body';

  group.append(summary, body);
  return { group, body };
}

function showPopupError(message: string) {
  const form = document.querySelector<HTMLFormElement>('#settings-form');
  if (!form) {
    return;
  }

  const notice = document.createElement('p');
  notice.className = 'popup__error';
  notice.textContent = message;
  form.replaceChildren(notice);
}

async function renderPopup() {
  const form = document.querySelector<HTMLFormElement>('#settings-form');
  if (!form) {
    return;
  }

  try {
    console.info('🦊 Popup render started.', {
      featureCount: FEATURE_DEFINITIONS.length,
      featureIds: FEATURE_DEFINITIONS.map((feature) => feature.id),
    });

    const settings = await getSettings();
    form.replaceChildren();

    for (const settingGroup of FEATURE_SETTING_GROUPS) {
      const groupFeatures = FEATURE_DEFINITIONS.filter(
        (feature) => feature.groupId === settingGroup.id,
      );

      if (groupFeatures.length === 0) {
        continue;
      }

      const { group, body } = createSettingGroup(settingGroup.breadcrumb);

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

      form.append(group);
    }

    console.info('🦊 Popup render completed.', {
      renderedToggleCount: form.querySelectorAll('.popup__toggle').length,
    });
  } catch (error) {
    console.error('🦊 Popup render failed.', error);
    showPopupError('Einstellungen konnten nicht geladen werden.');
  }
}

void renderPopup();
