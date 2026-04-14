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

async function renderPopup() {
  const form = document.querySelector<HTMLFormElement>('#settings-form');
  if (!form) {
    return;
  }

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
}

void renderPopup();
