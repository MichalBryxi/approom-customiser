import { getAppRoomFieldsetByLabel } from './app-room-fields';

const STATE_KEY = 'approom-reg-to-rental';
const STEP_TIMEOUT_MS = 8000;
const POLL_INTERVAL_MS = 200;

type AutomationStep = 'click-new-entry';

export type RentalDuration = 'halbtag' | '1_tag' | '2_tage';

const ERP_DURATION_LABEL: Record<RentalDuration, string> = {
  halbtag: 'Halbtag',
  '1_tag': '1 Tag',
  '2_tage': '2 Tage',
};

export type RegistrationToRentalState = {
  step: AutomationStep;
  customerFirstname: string;
  customerLastname: string;
  duration: RentalDuration;
};

export function saveRegistrationToRentalState(
  customerFirstname: string,
  customerLastname: string,
  duration: RentalDuration,
) {
  getTopStorage().setItem(
    STATE_KEY,
    JSON.stringify({
      step: 'click-new-entry',
      customerFirstname,
      customerLastname,
      duration,
    } satisfies RegistrationToRentalState),
  );
}

export function clearRegistrationToRentalState() {
  getTopStorage().removeItem(STATE_KEY);
}

function getTopStorage(): Storage {
  try {
    return window.top?.sessionStorage ?? sessionStorage;
  } catch {
    return sessionStorage;
  }
}

function getState(): RegistrationToRentalState | null {
  try {
    const raw = getTopStorage().getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as RegistrationToRentalState) : null;
  } catch {
    return null;
  }
}

function clearState() {
  getTopStorage().removeItem(STATE_KEY);
}

function waitForElement<T extends Element>(
  find: () => T | null,
  timeoutMs = STEP_TIMEOUT_MS,
): Promise<T | null> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      const el = find();
      if (el) {
        resolve(el);
        return;
      }
      if (Date.now() >= deadline) {
        resolve(null);
        return;
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();
  });
}

function findNewEntryButton(): HTMLButtonElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-button-index="4"]')).find(
      (btn) =>
        Array.from(btn.querySelectorAll('span')).some((span) =>
          span.textContent?.trim().includes('Neuer Eintrag'),
        ),
    ) ?? null
  );
}

function findKundeMultiselect(): HTMLElement | null {
  const fieldset = getAppRoomFieldsetByLabel(document, 'Kunde');
  return fieldset?.querySelector<HTMLElement>('.multiselect') ?? null;
}

function findDurationButton(duration: RentalDuration): HTMLButtonElement | null {
  const label = ERP_DURATION_LABEL[duration];
  return (
    Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (btn) => btn.textContent?.trim() === label,
    ) ?? null
  );
}

async function handleClickNewEntry(state: RegistrationToRentalState) {
  const onUnload = () => clearState();
  window.addEventListener('pagehide', onUnload, { once: true });

  try {
    await runClickNewEntry(state);
  } finally {
    window.removeEventListener('pagehide', onUnload);
  }
}

async function runClickNewEntry(state: RegistrationToRentalState) {
  const button = await waitForElement(findNewEntryButton);
  if (!button) {
    clearState();
    return;
  }
  button.click();

  // Wait for the new-entry form to appear (SPA navigates to /rental/rent/new).
  // Polling here avoids relying on wxt:locationchange for the SPA transition.
  const multiselect = await waitForElement(findKundeMultiselect, 15000);
  if (!multiselect) {
    clearState();
    return;
  }

  // Open the dropdown.
  multiselect.querySelector<HTMLElement>('.multiselect__tags')?.click();

  // Wait for the input to expand (vue-multiselect sets width: 100% when active).
  const input = await waitForElement(
    () => {
      const el = multiselect.querySelector<HTMLInputElement>('.multiselect__input');
      return el && (el.style.width === '100%' || el.style.width === '') ? el : null;
    },
    2000,
  );

  const searchInput =
    input ?? multiselect.querySelector<HTMLInputElement>('.multiselect__input');
  if (!searchInput) {
    clearState();
    return;
  }

  const searchTerm = `${state.customerFirstname} ${state.customerLastname}`.trim();
  searchInput.value = searchTerm;
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));

  // Wait for at least one visible result.
  const firstOption = await waitForElement(() => {
    const items = Array.from(
      multiselect.querySelectorAll<HTMLElement>('.multiselect__element'),
    ).filter((el) => el.style.display !== 'none');
    return items[0]?.querySelector<HTMLElement>('.multiselect__option') ?? null;
  }, 5000);

  if (firstOption) {
    firstOption.click();
  }

  // Click the matching duration button.
  const durationButton = await waitForElement(() => findDurationButton(state.duration), 3000);
  clearState();
  durationButton?.click();
}

export class RegistrationToRentalAutomation {
  private inProgress = false;

  private readonly handleNavigation = () => {
    if (this.inProgress) {
      return;
    }

    const state = getState();
    if (!state) {
      return;
    }

    const path = location.pathname;

    if (state.step === 'click-new-entry' && path === '/rental/rent') {
      this.inProgress = true;
      void handleClickNewEntry(state).finally(() => {
        this.inProgress = false;
      });
    }
  };

  start() {
    window.addEventListener('wxt:locationchange', this.handleNavigation);
    this.handleNavigation();
  }

  stop() {
    window.removeEventListener('wxt:locationchange', this.handleNavigation);
  }
}
