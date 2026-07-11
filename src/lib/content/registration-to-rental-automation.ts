import { storage } from 'wxt/utils/storage';
import { getAppRoomFieldsetByLabel } from './app-room-fields';
import { normalizeText } from '../text';

// session: storage is unreliable in content scripts / subframes; local: works everywhere.
// Also consumed by background.ts (webNavigation redirect handler) — keep in sync.
export const STORAGE_KEY = 'local:approom-reg-to-rental';
const STEP_TIMEOUT_MS = 8000;
const POLL_INTERVAL_MS = 200;
const RESULT_PATH = '/customer_registration/result';

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
  customerZip: string;
  customerCity: string;
  duration: RentalDuration;
};

export function saveRegistrationToRentalState(
  customerFirstname: string,
  customerLastname: string,
  customerZip: string,
  customerCity: string,
  duration: RentalDuration,
): Promise<void> {
  return storage.setItem<RegistrationToRentalState>(STORAGE_KEY, {
    step: 'click-new-entry',
    customerFirstname,
    customerLastname,
    customerZip,
    customerCity,
    duration,
  });
}

export function clearRegistrationToRentalState(): Promise<void> {
  return storage.removeItem(STORAGE_KEY);
}

function clearState(): Promise<void> {
  return storage.removeItem(STORAGE_KEY);
}

function waitForElement<T>(
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

type CustomerSearchInfo = {
  firstname: string;
  lastname: string;
  zip: string;
  city: string;
};

// The ERP's customer picker filters on the typed search string. Compound names
// (e.g. firstname "Jean Pierre" or lastname "von Allmen") make the full
// "firstname lastname" search term produce zero results against whatever
// internal matching the ERP uses, so nothing gets selected. Fall back to
// narrower search terms (lastname, firstname, each individual word, then the
// address — the picker also matches on zip/city, and those fields are always
// populated since the registration form defaults them when left blank).
function buildSearchCandidates(info: CustomerSearchInfo): string[] {
  const fullName = `${info.firstname} ${info.lastname}`.trim();
  const words = fullName.split(' ').filter(Boolean);
  const candidates = [fullName, info.lastname, info.firstname, ...words, info.zip, info.city];

  return Array.from(new Set(candidates.filter((candidate) => candidate !== '')));
}

async function searchCustomerOptions(
  multiselect: HTMLElement,
  searchInput: HTMLInputElement,
  term: string,
  timeoutMs: number,
): Promise<HTMLElement[]> {
  searchInput.value = term;
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));

  const options = await waitForElement(() => {
    const visible = Array.from(multiselect.querySelectorAll<HTMLElement>('.multiselect__element'))
      .filter((el) => el.style.display !== 'none')
      .map((el) => el.querySelector<HTMLElement>('.multiselect__option'))
      .filter((el): el is HTMLElement => el !== null);
    return visible.length > 0 ? visible : null;
  }, timeoutMs);

  return options ?? [];
}

// Prefers an option confirmed by both name and address (best defence against
// picking the wrong customer when a narrowed, single-word search returns
// several people), then falls back to a name-only match, then — only when the
// search is already narrow enough to return exactly one candidate — that lone
// result.
function pickBestOption(options: HTMLElement[], info: CustomerSearchInfo): HTMLElement | null {
  const lowerFirst = info.firstname.toLowerCase();
  const lowerLast = info.lastname.toLowerCase();
  const lowerZip = info.zip.toLowerCase();
  const lowerCity = info.city.toLowerCase();
  const textOf = (option: HTMLElement) => normalizeText(option.textContent).toLowerCase();

  const nameAndAddressMatch = options.find((option) => {
    const text = textOf(option);
    return (
      text.includes(lowerFirst) &&
      text.includes(lowerLast) &&
      (lowerZip === '' || text.includes(lowerZip)) &&
      (lowerCity === '' || text.includes(lowerCity))
    );
  });
  if (nameAndAddressMatch) {
    return nameAndAddressMatch;
  }

  const nameMatch = options.find((option) => {
    const text = textOf(option);
    return text.includes(lowerFirst) && text.includes(lowerLast);
  });

  return nameMatch ?? (options.length === 1 ? options[0] : null);
}

async function selectCustomerOption(
  multiselect: HTMLElement,
  searchInput: HTMLInputElement,
  info: CustomerSearchInfo,
): Promise<HTMLElement | null> {
  const candidates = buildSearchCandidates(info);

  for (const [index, term] of candidates.entries()) {
    const options = await searchCustomerOptions(multiselect, searchInput, term, index === 0 ? 5000 : 3000);
    const match = pickBestOption(options, info);
    if (match) {
      match.click();
      return match;
    }
  }

  return null;
}

async function handleClickNewEntry(state: RegistrationToRentalState) {
  const onUnload = () => void clearState();
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
    void clearState();
    return;
  }
  button.click();

  // Wait for the new-entry form to appear (SPA navigates to /rental/rent/new).
  const multiselect = await waitForElement(findKundeMultiselect, 15000);
  if (!multiselect) {
    void clearState();
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
    void clearState();
    return;
  }

  await selectCustomerOption(multiselect, searchInput, {
    firstname: normalizeText(state.customerFirstname),
    lastname: normalizeText(state.customerLastname),
    zip: normalizeText(state.customerZip),
    city: normalizeText(state.customerCity),
  });

  // Click the matching duration button.
  const durationButton = await waitForElement(() => findDurationButton(state.duration), 3000);
  void clearState();
  durationButton?.click();
}

export class RegistrationToRentalAutomation {
  private inProgress = false;

  private state: RegistrationToRentalState | null = null;

  private unwatchState: (() => void) | null = null;

  private readonly handleNavigation = async () => {
    if (this.inProgress) {
      return;
    }

    // Use the in-memory state kept current by storage.watch. Fall back to a
    // direct read to handle the race where wxt:locationchange fires before the
    // watch callback has delivered the write (SPA navigation immediately after
    // saveRegistrationToRentalState), and also to handle full-page reloads
    // where start() ran before any state was written.
    let state = this.state;
    if (!state) {
      try {
        state = await storage.getItem<RegistrationToRentalState>(STORAGE_KEY);
      } catch {
        return;
      }
    }

    if (!state) {
      return;
    }

    // Re-check after the async gap to avoid racing a concurrent call.
    if (this.inProgress) {
      return;
    }

    const path = location.pathname;

    if (path === RESULT_PATH) {
      (window.top ?? window).location.assign('/rental/rent');
      return;
    }

    if (state.step === 'click-new-entry' && path === '/rental/rent') {
      this.inProgress = true;
      void handleClickNewEntry(state).finally(() => {
        this.inProgress = false;
      });
    }
  };

  async start() {
    try {
      this.state = await storage.getItem<RegistrationToRentalState>(STORAGE_KEY);
      this.unwatchState = storage.watch<RegistrationToRentalState>(STORAGE_KEY, (newValue) => {
        this.state = newValue;
      });
    } catch {
      return;
    }
    window.addEventListener('wxt:locationchange', this.handleNavigation);
    void this.handleNavigation();
  }

  stop() {
    window.removeEventListener('wxt:locationchange', this.handleNavigation);
    this.unwatchState?.();
    this.unwatchState = null;
    this.state = null;
  }
}
