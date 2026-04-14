const PRINT_BUTTON_SELECTOR = '[data-app-room-print-button="true"]';

function createPrintButton(referenceButton: HTMLButtonElement, onClick: (event: MouseEvent) => void) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = referenceButton.className;
  button.style.cssText = referenceButton.style.cssText;
  button.dataset.appRoomPrintButton = 'true';

  const icon = document.createElement('i');
  icon.className = 'fal fa-print';

  button.append(icon, document.createTextNode(' Drucken'));
  button.addEventListener('click', onClick);
  return button;
}

function getToolbarAnchor() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
    button.textContent?.includes('Zeitachse'),
  );
}

export function syncPrintButton(
  enabled: boolean,
  onClick: (event: MouseEvent) => void,
) {
  const existing = document.querySelector<HTMLButtonElement>(PRINT_BUTTON_SELECTOR);
  if (!enabled) {
    existing?.remove();
    return null;
  }

  if (existing) {
    return existing;
  }

  const anchorButton = getToolbarAnchor();
  if (!anchorButton?.parentElement) {
    return null;
  }

  const button = createPrintButton(anchorButton, onClick);
  anchorButton.insertAdjacentElement('beforebegin', button);
  return button;
}
