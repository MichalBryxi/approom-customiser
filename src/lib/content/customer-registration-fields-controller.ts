const MANAGED_ATTRIBUTE = 'data-app-room-customer-registration-fields';
const EXTRA_SECTION_ATTRIBUTE = 'data-app-room-customer-registration-extra';
const EXTRA_SECTION_CONTENT_ATTRIBUTE = 'data-app-room-customer-registration-extra-content';
const EXTRA_FIELD_DEFAULTS = new Map([
  ['zip', '0000'],
  ['city', '-'],
]);
const EXTRA_FIELD_NAMES = [
  'zip',
  'city',
  'phone_private',
  'phone_work',
  'website',
  'birthday',
] as const;

type SupportedLanguage = 'de' | 'en' | 'fr' | 'it';

const TRANSLATIONS: Record<
  SupportedLanguage,
  {
    streetLabel: string;
    extraSummary: string;
    firstNameLabel: string;
    lastNameLabel: string;
    mobileLabel: string;
    requiredMessages: Record<RequiredFieldName, string>;
  }
> = {
  de: {
    streetLabel: 'Hotelname & Adresse',
    extraSummary: 'Extra',
    firstNameLabel: 'Vorname *',
    lastNameLabel: 'Name *',
    mobileLabel: 'Tel. Mobile *',
    requiredMessages: {
      firstname: 'Bitte geben Sie einen Vornamen ein.',
      lastname: 'Bitte geben Sie einen Namen ein.',
      mobile: 'Bitte geben Sie eine Mobile-Telefonnummer ein.',
    },
  },
  en: {
    streetLabel: 'Hotel name & address',
    extraSummary: 'Extra',
    firstNameLabel: 'First name *',
    lastNameLabel: 'Last name *',
    mobileLabel: 'Mobile phone *',
    requiredMessages: {
      firstname: 'Please enter a first name.',
      lastname: 'Please enter a last name.',
      mobile: 'Please enter a mobile phone number.',
    },
  },
  fr: {
    streetLabel: "Nom et adresse de l'hôtel",
    extraSummary: 'Extra',
    firstNameLabel: 'Prénom *',
    lastNameLabel: 'Nom *',
    mobileLabel: 'Tél. mobile *',
    requiredMessages: {
      firstname: 'Veuillez saisir un prénom.',
      lastname: 'Veuillez saisir un nom.',
      mobile: 'Veuillez saisir un numéro de téléphone mobile.',
    },
  },
  it: {
    streetLabel: "Nome e indirizzo dell'hotel",
    extraSummary: 'Extra',
    firstNameLabel: 'Nome *',
    lastNameLabel: 'Cognome *',
    mobileLabel: 'Cellulare *',
    requiredMessages: {
      firstname: 'Inserisci un nome.',
      lastname: 'Inserisci un cognome.',
      mobile: 'Inserisci un numero di cellulare.',
    },
  },
};

type RequiredFieldName = 'firstname' | 'lastname' | 'mobile';

const REQUIRED_FIELDS: Array<{
  name: RequiredFieldName;
  labelKey: 'firstNameLabel' | 'lastNameLabel' | 'mobileLabel';
}> = [
  {
    name: 'firstname',
    labelKey: 'firstNameLabel',
  },
  {
    name: 'lastname',
    labelKey: 'lastNameLabel',
  },
  {
    name: 'mobile',
    labelKey: 'mobileLabel',
  },
];

function getInput(name: string) {
  return document.querySelector<HTMLInputElement>(`input[formcontrolname="${name}"]`);
}

function getFieldGroup(input: HTMLInputElement | null) {
  return input?.closest<HTMLElement>('.form-group') ?? null;
}

function setInputValue(input: HTMLInputElement, value: string) {
  if (input.value === value) {
    return;
  }

  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function getLabel(input: HTMLInputElement | null) {
  const id = input?.id;
  if (!id) {
    return null;
  }

  return document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(id)}"]`);
}

