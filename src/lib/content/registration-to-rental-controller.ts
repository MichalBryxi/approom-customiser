import {
  clearRegistrationToRentalState,
  saveRegistrationToRentalState,
} from './registration-to-rental-automation';

const BUTTON_ATTRIBUTE = 'data-app-room-reg-to-rental';
const RESULT_PATH = '/customer_registration/result';
const REDIRECT_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 200;

type Language = 'de' | 'en' | 'fr' | 'it';

const BUTTON_LABELS: Record<Language, string> = {
  de: 'Anmelden & Vermietung offen',
  en: 'Register & open rental',
  fr: 'Enregistrer & ouvrir location',
  it: 'Registra & apri noleggio',
};

function getLanguage(): Language {
  const lang =
    document
      .querySelector<HTMLElement>('ng-select.language-select .ng-value span[lang]')
      ?.getAttribute('lang')
      ?.toLowerCase() ?? document.documentElement.lang.toLowerCase();

  return lang === 'en' || lang === 'fr' || lang === 'it' ? lang : 'de';
}

export class RegistrationToRentalController {
  mount(wrapper: HTMLElement) {
    if (wrapper.querySelector(`[${BUTTON_ATTRIBUTE}]`)) {
      return;
    }

    const submitButton = document.querySelector<HTMLButtonElement>(
      'app-registration form button[type="submit"]',
    );
    if (!submitButton) {
      return;
    }

    wrapper.style.marginLeft = '1rem';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute(BUTTON_ATTRIBUTE, 'true');
    btn.className = submitButton.className.replace('btn-primary', 'btn-success');
    btn.textContent = BUTTON_LABELS[getLanguage()];

    btn.addEventListener('click', () => {
      void this.triggerWithRentalFlow(submitButton);
    });

    wrapper.append(btn);
  }

  private async triggerWithRentalFlow(submitButton: HTMLButtonElement) {
    const form = document.querySelector<HTMLFormElement>('app-registration form');
    const firstname =
      form?.querySelector<HTMLInputElement>('input[formcontrolname="firstname"]')?.value ?? '';
    const lastname =
      form?.querySelector<HTMLInputElement>('input[formcontrolname="lastname"]')?.value ?? '';

    saveRegistrationToRentalState(firstname, lastname);
    submitButton.click();

    // Poll until the Angular SPA navigates to the result page, then redirect the
    // top-level window to the rental page. This avoids relying on wxt:locationchange
    // which may not fire reliably for all SPA navigations inside iframes.
    const deadline = Date.now() + REDIRECT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      if (location.pathname === RESULT_PATH) {
        (window.top ?? window).location.assign('/rental/rent');
        return;
      }
    }

    // Registration didn't complete within the timeout — clear the stale state.
    clearRegistrationToRentalState();
  }
}
