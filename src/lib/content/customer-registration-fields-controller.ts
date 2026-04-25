import {
  CUSTOMER_REGISTRATION_FIELD_DEFINITIONS,
  DEFAULT_SETTINGS,
  getSettings,
  watchSetting,
} from '../settings';
import type {
  CustomerRegistrationFieldId,
  ExtensionSettings,
} from '../types';
import { normalizeText } from '../text';

const MANAGED_ATTRIBUTE = 'data-app-room-customer-registration-fields';
const EXTRA_SECTION_ATTRIBUTE = 'data-app-room-customer-registration-extra';
const EXTRA_SECTION_CONTENT_ATTRIBUTE = 'data-app-room-customer-registration-extra-content';
const REQUIRED_FEEDBACK_ATTRIBUTE = 'data-app-room-required-feedback';
const NON_MANDATORY_FIELD_DEFAULTS = new Map<CustomerRegistrationFieldId, string>([
  ['zip', '0000'],
  ['city', '-'],
]);

type SupportedLanguage = 'de' | 'en' | 'fr' | 'it';

type FieldCopy = Record<CustomerRegistrationFieldId, string>;

const FIELD_LABELS: Record<SupportedLanguage, FieldCopy> = {
  de: {
    salutation: 'Anrede',
    firstname: 'Vorname',
    lastname: 'Name',
    street: 'Strasse',
    zip: 'PLZ',
    city: 'Ort',
    mobile: 'Tel. Mobile',
    mail: 'E-Mail Adresse',
    phone_private: 'Tel. Privat',
    phone_work: 'Tel. Geschäft',
    website: 'Website',
    birthday: 'Geburtstag',
  },
  en: {
    salutation: 'Salutation',
    firstname: 'First name',
    lastname: 'Last name',
    street: 'Street',
    zip: 'Postcode',
    city: 'City',
    mobile: 'Mobile phone',
    mail: 'Email address',
    phone_private: 'Private phone',
    phone_work: 'Work phone',
    website: 'Website',
    birthday: 'Birthday',
  },
  fr: {
    salutation: 'Civilité',
    firstname: 'Prénom',
    lastname: 'Nom',
    street: 'Rue',
    zip: 'NPA',
    city: 'Lieu',
    mobile: 'Tél. mobile',
    mail: 'Adresse e-mail',
    phone_private: 'Tél. privé',
    phone_work: 'Tél. professionnel',
    website: 'Site web',
    birthday: 'Date de naissance',
  },
  it: {
    salutation: 'Titolo',
    firstname: 'Nome',
    lastname: 'Cognome',
    street: 'Via',
    zip: 'NPA',
    city: 'Località',
    mobile: 'Cellulare',
    mail: 'Indirizzo e-mail',
    phone_private: 'Tel. privato',
    phone_work: 'Tel. lavoro',
    website: 'Sito web',
    birthday: 'Data di nascita',
  },
};

const EXTRA_LABELS: Record<SupportedLanguage, string> = {
  de: 'Extra',
  en: 'Extra',
  fr: 'Extra',
  it: 'Extra',
};

const REQUIRED_MESSAGES: Record<SupportedLanguage, FieldCopy> = {
  de: {
    salutation: 'Bitte wählen Sie eine Anrede aus.',
    firstname: 'Bitte geben Sie einen Vornamen ein.',
    lastname: 'Bitte geben Sie einen Namen ein.',
    street: 'Bitte geben Sie eine Strasse ein.',
    zip: 'Bitte geben Sie eine PLZ ein.',
    city: 'Bitte geben Sie einen Ort ein.',
    mobile: 'Bitte geben Sie eine Mobile-Telefonnummer ein.',
    mail: 'Bitte geben Sie eine E-Mail Adresse ein.',
    phone_private: 'Bitte geben Sie eine private Telefonnummer ein.',
    phone_work: 'Bitte geben Sie eine geschäftliche Telefonnummer ein.',
    website: 'Bitte geben Sie eine Website ein.',
    birthday: 'Bitte geben Sie ein Geburtsdatum ein.',
  },
  en: {
    salutation: 'Please choose a salutation.',
    firstname: 'Please enter a first name.',
    lastname: 'Please enter a last name.',
    street: 'Please enter a street.',
    zip: 'Please enter a postcode.',
    city: 'Please enter a city.',
    mobile: 'Please enter a mobile phone number.',
    mail: 'Please enter an email address.',
    phone_private: 'Please enter a private phone number.',
    phone_work: 'Please enter a work phone number.',
    website: 'Please enter a website.',
    birthday: 'Please enter a birthday.',
  },
  fr: {
    salutation: 'Veuillez choisir une civilité.',
    firstname: 'Veuillez saisir un prénom.',
    lastname: 'Veuillez saisir un nom.',
    street: 'Veuillez saisir une rue.',
    zip: 'Veuillez saisir un NPA.',
    city: 'Veuillez saisir un lieu.',
    mobile: 'Veuillez saisir un numéro de téléphone mobile.',
    mail: 'Veuillez saisir une adresse e-mail.',
    phone_private: 'Veuillez saisir un numéro de téléphone privé.',
    phone_work: 'Veuillez saisir un numéro de téléphone professionnel.',
    website: 'Veuillez saisir un site web.',
    birthday: 'Veuillez saisir une date de naissance.',
  },
  it: {
    salutation: 'Seleziona un titolo.',
    firstname: 'Inserisci un nome.',
    lastname: 'Inserisci un cognome.',
    street: 'Inserisci una via.',
    zip: 'Inserisci un NPA.',
    city: 'Inserisci una località.',
    mobile: 'Inserisci un numero di cellulare.',
    mail: 'Inserisci un indirizzo e-mail.',
    phone_private: 'Inserisci un numero di telefono privato.',
    phone_work: 'Inserisci un numero di telefono di lavoro.',
    website: 'Inserisci un sito web.',
    birthday: 'Inserisci una data di nascita.',
  },
};