function ensureLabel(input: HTMLInputElement, text: string) {
  const existingLabel = getLabel(input);
  if (existingLabel) {
    if (existingLabel.textContent !== text) {
      existingLabel.textContent = text;
    }
    return existingLabel;
  }

  const label = document.createElement('label');
  label.className = 'mb-1';
  label.htmlFor = input.id;
  label.textContent = text;
  input.before(label);
  return label;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function getSelectedLanguage(): SupportedLanguage {
  const selectedLanguage =
    document
      .querySelector<HTMLElement>('ng-select.language-select .ng-value span[lang]')
      ?.getAttribute('lang')
      ?.toLowerCase() ?? document.documentElement.lang.toLowerCase();

  return selectedLanguage === 'en' ||
    selectedLanguage === 'fr' ||
    selectedLanguage === 'it' ||
    selectedLanguage === 'de'
    ? selectedLanguage
    : 'de';
}

type OriginalPosition = {
  parent: HTMLElement;
  index: number;
};

export class CustomerRegistrationFieldsController {
  private form: HTMLFormElement | null = null;

  private formObserver: MutationObserver | null = null;

  private pageObserver: MutationObserver | null = null;

  private originalPositions = new Map<HTMLElement, OriginalPosition>();

  private observedRequiredInputs = new Set<HTMLInputElement>();

  private applying = false;

  sync(enabled: boolean) {
    if (!enabled) {
      this.detach();
      return;
    }

    this.bindPageObserver();
    const form = document.querySelector<HTMLFormElement>('app-registration form');
    if (!form) {
      return;
    }

    this.bindForm(form);
    this.applyFieldCustomisations();
  }

  private bindPageObserver() {
    if (this.pageObserver || !document.body) {
      return;
    }

    this.pageObserver = new MutationObserver(() => {
      const form = document.querySelector<HTMLFormElement>('app-registration form');
      if (form && form !== this.form) {
        this.bindForm(form);
      }

      if (form) {
        this.applyFieldCustomisations();
      }
    });
    this.pageObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private bindForm(form: HTMLFormElement) {
    if (this.form === form) {
      return;
    }

    this.detachForm();
    this.form = form;
    this.form.addEventListener('submit', this.handleSubmit, true);

    this.formObserver = new MutationObserver(() => {
      this.applyFieldCustomisations();
    });
    this.formObserver.observe(form, {
      childList: true,
      subtree: true,
    });
  }

  private detach() {
    this.pageObserver?.disconnect();
    this.pageObserver = null;
    this.detachForm();
  }

  private detachForm() {
    this.formObserver?.disconnect();
    this.formObserver = null;

    if (this.form) {
      this.form.removeEventListener('submit', this.handleSubmit, true);
      this.form = null;
    }

    for (const input of this.observedRequiredInputs) {
      input.removeEventListener('input', this.handleRequiredInput);
    }
    this.observedRequiredInputs.clear();

    this.restoreExtraFields();
    this.getExtraSection()?.remove();

    for (const field of REQUIRED_FIELDS) {
      const input = getInput(field.name);
      input?.removeAttribute('required');
      input?.removeAttribute('aria-required');
      input?.setCustomValidity('');
    }

    this.clearRequiredFeedback();
  }

  private applyFieldCustomisations() {
    if (this.applying) {
      return;
    }

    this.applying = true;
    try {
      this.renameStreetLabel();
      this.moveExtraFields();
      this.configureRequiredFields();
    } finally {
      this.applying = false;
    }
  }

  private renameStreetLabel() {
    const streetLabel = getLabel(getInput('street'));
    const text = TRANSLATIONS[getSelectedLanguage()].streetLabel;
    if (streetLabel && streetLabel.textContent !== text) {
      streetLabel.textContent = text;
    }
  }

  private getExtraSection() {
    return document.querySelector<HTMLDetailsElement>(`details[${EXTRA_SECTION_ATTRIBUTE}]`);
  }

  private ensureExtraSection() {
    const existingSection = this.getExtraSection();
    const existingContent = existingSection?.querySelector<HTMLElement>(
      `[${EXTRA_SECTION_CONTENT_ATTRIBUTE}]`,
    );
    if (existingSection && existingContent) {
      return existingContent;
    }

    const section = document.createElement('details');
    section.className = 'form-group col-md-12';
    section.setAttribute(EXTRA_SECTION_ATTRIBUTE, 'true');
    section.setAttribute(MANAGED_ATTRIBUTE, 'true');

    const summary = document.createElement('summary');
    summary.style.cursor = 'pointer';

    const content = document.createElement('div');
    content.className = 'form-row mt-3';
    content.setAttribute(EXTRA_SECTION_CONTENT_ATTRIBUTE, 'true');

    section.append(summary, content);
    const anchor = this.getExtraSectionAnchor();
    if (anchor) {
      anchor.after(section);
    } else {
      this.form?.append(section);
    }

    return content;
  }

  private updateExtraSectionSummary() {
    const summary = this.getExtraSection()?.querySelector('summary');
    const text = TRANSLATIONS[getSelectedLanguage()].extraSummary;
    if (summary && summary.textContent !== text) {
      summary.textContent = text;
    }
  }

  private getExtraSectionAnchor() {
    return getFieldGroup(getInput('mail')) ?? getFieldGroup(getInput('mobile'));
  }

  private moveExtraFields() {
    const content = this.ensureExtraSection();
    this.updateExtraSectionSummary();

    for (const fieldName of EXTRA_FIELD_NAMES) {
      const input = getInput(fieldName);
      const group = getFieldGroup(input);
      if (!input || !group) {
        continue;
      }

      const defaultValue = EXTRA_FIELD_DEFAULTS.get(fieldName);
      if (defaultValue && normalizeText(input.value) === '') {
        setInputValue(input, defaultValue);
      }

      if (!this.originalPositions.has(group)) {
        const parent = group.parentElement;
        if (parent) {
          this.originalPositions.set(group, {
            parent,
            index: Array.from(parent.children).indexOf(group),
          });
        }
      }

      if (group.parentElement !== content) {
        content.append(group);
      }

      group.style.display = '';
      group.setAttribute(MANAGED_ATTRIBUTE, 'true');
    }
  }

  private restoreExtraFields() {
    const entries = Array.from(this.originalPositions.entries()).sort(
      ([, first], [, second]) => first.index - second.index,
    );

    for (const [group, position] of entries) {
      const currentChildren = Array.from(position.parent.children);
      const referenceElement = currentChildren[position.index] ?? null;
      position.parent.insertBefore(group, referenceElement);
      group.style.display = '';
      group.removeAttribute(MANAGED_ATTRIBUTE);
    }

    this.originalPositions.clear();
  }

  private configureRequiredFields() {
    const translations = TRANSLATIONS[getSelectedLanguage()];

    for (const field of REQUIRED_FIELDS) {
      const input = getInput(field.name);
      if (!input) {
        continue;
      }

      input.required = true;
      input.setAttribute('aria-required', 'true');

      if (!this.observedRequiredInputs.has(input)) {
        this.observedRequiredInputs.add(input);
        input.addEventListener('input', this.handleRequiredInput);
      }

      ensureLabel(input, translations[field.labelKey]);
    }
  }

  private getRequiredFeedback(fieldName: RequiredFieldName) {
    return document.querySelector<HTMLElement>(
      `[data-app-room-required-feedback="${CSS.escape(fieldName)}"]`,
    );
  }

  private showRequiredError(fieldName: RequiredFieldName, input: HTMLInputElement) {
    const message = TRANSLATIONS[getSelectedLanguage()].requiredMessages[fieldName];
    input.setCustomValidity(message);
    input.classList.add('is-invalid');

    const group = getFieldGroup(input);
    if (!group || this.getRequiredFeedback(fieldName)) {
      return;
    }

    const feedback = document.createElement('div');
    feedback.className = 'invalid-feedback d-block';
    feedback.dataset.appRoomRequiredFeedback = fieldName;
    feedback.textContent = message;
    group.append(feedback);
  }

  private clearRequiredError(fieldName: RequiredFieldName, input: HTMLInputElement) {
    input.setCustomValidity('');
    input.classList.remove('is-invalid');
    this.getRequiredFeedback(fieldName)?.remove();
  }

  private clearRequiredFeedback() {
    document
      .querySelectorAll<HTMLElement>('[data-app-room-required-feedback]')
      .forEach((feedback) => feedback.remove());
  }

  private readonly handleRequiredInput = (event: Event) => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement) || normalizeText(input.value) === '') {
      return;
    }

    const fieldName = REQUIRED_FIELDS.find((field) => getInput(field.name) === input)?.name;
    if (fieldName) {
      this.clearRequiredError(fieldName, input);
    }
  };

  private readonly handleSubmit = (event: SubmitEvent) => {
    this.applyFieldCustomisations();

    let firstInvalidInput: HTMLInputElement | null = null;

    for (const field of REQUIRED_FIELDS) {
      const input = getInput(field.name);
      if (!input) {
        continue;
      }

      if (normalizeText(input.value) !== '') {
        this.clearRequiredError(field.name, input);
        continue;
      }

      this.showRequiredError(field.name, input);
      firstInvalidInput ??= input;
    }

    if (!firstInvalidInput) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    firstInvalidInput.focus();
  };
}
