import de from './de.json';
import en from './en.json';
import fr from './fr.json';
import it from './it.json';

export type Language = 'de' | 'en' | 'fr' | 'it';

export type Messages = typeof de;

const MESSAGES: Record<Language, Messages> = {
  de,
  en: en as Messages,
  fr: fr as Messages,
  it: it as Messages,
};

export function t(lang: Language): Messages {
  return MESSAGES[lang];
}

export function getLanguage(): Language {
  const lang =
    document
      .querySelector<HTMLElement>('ng-select.language-select .ng-value span[lang]')
      ?.getAttribute('lang')
      ?.toLowerCase() ?? document.documentElement.lang.toLowerCase();

  return lang === 'en' || lang === 'fr' || lang === 'it' ? lang : 'de';
}