type CustomerRegistrationFieldDefinition =
  (typeof CUSTOMER_REGISTRATION_FIELD_DEFINITIONS)[number];

type OriginalPosition = {
  parent: HTMLElement;
  index: number;
};

function setText(element: HTMLElement, text: string) {
  if (element.textContent !== text) {
    element.textContent = text;
  }
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

function getControlInputs(field: CustomerRegistrationFieldDefinition) {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[formcontrolname="${field.formControlName}"]`,
    ),
  );
}

function getPrimaryInput(field: CustomerRegistrationFieldDefinition) {
  return getControlInputs(field)[0] ?? null;
}

function getFieldGroup(field: CustomerRegistrationFieldDefinition) {
  return getPrimaryInput(field)?.closest<HTMLElement>('.form-group') ?? null;
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
    setText(existingLabel, text);
    return existingLabel;
  }

  const label = document.createElement('label');
  label.className = 'mb-1';
  label.htmlFor = input.id;
  label.textContent = text;
  input.before(label);
  return label;
}

function setInputValue(input: HTMLInputElement, value: string) {
  if (input.value === value) {
    return;
  }

  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function isRadioField(field: CustomerRegistrationFieldDefinition) {
  return getPrimaryInput(field)?.type === 'radio';
}

function getFieldValue(field: CustomerRegistrationFieldDefinition) {
  const inputs = getControlInputs(field);
  if (inputs[0]?.type === 'radio') {
    return inputs.find((input) => input.checked)?.value ?? '';
  }

  return inputs[0]?.value ?? '';
}

function getFieldSettingIds() {
  return CUSTOMER_REGISTRATION_FIELD_DEFINITIONS.flatMap((field) => [
    field.moveToExtraSetting,
    field.mandatorySetting,
    field.labelSettings.de,
    field.labelSettings.en,
    field.labelSettings.it,
    field.labelSettings.fr,
  ]);
}

export class CustomerRegistrationFieldsController {
  private active = false;

  private form: HTMLFormElement | null = null;

  private formObserver: MutationObserver | null = null;

  private pageObserver: MutationObserver | null = null;

  private originalPositions = new Map<HTMLElement, OriginalPosition>();

  private observedRequiredInputs = new Set<HTMLInputElement>();

  private unwatchSettings: Array<() => void> = [];

  private settings: ExtensionSettings = DEFAULT_SETTINGS;

  private applying = false;

  sync(enabled: boolean) {
    if (!enabled) {
      this.detach();
      return;
    }

    if (this.active) {
      this.bindCurrentForm();
      this.applyFieldCustomisations();
      return;
    }

    this.active = true;
    this.bindSettingWatchers();
    void this.initialize();
  }

  private async initialize() {
    this.settings = await getSettings();
    this.bindPageObserver();
    this.bindCurrentForm();
    this.applyFieldCustomisations();
  }

  private bindSettingWatchers() {
    if (this.unwatchSettings.length > 0) {
      return;
    }

    const settingIds = getFieldSettingIds();

    this.unwatchSettings = settingIds.map((settingId) =>
      watchSetting(settingId, (newValue) => {
        this.settings = {
          ...this.settings,
          [settingId]: newValue,
        };
        this.applyFieldCustomisations();
      }),
    );
  }

  private bindPageObserver() {
    if (this.pageObserver || !document.body) {
      return;
    }

    this.pageObserver = new MutationObserver(() => {
      this.bindCurrentForm();
      this.applyFieldCustomisations();
    });
    this.pageObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private bindCurrentForm() {
    const form = document.querySelector<HTMLFormElement>('app-registration form');
    if (!form || form === this.form) {
      return;
    }

    this.bindForm(form);
  }

  private bindForm(form: HTMLFormElement) {
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
    this.active = false;
    this.unwatchSettings.forEach((unwatch) => unwatch());
    this.unwatchSettings = [];
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
      input.removeEventListener('change', this.handleRequiredInput);
      input.required = false;
      input.removeAttribute('aria-required');
      input.setCustomValidity('');
      input.classList.remove('is-invalid');
    }
    this.observedRequiredInputs.clear();

    this.restoreExtraFields();
    this.getExtraSection()?.remove();
    this.clearRequiredFeedback();
  }

  private applyFieldCustomisations() {
    if (this.applying || !this.form) {
      return;
    }

    this.applying = true;
    try {
      this.moveConfiguredExtraFields();
      this.configureLabels();
      this.configureRequiredFields();
      this.applyNonMandatoryDefaults();
    } finally {
      this.applying = false;
    }
  }

  private getLanguage() {
    return getSelectedLanguage();
  }

  private getFieldLabel(field: CustomerRegistrationFieldDefinition) {
    const language = this.getLanguage();
    const override = normalizeText(this.settings[field.labelSettings[language]]);

    return override || FIELD_LABELS[language][field.id];
  }

  private getFieldLabelWithRequiredMark(field: CustomerRegistrationFieldDefinition) {
    const label = this.getFieldLabel(field);
    return this.settings[field.mandatorySetting] ? `${label} *` : label;
  }

  private configureLabels() {
    for (const field of CUSTOMER_REGISTRATION_FIELD_DEFINITIONS) {
      const input = getPrimaryInput(field);
      if (!input) {
        continue;
      }

      const fieldsetLegend = input.closest('fieldset')?.querySelector<HTMLElement>('legend');
      const labelText = this.getFieldLabelWithRequiredMark(field);

      if (fieldsetLegend) {
        setText(fieldsetLegend, labelText);
        continue;
      }

      ensureLabel(input, labelText);
    }

    this.updateExtraSectionSummary();
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

    this.updateExtraSectionSummary();
    return content;
  }

  private updateExtraSectionSummary() {
    const summary = this.getExtraSection()?.querySelector<HTMLElement>('summary');
    if (summary) {
      setText(summary, EXTRA_LABELS[this.getLanguage()]);
    }
  }

  private getExtraSectionAnchor() {
    const mailField = CUSTOMER_REGISTRATION_FIELD_DEFINITIONS.find((field) => field.id === 'mail');
    const mobileField = CUSTOMER_REGISTRATION_FIELD_DEFINITIONS.find(
      (field) => field.id === 'mobile',
    );
    return (mailField && getFieldGroup(mailField)) ?? (mobileField && getFieldGroup(mobileField));
  }

  private moveConfiguredExtraFields() {
    const fieldsToMove = CUSTOMER_REGISTRATION_FIELD_DEFINITIONS.filter(
      (field) => this.settings[field.moveToExtraSetting],
    );
    const desiredGroups = new Set<HTMLElement>();
    const content = fieldsToMove.length > 0 ? this.ensureExtraSection() : null;

    for (const field of fieldsToMove) {
      const group = getFieldGroup(field);
      if (!group || !content) {
        continue;
      }

      desiredGroups.add(group);

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

    for (const [group, position] of Array.from(this.originalPositions.entries())) {
      if (!desiredGroups.has(group)) {
        this.restoreFieldGroup(group, position);
        this.originalPositions.delete(group);
      }
    }

    if (this.originalPositions.size === 0) {
      this.getExtraSection()?.remove();
    }
  }

  private restoreFieldGroup(group: HTMLElement, position: OriginalPosition) {
    const currentChildren = Array.from(position.parent.children);
    const referenceElement = currentChildren[position.index] ?? null;
    position.parent.insertBefore(group, referenceElement);
    group.style.display = '';
    group.removeAttribute(MANAGED_ATTRIBUTE);
  }

  private restoreExtraFields() {
    const entries = Array.from(this.originalPositions.entries()).sort(
      ([, first], [, second]) => first.index - second.index,
    );

    for (const [group, position] of entries) {
      this.restoreFieldGroup(group, position);
    }

    this.originalPositions.clear();
  }

  private configureRequiredFields() {
    const configuredInputs = new Set<HTMLInputElement>();

    for (const field of CUSTOMER_REGISTRATION_FIELD_DEFINITIONS) {
      const inputs = getControlInputs(field);
      const mandatory = this.settings[field.mandatorySetting];

      for (const input of inputs) {
        input.required = mandatory;
        input.toggleAttribute('aria-required', mandatory);
        configuredInputs.add(input);

        if (!this.observedRequiredInputs.has(input)) {
          this.observedRequiredInputs.add(input);
          input.addEventListener('input', this.handleRequiredInput);
          input.addEventListener('change', this.handleRequiredInput);
        }

        if (!mandatory) {
          this.clearRequiredError(field.id, input);
        }
      }
    }

    for (const input of Array.from(this.observedRequiredInputs)) {
      if (configuredInputs.has(input)) {
        continue;
      }

      input.removeEventListener('input', this.handleRequiredInput);
      input.removeEventListener('change', this.handleRequiredInput);
      this.observedRequiredInputs.delete(input);
    }
  }

  private applyNonMandatoryDefaults() {
    for (const field of CUSTOMER_REGISTRATION_FIELD_DEFINITIONS) {
      if (this.settings[field.mandatorySetting]) {
        continue;
      }

      const defaultValue = NON_MANDATORY_FIELD_DEFAULTS.get(field.id);
      const input = getPrimaryInput(field);
      if (defaultValue && input && normalizeText(input.value) === '') {
        setInputValue(input, defaultValue);
      }
    }
  }

  private getRequiredFeedback(fieldName: CustomerRegistrationFieldId) {
    return document.querySelector<HTMLElement>(
      `[${REQUIRED_FEEDBACK_ATTRIBUTE}="${CSS.escape(fieldName)}"]`,
    );
  }

  private showRequiredError(field: CustomerRegistrationFieldDefinition) {
    const input = getPrimaryInput(field);
    if (!input) {
      return;
    }

    const message = REQUIRED_MESSAGES[this.getLanguage()][field.id];
    getControlInputs(field).forEach((fieldInput) => {
      fieldInput.setCustomValidity(message);
      fieldInput.classList.add('is-invalid');
    });

    const group = getFieldGroup(field);
    if (!group || this.getRequiredFeedback(field.id)) {
      return;
    }

    const feedback = document.createElement('div');
    feedback.className = 'invalid-feedback d-block';
    feedback.setAttribute(REQUIRED_FEEDBACK_ATTRIBUTE, field.id);
    feedback.textContent = message;
    group.append(feedback);
  }

  private clearRequiredError(
    fieldName: CustomerRegistrationFieldId,
    input: HTMLInputElement | null = null,
  ) {
    if (input) {
      input.setCustomValidity('');
      input.classList.remove('is-invalid');
    }

    this.getRequiredFeedback(fieldName)?.remove();
  }

  private clearRequiredFeedback() {
    document
      .querySelectorAll<HTMLElement>(`[${REQUIRED_FEEDBACK_ATTRIBUTE}]`)
      .forEach((feedback) => feedback.remove());
  }

  private readonly handleRequiredInput = (event: Event) => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const field = CUSTOMER_REGISTRATION_FIELD_DEFINITIONS.find((definition) =>
      getControlInputs(definition).includes(input),
    );
    if (!field || this.isFieldMissing(field)) {
      return;
    }

    getControlInputs(field).forEach((fieldInput) =>
      this.clearRequiredError(field.id, fieldInput),
    );
  };

  private isFieldMissing(field: CustomerRegistrationFieldDefinition) {
    if (!this.settings[field.mandatorySetting]) {
      return false;
    }

    const value = normalizeText(getFieldValue(field));
    return isRadioField(field) ? value === '' : value === '';
  }

  private readonly handleSubmit = (event: SubmitEvent) => {
    this.applyFieldCustomisations();

    let firstInvalidInput: HTMLInputElement | null = null;

    for (const field of CUSTOMER_REGISTRATION_FIELD_DEFINITIONS) {
      if (!this.isFieldMissing(field)) {
        getControlInputs(field).forEach((input) => this.clearRequiredError(field.id, input));
        continue;
      }

      this.showRequiredError(field);
      firstInvalidInput ??= getPrimaryInput(field);
    }

    if (!firstInvalidInput) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    firstInvalidInput.focus();
  };
}
