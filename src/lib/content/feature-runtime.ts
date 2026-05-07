import { announceFeatureActivation, logErpDebug } from './feature-activation-log';
import { getSettings } from '../settings';
import type { ExtensionSettings, FeatureId } from '../types';
import { createIntegratedUi } from 'wxt/utils/content-script-ui/integrated';
import type { IntegratedContentScriptUi } from 'wxt/utils/content-script-ui/integrated';
import type { ContentScriptAppendMode } from 'wxt/utils/content-script-ui/types';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';

type UrlCondition = {
  pathEquals?: string;
  pathPrefix?: string;
  searchIncludes?: string;
};

export type ContentFeatureDefinition = {
  id: FeatureId;
  label: string;
  url: UrlCondition;
  anchor: string;
  append?: ContentScriptAppendMode;
  tag?: string;
  mount: (wrapper: HTMLElement) => void;
  remove?: () => void;
};

type RuntimeFeature = {
  definition: ContentFeatureDefinition;
  ui: IntegratedContentScriptUi<void>;
  autoMounting: boolean;
};

function matchesUrlCondition(condition: UrlCondition) {
  const { pathname, search } = window.location;

  if (condition.pathEquals && pathname !== condition.pathEquals) {
    return false;
  }

  if (condition.pathPrefix && !pathname.startsWith(condition.pathPrefix)) {
    return false;
  }

  if (condition.searchIncludes && !search.includes(condition.searchIncludes)) {
    return false;
  }

  return true;
}

export class ContentFeatureRuntime {
  private settings: ExtensionSettings | null = null;

  private context: ContentScriptContext | null = null;

  private runtimeFeatures: RuntimeFeature[] = [];

  constructor(private readonly features: ContentFeatureDefinition[]) {}

  start(context?: ContentScriptContext) {
    this.context = context ?? null;
    void this.initialize();
  }

  stop() {
    this.runtimeFeatures.forEach(({ ui }) => {
      ui.remove();
    });
    this.runtimeFeatures = [];
  }

  private async initialize() {
    this.settings = await getSettings();

    this.runtimeFeatures = this.features.map((definition) => this.createRuntimeFeature(definition));
    this.context?.addEventListener(window, 'wxt:locationchange', this.scheduleSync);

    this.syncFeatures();
  }

  private createRuntimeFeature(definition: ContentFeatureDefinition): RuntimeFeature {
    if (!this.context) {
      throw new Error('ContentFeatureRuntime requires a WXT content script context.');
    }

    const ui = createIntegratedUi(this.context, {
      anchor: definition.anchor,
      append: definition.append,
      position: 'inline',
      tag: definition.tag ?? 'span',
      onMount: (wrapper) => {
        announceFeatureActivation(definition.id, definition.label);
        logErpDebug('Content feature mounted.', {
          featureId: definition.id,
          anchor: definition.anchor,
        });
        definition.mount(wrapper);
      },
      onRemove: () => {
        definition.remove?.();
      },
    });

    return {
      definition,
      ui,
      autoMounting: false,
    };
  }

  private getRuntimeFeature(featureId: FeatureId) {
    const runtimeFeature = this.runtimeFeatures.find(
      (feature) => feature.definition.id === featureId,
    );
    if (!runtimeFeature) {
      throw new Error(`Unknown content feature: ${featureId}`);
    }

    return runtimeFeature;
  }

  private syncFeature(feature: RuntimeFeature) {
    if (!this.settings) {
      return;
    }

    const shouldAutoMount =
      this.settings.extensionEnabled &&
      this.settings[feature.definition.id] &&
      matchesUrlCondition(feature.definition.url);

    if (shouldAutoMount && !feature.autoMounting) {
      feature.autoMounting = true;
      logErpDebug('Content feature waiting for anchor.', {
        featureId: feature.definition.id,
        anchor: feature.definition.anchor,
        path: window.location.pathname,
        search: window.location.search,
      });
      feature.ui.autoMount();
      return;
    }

    if (!shouldAutoMount && feature.autoMounting) {
      feature.autoMounting = false;
      logErpDebug('Content feature disabled for current page or setting.', {
        featureId: feature.definition.id,
        path: window.location.pathname,
        search: window.location.search,
      });
      feature.ui.remove();
    }
  }

  private readonly scheduleSync = () => {
    this.context?.setTimeout(() => {
      this.syncFeatures();
    }, 0);
  };

  private syncFeatures() {
    this.runtimeFeatures.forEach((feature) => this.syncFeature(feature));
  }
}
