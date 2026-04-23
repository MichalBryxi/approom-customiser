import { defineContentScript } from '#imports';
import { CONTENT_FEATURES } from '../src/lib/content/feature-config';
import { ContentFeatureRuntime } from '../src/lib/content/feature-runtime';

export default defineContentScript({
  matches: ['https://erp.app-room.ch/*'],
  allFrames: true,
  runAt: 'document_idle',
  main(ctx) {
    const runtime = new ContentFeatureRuntime(CONTENT_FEATURES);
    runtime.start(ctx);
  },
});
