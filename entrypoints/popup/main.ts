import { DEFAULT_SETTINGS, getSettings, updateSetting } from '../../src/lib/settings';
import { reloadErpTabs } from '../../src/lib/extension-tabs';

function showPopupError(message: string) {
  const root = document.querySelector<HTMLElement>('#popup-root');
  if (!root) {
    return;
  }

  const notice = document.createElement('p');
  notice.className = 'popup__error';
  notice.textContent = message;
  root.replaceChildren(notice);
}

function openOptionsPage() {
  if (typeof chrome?.runtime?.openOptionsPage === 'function') {
    void chrome.runtime.openOptionsPage();
    return;
  }

  window.open(chrome.runtime.getURL('options.html'), '_blank');
}

async function renderPopup() {
  const root = document.querySelector<HTMLElement>('#popup-root');
  if (!root) {
    return;
  }

  try {
    const settings = await getSettings();
    root.replaceChildren();

    const toggle = document.createElement('label');
    toggle.className = 'popup__toggle';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'extensionEnabled';
    input.checked = settings.extensionEnabled ?? DEFAULT_SETTINGS.extensionEnabled;

    const text = document.createElement('span');
    text.className = 'popup__toggle-text';
    text.textContent = 'Erweiterung aktivieren';

    toggle.append(input, text);

    const optionsButton = document.createElement('button');
    optionsButton.className = 'popup__button';
    optionsButton.type = 'button';
    optionsButton.textContent = 'Einstellungen öffnen';

    input.addEventListener('change', () => {
      void updateSetting('extensionEnabled', input.checked).then(reloadErpTabs);
    });
    optionsButton.addEventListener('click', openOptionsPage);

    root.append(toggle, optionsButton);
  } catch (error) {
    console.error('🦊 Popup render failed.', error);
    showPopupError('Einstellungen konnten nicht geladen werden.');
  }
}

void renderPopup();
