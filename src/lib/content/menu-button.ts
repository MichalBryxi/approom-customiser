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

export function syncPrintButton(wrapper: HTMLElement, onClick: (event: MouseEvent) => void) {
  const existing = wrapper.querySelector<HTMLButtonElement>(PRINT_BUTTON_SELECTOR);
  if (existing) {
    return existing;
  }

  const anchorButton =
    wrapper.nextElementSibling instanceof HTMLButtonElement
      ? wrapper.nextElementSibling
      : getToolbarAnchor();
  if (!anchorButton) {
    return null;
  }

  const button = createPrintButton(anchorButton, onClick);
  wrapper.replaceChildren(button);
  return button;
}
