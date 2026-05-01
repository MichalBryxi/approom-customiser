import {
  clearRegistrationToRentalState,
  saveRegistrationToRentalState,
  type RentalDuration,
} from './registration-to-rental-automation';

const BUTTON_ATTRIBUTE = 'data-app-room-reg-to-rental';
const RESULT_PATH = '/customer_registration/result';
const REDIRECT_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 200;

type Language = 'de' | 'en' | 'fr' | 'it';

const DURATIONS: RentalDuration[] = ['halbtag', '1-tag', '2-tage'];

const DURATION_LABELS: Record<RentalDuration, Record<Language, string>> = {
  halbtag: { de: 'Halbtag', en: 'Half day', fr: 'Demi-journée', it: 'Mezza giornata' },
  '1-tag': { de: '1 Tag', en: '1 day', fr: '1 jour', it: '1 giorno' },
  '2-tage': { de: '2 Tage', en: '2 days', fr: '2 jours', it: '2 giorni' },
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
    wrapper.style.display = 'inline-flex';
    wrapper.style.gap = '0.5rem';

    const lang = getLanguage();

    for (const duration of DURATIONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute(BUTTON_ATTRIBUTE, duration);
      btn.className = submitButton.className.replace('btn-primary', 'btn-success');
      btn.textContent = DURATION_LABELS[duration][lang];

      btn.addEventListener('click', () => {
        void this.triggerWithRentalFlow(submitButton, duration);
      });

      wrapper.append(btn);
    }
  }

  private async triggerWithRentalFlow(submitButton: HTMLButtonElement, duration: RentalDuration) {
    const form = document.querySelector<HTMLFormElement>('app-registration form');
    const firstname =
      form?.querySelector<HTMLInputElement>('input[formcontrolname="firstname"]')?.value ?? '';
    const lastname =
      form?.querySelector<HTMLInputElement>('input[formcontrolname="lastname"]')?.value ?? '';

    saveRegistrationToRentalState(firstname, lastname, duration);
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
