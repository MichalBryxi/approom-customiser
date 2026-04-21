import { defineContentScript } from '#imports';

export default defineContentScript({
  matches: ['https://erp.app-room.ch/rental/*', 'https://erp.app-room.ch/org/storage/*'],
  runAt: 'document_idle',
  async main() {
    if (window.location.pathname === '/rental/rent') {
      const { RentalPrintFeature } = await import('../src/lib/content/rental-print-feature');
      const feature = new RentalPrintFeature();
      feature.start();
      return;
    }

    if (window.location.pathname === '/org/storage/order') {
      const { StorageOrderBarcodeFeature } = await import(
        '../src/lib/content/storage-order-barcode-feature'
      );
      const feature = new StorageOrderBarcodeFeature();
      feature.start();
    }
  },
});
