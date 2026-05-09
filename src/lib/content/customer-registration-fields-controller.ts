import {
  CUSTOMER_REGISTRATION_FIELD_DEFINITIONS,
  DEFAULT_SETTINGS,
  getSettings,
} from '../settings';
import type {
  CustomerRegistrationFieldId,
  ExtensionSettings,
} from '../types';
import { normalizeText } from '../text';
import { getLanguage, t } from '../i18n';
import type { RentalDuration } from './registration-to-rental-automation';
import { triggerRegistrationToRental } from './registration-to-rental-controller';

const MANAGED_ATTRIBUTE = 'data-app-room-customer-registration-fields';
const RENTAL_BUTTON_ATTRIBUTE = 'data-app-room-rental-buttons';
const RENTAL_DURATIONS: RentalDuration[] = ['halbtag', '1_tag', '2_tage'];
const EXTRA_SECTION_ATTRIBUTE = 'data-app-room-customer-registration-extra';
const EXTRA_SECTION_CONTENT_ATTRIBUTE = 'data-app-room-customer-registration-extra-content';
const REQUIRED_FEEDBACK_ATTRIBUTE = 'data-app-room-required-feedback';
const REQUIRED_STAR_ATTRIBUTE = 'data-app-room-required-star';
const CHAR_BAR_ATTRIBUTE = 'data-app-room-char-bar';
const NON_MANDATORY_FIELD_DEFAULTS = new Map<CustomerRegistrationFieldId, string>([
  ['zip', '3818'],
  ['city', 'Grindelwald'],
]);
const PHONE_FIELD_PREFILL = '+';
const PHONE_FIELDS: CustomerRegistrationFieldId[] = ['mobile', 'phone_private', 'phone_work'];
const FORM_OBSERVER_OPTIONS: MutationObserverInit = {
  childList: true,
  subtree: true,
  characterData: true,
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

function applyLabelContent(element: HTMLElement, text: string, mandatory: boolean) {
  const textNode = element.firstChild?.nodeType === Node.TEXT_NODE ? element.firstChild : null;
  const existingStar = element.querySelector(`[${REQUIRED_STAR_ATTRIBUTE}]`);

  if (textNode?.textContent === text && !!existingStar === mandatory) {
    return;
  }

  element.textContent = text;
  if (mandatory) {
    const star = document.createElement('span');
    star.setAttribute(REQUIRED_STAR_ATTRIBUTE, 'true');
    star.style.color = 'red';
    star.textContent = ' *';
    element.append(star);
  }
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

function ensureLabel(input: HTMLInputElement, text: string, mandatory: boolean) {
  const existingLabel = getLabel(input);
  if (existingLabel) {
    applyLabelContent(existingLabel, text, mandatory);
    return existingLabel;
  }

  const label = document.createElement('label');
  label.className = 'mb-1';
  label.htmlFor = input.id;
  applyLabelContent(label, text, mandatory);
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

export class CustomerRegistrationFieldsController {
  private active = false;

  private rentalButtonsEnabled = false;

  private form: HTMLFormElement | null = null;

  private lastFocusedInput: HTMLInputElement | null = null;

  private originalPositions = new Map<HTMLElement, OriginalPosition>();

  private observedRequiredInputs = new Set<HTMLInputElement>();

  private settings: ExtensionSettings = DEFAULT_SETTINGS;

  private languageObserver: MutationObserver | null = null;

  private formObserver: MutationObserver | null = null;

  sync(enabled: boolean) {
    if (!enabled) {
      return;
    }

    if (this.active) {
      this.bindLanguageObserver();
      this.bindCurrentForm();
      this.applyFieldCustomisations();
      return;
    }

    this.active = true;
    void this.initialize();
  }

  syncRentalButtons(enabled: boolean) {
    this.rentalButtonsEnabled = enabled;
    if (this.active) {
      this.applyFieldCustomisations();
    }
  }

  private async initialize() {
    this.settings = await getSettings();
    this.bindLanguageObserver();
    this.bindCurrentForm();
    this.applyFieldCustomisations();
    this.form?.querySelector<HTMLInputElement>('input[formcontrolname="firstname"]')?.focus();
  }

  private bindLanguageObserver() {
    if (this.languageObserver) {
      console.log('[reg-fields] bindLanguageObserver: already bound, skipping');
      return;
    }

    // Observe the .ng-value-container — Angular replaces the child span[lang] on language
    // change rather than mutating its lang attribute, so childList on the parent is the
    // correct trigger.
    const ngValueContainer = document.querySelector<HTMLElement>(
      'ng-select.language-select .ng-value-container',
    );
    if (!ngValueContainer) {
      console.log('[reg-fields] bindLanguageObserver: .ng-value-container not found in DOM');
      return;
    }

    console.log('[reg-fields] bindLanguageObserver: attaching observer to', ngValueContainer);
    this.languageObserver = new MutationObserver((mutations) => {
      const newLang = ngValueContainer.querySelector<HTMLElement>('.ng-value span[lang]')?.getAttribute('lang');
      console.log('[reg-fields] languageObserver fired —', mutations.length, 'mutation(s), lang now:', newLang);
      this.bindCurrentForm();
      this.applyFieldCustomisations();
    });
    this.languageObserver.observe(ngValueContainer, { childList: true, subtree: true });
  }

  private bindCurrentForm() {
    const form = document.querySelector<HTMLFormElement>('app-registration form');
    if (!form) {
      console.log('[reg-fields] bindCurrentForm: no app-registration form in DOM');
      return;
    }
    if (form === this.form) {
      console.log('[reg-fields] bindCurrentForm: same form element, no rebind needed');
      return;
    }
    console.log('[reg-fields] bindCurrentForm: new form element found, rebinding');
    this.bindForm(form);
  }

  private bindForm(form: HTMLFormElement) {
    this.detachForm();
    this.form = form;
    this.form.addEventListener('submit', this.handleSubmit, true);
    this.formObserver = new MutationObserver((mutations) => {
      console.log('[reg-fields] formObserver fired —', mutations.length, 'mutation(s); types:', [...new Set(mutations.map((m) => m.type))], '; applying customisations');
      this.applyFieldCustomisations();
    });
    this.formObserver.observe(form, FORM_OBSERVER_OPTIONS);
    console.log('[reg-fields] bindForm: observer attached to form', form);
  }

  private detachForm() {
    this.formObserver?.disconnect();
    this.formObserver = null;
    if (this.form) {
      this.form.removeEventListener('submit', this.handleSubmit, true);
      this.form.removeEventListener('focusin', this.handleFocusIn);
      this.form = null;
    }
    for (const input of this.observedRequiredInputs) {
      input.removeEventListener('input', this.handleRequiredInput);
      input.removeEventListener('change', this.handleRequiredInput);
    }
    this.observedRequiredInputs.clear();
    this.originalPositions.clear();
  }

  private applyFieldCustomisations() {
    if (!this.form) {
      return;
    }

    // Disconnect while applying so our own DOM mutations don't re-trigger the observer.
    // Each sub-method is idempotent, so the one extra call that may fire after reconnect
    // (Angular finishing its change-detection cycle) is a safe no-op.
    this.formObserver?.disconnect();
    try {
      this.moveConfiguredExtraFields();
      this.configureLabels();
      this.configureRequiredFields();
      this.applyNonMandatoryDefaults();
      this.applyPhonePrefills();
      this.ensureCharBar();
      this.ensureRentalButtons();
    } finally {
      if (this.form) {
        this.formObserver?.observe(this.form, FORM_OBSERVER_OPTIONS);
      }
    }
  }

  private ensureRentalButtons() {
    if (!this.form) {
      return;
    }

    const submitButton = this.form.querySelector<HTMLButtonElement>('button[type="submit"]');

    if (!this.rentalButtonsEnabled) {
      return;
    }

    if (!submitButton) {
      return;
    }

    let container = this.form.querySelector<HTMLElement>(`[${RENTAL_BUTTON_ATTRIBUTE}]`);

    if (!container) {
      container = document.createElement('span');
      container.setAttribute(RENTAL_BUTTON_ATTRIBUTE, 'true');
      container.style.marginRight = '0.5rem';
      container.style.display = 'flex';
      container.style.gap = '0.5rem';
      container.style.float = 'right';

      for (const duration of RENTAL_DURATIONS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = submitButton.className
          .replace('btn-primary', 'btn-success')
          .replace('float-right', '')
          .trim();
        btn.addEventListener('click', () => {
          void triggerRegistrationToRental(submitButton, duration);
        });
        container.append(btn);
      }

      submitButton.after(container);
    }

    const msgs = t(this.getLanguage());
    setText(submitButton, msgs.submitOnly);
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
    RENTAL_DURATIONS.forEach((duration, i) => {
      const btn = buttons[i];
      if (btn) {
        setText(btn, msgs.duration[duration]);
      }
    });
  }

  private ensureCharBar() {
    if (!this.form || this.form.querySelector(`[${CHAR_BAR_ATTRIBUTE}]`)) {
      return;
    }

    const bar = document.createElement('div');
    bar.setAttribute(CHAR_BAR_ATTRIBUTE, 'true');
    bar.className = 'd-flex mb-3';
    bar.style.gap = '0.5rem';

    for (const char of ['@', '+']) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline-secondary btn-lg';
      btn.textContent = char;
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
      btn.addEventListener('click', () => {
        this.insertChar(char);
      });
      bar.append(btn);
    }

    const submitButton = this.form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const anchor = submitButton?.closest('.form-group') ?? submitButton;
    if (anchor) {
      anchor.before(bar);
    } else {
      this.form.append(bar);
    }

    this.form.addEventListener('focusin', this.handleFocusIn);
  }

  private insertChar(char: string) {
    const input =
      document.activeElement instanceof HTMLInputElement
        ? document.activeElement
        : this.lastFocusedInput;
    if (!input) {
      return;
    }

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = `${input.value.slice(0, start)}${char}${input.value.slice(end)}`;
    input.selectionStart = start + char.length;
    input.selectionEnd = start + char.length;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
  }

  private applyPhonePrefills() {
    for (const field of CUSTOMER_REGISTRATION_FIELD_DEFINITIONS) {
      if (!PHONE_FIELDS.includes(field.id)) {
        continue;
      }

      const input = getPrimaryInput(field);
      if (input && normalizeText(input.value) === '') {
        setInputValue(input, PHONE_FIELD_PREFILL);
      }
    }
  }

  private readonly handleFocusIn = (event: FocusEvent) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement &&
      target.type !== 'radio' &&
      target.type !== 'checkbox'
    ) {
      this.lastFocusedInput = target;
    }
  };

  private getLanguage() {
    return getLanguage();
  }

  private getFieldLabel(field: CustomerRegistrationFieldDefinition) {
    const language = this.getLanguage();
    const override = normalizeText(this.settings[field.labelSettings[language]]);

    return override || t(language).fields[field.id];
  }

  private configureLabels() {
    for (const field of CUSTOMER_REGISTRATION_FIELD_DEFINITIONS) {
      const input = getPrimaryInput(field);
      if (!input) {
        continue;
      }

      const fieldsetLegend = input.closest('fieldset')?.querySelector<HTMLElement>('legend');
      const labelText = this.getFieldLabel(field);
      const mandatory = this.settings[field.mandatorySetting];

      if (fieldsetLegend) {
        applyLabelContent(fieldsetLegend, labelText, mandatory);
        continue;
      }

      ensureLabel(input, labelText, mandatory);
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
      setText(summary, t(this.getLanguage()).extra_section);
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

    const message = t(this.getLanguage()).required[field.id];
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
