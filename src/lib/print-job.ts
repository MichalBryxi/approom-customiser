import type { PrintJob } from './types';

const PRINT_JOB_KEY = 'activePrintJob';

export async function savePrintJob(printJob: PrintJob) {
  await chrome.storage.session.set({ [PRINT_JOB_KEY]: printJob });
}

export async function getPrintJob(): Promise<PrintJob | null> {
  const result = await chrome.storage.session.get(PRINT_JOB_KEY);
  return (result[PRINT_JOB_KEY] as PrintJob | undefined) ?? null;
}

export async function clearPrintJob() {
  await chrome.storage.session.remove(PRINT_JOB_KEY);
}
