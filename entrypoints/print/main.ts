import { clearPrintJob, getPrintJob } from '../../src/lib/print-job';

function renderEmptyState(root: HTMLElement) {
  const message = document.createElement('p');
  message.textContent = 'No print job data was found.';
  root.replaceChildren(message);
}

function renderPrintJob(root: HTMLElement, entries: Array<{ key: string; value: string }>) {
  const list = document.createElement('pre');
  list.textContent = entries.map(({ key, value }) => `${key}: ${value}`).join('\n');
  root.replaceChildren(list);
}

async function closePrintPage() {
  await clearPrintJob();
  window.close();
}

async function boot() {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) {
    return;
  }

  const printJob = await getPrintJob();
  if (!printJob) {
    renderEmptyState(root);
    return;
  }

  renderPrintJob(root, printJob.entries);

  window.addEventListener(
    'afterprint',
    () => {
      void closePrintPage();
    },
    { once: true },
  );

  window.setTimeout(() => {
    window.print();
  }, 50);
}

void boot();
