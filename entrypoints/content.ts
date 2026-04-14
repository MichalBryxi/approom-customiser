import { defineContentScript } from '#imports';

export default defineContentScript({
  matches: ['https://erp.app-room.ch/rental/*'],
  runAt: 'document_idle',
  async main() {
    if (window.location.pathname !== '/rental/rent') {
      return;
    }

    const { RentalPrintFeature } = await import('../src/lib/content/rental-print-feature');
    const feature = new RentalPrintFeature();
    feature.start();
  },
});
