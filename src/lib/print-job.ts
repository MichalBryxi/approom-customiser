import type { PrintJob } from './types';

const PRINT_JOB_KEY = 'activePrintJob';
const SAVE_PRINT_JOB_MESSAGE_TYPE = 'print-job/save';

type SavePrintJobMessage = {
  type: typeof SAVE_PRINT_JOB_MESSAGE_TYPE;
  payload: PrintJob;
};

export function isSavePrintJobMessage(message: unknown): message is SavePrintJobMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    (message as { type?: unknown }).type === SAVE_PRINT_JOB_MESSAGE_TYPE
  );
}

export async function savePrintJob(printJob: PrintJob) {
  await chrome.runtime.sendMessage({
    type: SAVE_PRINT_JOB_MESSAGE_TYPE,
    payload: printJob,
  } satisfies SavePrintJobMessage);
}

export async function getPrintJob(): Promise<PrintJob | null> {
  const result = await chrome.storage.session.get(PRINT_JOB_KEY);
  return (result[PRINT_JOB_KEY] as PrintJob | undefined) ?? null;
}

export async function clearPrintJob() {
  await chrome.storage.session.remove(PRINT_JOB_KEY);
}

export async function savePrintJobFromBackground(printJob: PrintJob) {
  await chrome.storage.session.set({ [PRINT_JOB_KEY]: printJob });
}
