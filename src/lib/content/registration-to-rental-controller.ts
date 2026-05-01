import { saveRegistrationToRentalState } from './registration-to-rental-automation';

const BUTTON_ATTRIBUTE = 'data-app-room-reg-to-rental';

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

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute(BUTTON_ATTRIBUTE, 'true');
    btn.className = submitButton.className;
    btn.style.marginLeft = '0.5rem';
    btn.textContent = BUTTON_LABELS[getLanguage()];

    btn.addEventListener('click', () => {
      this.triggerWithRentalFlow(submitButton);
    });

    wrapper.append(btn);
  }

  private triggerWithRentalFlow(submitButton: HTMLButtonElement) {
    const form = document.querySelector<HTMLFormElement>('app-registration form');
    const firstname =
      form?.querySelector<HTMLInputElement>('input[formcontrolname="firstname"]')?.value ?? '';
    const lastname =
      form?.querySelector<HTMLInputElement>('input[formcontrolname="lastname"]')?.value ?? '';

    saveRegistrationToRentalState(firstname, lastname);
    submitButton.click();
  }
}
