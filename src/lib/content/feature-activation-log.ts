const ERP_EMOJI = '🦊';
const ANNOUNCED_FEATURES_KEY = '__appRoomEnhancerAnnouncedFeatures';

type FeatureWindow = Window & {
  [ANNOUNCED_FEATURES_KEY]?: Set<string>;
};

function getAnnouncedFeatures() {
  if (typeof window === 'undefined') {
    return new Set<string>();
  }

  const featureWindow = window as FeatureWindow;
  if (!featureWindow[ANNOUNCED_FEATURES_KEY]) {
    featureWindow[ANNOUNCED_FEATURES_KEY] = new Set<string>();
  }

  return featureWindow[ANNOUNCED_FEATURES_KEY]!;
}

export function announceFeatureActivation(featureKey: string, featureName: string) {
  const announcedFeatures = getAnnouncedFeatures();
  if (announcedFeatures.has(featureKey)) {
    return;
  }

  announcedFeatures.add(featureKey);
  console.info(`${ERP_EMOJI} ${featureName}`);
}

export function logErpDebug(message: string, details?: unknown) {
  if (typeof details === 'undefined') {
    console.info(`${ERP_EMOJI} ${message}`);
    return;
  }

  console.info(`${ERP_EMOJI} ${message}`, details);
}
