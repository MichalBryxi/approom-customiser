import {
  DEFAULT_SETTINGS,
  FEATURE_DEFINITIONS,
  getSettings,
  updateSetting,
} from '../../src/lib/settings';
import type { ExtensionSettings } from '../../src/lib/types';

function createToggle(featureId: keyof ExtensionSettings, label: string, checked: boolean) {
  const wrapper = document.createElement('label');
  wrapper.className = 'popup__toggle';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = featureId;
  input.checked = checked;

  const text = document.createElement('span');
  text.textContent = label;

  wrapper.append(input, text);
  return { wrapper, input };
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

    for (const feature of FEATURE_DEFINITIONS) {
      const initialValue = settings[feature.id] ?? DEFAULT_SETTINGS[feature.id];
      const { wrapper, input } = createToggle(feature.id, feature.label, initialValue);

      input.addEventListener('change', () => {
        void updateSetting(feature.id, input.checked);
      });

      form.append(wrapper);
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
