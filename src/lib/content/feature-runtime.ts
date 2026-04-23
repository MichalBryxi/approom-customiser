import { announceFeatureActivation } from './feature-activation-log';
import { getSettings } from '../settings';
import type { ExtensionSettings, FeatureId } from '../types';

type UrlCondition = {
  pathEquals?: string;
  pathPrefix?: string;
};

type DomCondition = {
  selector: string;
  textIncludes?: string;
};

export type ContentFeatureDefinition = {
  id: FeatureId;
  label: string;
  url: UrlCondition;
  dom: DomCondition;
  sync: (enabled: boolean) => void;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function matchesUrlCondition(condition: UrlCondition) {
  const { pathname } = window.location;

  if (condition.pathEquals && pathname !== condition.pathEquals) {
    return false;
  }

  if (condition.pathPrefix && !pathname.startsWith(condition.pathPrefix)) {
    return false;
  }

  return true;
}

function matchesDomCondition(condition: DomCondition) {
  return Array.from(document.querySelectorAll<HTMLElement>(condition.selector)).some((element) => {
    if (!condition.textIncludes) {
      return true;
    }

    return normalizeText(element.textContent).includes(condition.textIncludes);
  });
}

export class ContentFeatureRuntime {
  private settings: ExtensionSettings | null = null;

  private observer: MutationObserver | null = null;

  private checkScheduled = false;

  private originalPushState: History['pushState'] | null = null;

  private originalReplaceState: History['replaceState'] | null = null;

  private patchedPushState: History['pushState'] | null = null;

  private patchedReplaceState: History['replaceState'] | null = null;

  constructor(private readonly features: ContentFeatureDefinition[]) {}

  start() {
    void this.initialize();
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;

    chrome.storage.onChanged.removeListener(this.handleStorageChange);
    window.removeEventListener('popstate', this.scheduleSync);
    window.removeEventListener('hashchange', this.scheduleSync);

    if (this.originalPushState && history.pushState === this.patchedPushState) {
      history.pushState = this.originalPushState;
    }

    if (this.originalReplaceState && history.replaceState === this.patchedReplaceState) {
      history.replaceState = this.originalReplaceState;
    }
  }

  private async initialize() {
    this.settings = await getSettings();

    chrome.storage.onChanged.addListener(this.handleStorageChange);
    this.installUrlChangeListeners();

    this.observer = new MutationObserver(() => {
      this.scheduleSync();
    });

    this.observer.observe(document.body, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });

    this.syncFeatures();
  }

  private installUrlChangeListeners() {
    this.originalPushState = history.pushState;
    this.originalReplaceState = history.replaceState;

    const originalPushState = this.originalPushState.bind(history);
    this.patchedPushState = ((...args: Parameters<History['pushState']>) => {
      originalPushState(...args);
      this.scheduleSync();
    }) as History['pushState'];
    history.pushState = this.patchedPushState;

    const originalReplaceState = this.originalReplaceState.bind(history);
    this.patchedReplaceState = ((...args: Parameters<History['replaceState']>) => {
      originalReplaceState(...args);
      this.scheduleSync();
    }) as History['replaceState'];
    history.replaceState = this.patchedReplaceState;

    window.addEventListener('popstate', this.scheduleSync);
    window.addEventListener('hashchange', this.scheduleSync);
  }

  private readonly handleStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== 'sync' || !this.settings) {
      return;
    }

    const nextSettings = { ...this.settings };
    let settingsChanged = false;

    for (const feature of this.features) {
      const change = changes[feature.id];
      if (!change) {
        continue;
      }

      nextSettings[feature.id] = Boolean(change.newValue);
      settingsChanged = true;
    }

    if (!settingsChanged) {
      return;
    }

    this.settings = nextSettings;
    this.scheduleSync();
  };

  private readonly scheduleSync = () => {
    if (this.checkScheduled) {
      return;
    }

    this.checkScheduled = true;
    window.setTimeout(() => {
      this.checkScheduled = false;
      this.syncFeatures();
    }, 0);
  };

  private syncFeatures() {
    if (!this.settings) {
      return;
    }

    for (const feature of this.features) {
      const enabled =
        this.settings[feature.id] &&
        matchesUrlCondition(feature.url) &&
        matchesDomCondition(feature.dom);

      if (enabled) {
        announceFeatureActivation(feature.id, feature.label);
      }

      feature.sync(enabled);
    }
  }
}
