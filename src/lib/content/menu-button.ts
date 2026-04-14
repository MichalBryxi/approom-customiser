const PRINT_BUTTON_SELECTOR = '[data-app-room-print-button="true"]';

function createPrintButton(referenceButton: HTMLButtonElement, onClick: (event: MouseEvent) => void) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = referenceButton.className;
  button.style.cssText = referenceButton.style.cssText;
  button.dataset.appRoomPrintButton = 'true';
  button.textContent = 'Drücken';
  button.addEventListener('click', onClick);
  return button;
}

export function syncPrintButton(
  menuRoot: ParentNode,
  enabled: boolean,
  onClick: (event: MouseEvent) => void,
) {
  const existing = menuRoot.querySelector<HTMLButtonElement>(PRINT_BUTTON_SELECTOR);
  if (!enabled) {
    existing?.remove();
    return null;
  }

  if (existing) {
    return existing;
  }

  const referenceButton = menuRoot.querySelector<HTMLButtonElement>('button');
  if (!referenceButton?.parentElement) {
    return null;
  }

  const button = createPrintButton(referenceButton, onClick);
  referenceButton.insertAdjacentElement('afterend', button);
  return button;
}
