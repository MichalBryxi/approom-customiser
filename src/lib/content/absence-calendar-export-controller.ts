import { storage } from 'wxt/utils/storage';
import { getSettings } from '../settings';

type ExportState = {
  currentMandant: string;
  remaining: string[];
  markActive: boolean;
  rows: string[];
  headerRow: string;
  startedAt: number;
};

const STATE_KEY = 'local:absenceExportState' as const;
const STATE_TTL_MS = 60_000;

function csvCell(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvRow(cells: string[]): string {
  return cells.map(csvCell).join(';');
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export class AbsenceCalendarExportController {
  mount(wrapper: HTMLElement) {
    void this.initialize(wrapper);
  }

  private async initialize(wrapper: HTMLElement) {
    const state = await storage.getItem<ExportState>(STATE_KEY);

    if (state) {
      if (Date.now() - state.startedAt > STATE_TTL_MS) {
        await storage.removeItem(STATE_KEY);
      } else {
        await this.continueExport(state);
        // If continueExport navigated away, the page reloads before buttons render.
        // If export is done (no navigation), fall through to render buttons normally.
      }
    }

    const settings = await getSettings();
    this.renderButtons(wrapper, settings.absenceCalendarExportMarkActive, settings.absenceCalendarExportMandantPattern);
  }

  private renderButtons(wrapper: HTMLElement, markActive: boolean, mandantPattern: string) {
    const singleBtn = document.createElement('button');
    singleBtn.type = 'button';
    singleBtn.className = 'btn btn-sm btn-default';
    singleBtn.textContent = 'CSV exportieren';
    singleBtn.style.marginRight = '3px';
    singleBtn.addEventListener('click', () => { void this.exportSingle(markActive); });
    wrapper.append(singleBtn);

    if (mandantPattern) {
      const allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.className = 'btn btn-sm btn-default';
      allBtn.textContent = 'Alle Mandanten exportieren';
      allBtn.style.marginRight = '3px';
      allBtn.addEventListener('click', () => { void this.startAllMandantsExport(mandantPattern, markActive); });
      wrapper.append(allBtn);
    }
  }

  private async exportSingle(markActive: boolean) {
    const data = this.harvest(markActive);
    if (!data) return;
    const lines = [data.headerRow];
    if (data.subheaderRow) lines.push(data.subheaderRow);
    lines.push(...data.rows);
    downloadCsv(lines.join('\n'), this.buildFilename());
  }

  private harvest(markActive: boolean): { headerRow: string; subheaderRow: string | null; rows: string[] } | null {
    const thead = document.getElementById('absences_table_head');
    if (!thead) return null;
    const tbody = thead.closest('table')?.querySelector('tbody');
    if (!tbody) return null;

    const ths = Array.from(thead.querySelectorAll<HTMLTableCellElement>('th'));
    const headerCells = ['Mitarbeiter'];
    let month = '';
    let year = '';
    for (let i = 1; i < ths.length; i++) {
      const parts = ths[i].id.split('_');
      const day = parts.at(-3) ?? '';
      month = parts.at(-2) ?? month;
      year = parts.at(-1) ?? year;
      headerCells.push(`${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`);
    }

    const toCells = (tr: Element) =>
      Array.from(tr.querySelectorAll('td')).map((td) => {
        const text = td.textContent?.trim() ?? '';
        if (!text && markActive && td.classList.contains('active')) return '-';
        return text;
      });

    let subheaderRow: string | null = null;
    const rows: string[] = [];

    for (const tr of tbody.querySelectorAll('tr')) {
      const cells = toCells(tr);
      if (cells[0] === 'Wochentag') {
        subheaderRow = toCsvRow(cells);
      } else {
        rows.push(toCsvRow(cells));
      }
    }

    return { headerRow: toCsvRow(headerCells), subheaderRow, rows };
  }

  private buildFilename(): string {
    const year = document.getElementById('year_now')?.textContent?.trim() ?? '';
    const firstDataTh = document.getElementById('absences_table_head')?.querySelectorAll('th')[1];
    const parts = firstDataTh?.id.split('_') ?? [];
    const month = (parts.at(-2) ?? '').padStart(2, '0');
    return `abwesenheiten-${year}-${month}.csv`;
  }

  private async startAllMandantsExport(pattern: string, markActive: boolean) {
    let regex: RegExp;
    try {
      regex = new RegExp(pattern);
    } catch {
      return;
    }

    const mandants = await this.getMandantsFromParent(regex);
    if (mandants.length === 0) return;

    const state: ExportState = {
      currentMandant: mandants[0],
      remaining: mandants.slice(1),
      markActive,
      rows: [],
      headerRow: '',
      startedAt: Date.now(),
    };
    await storage.setItem(STATE_KEY, state);
    await this.switchMandant(mandants[0]);
  }

  private async continueExport(state: ExportState) {
    const data = this.harvest(state.markActive);
    if (data) {
      if (!state.headerRow) {
        // Include the weekday subheader once, right under the date header
        const lines = ['Mandant;' + data.headerRow];
        if (data.subheaderRow) lines.push(';' + data.subheaderRow);
        state.headerRow = lines.join('\n');
      }
      state.rows.push(...data.rows.map((row) => csvCell(state.currentMandant) + ';' + row));
    }

    if (state.remaining.length === 0) {
      await storage.removeItem(STATE_KEY);
      downloadCsv([state.headerRow, ...state.rows].join('\n'), `alle-mandanten-${this.buildFilename()}`);
    } else {
      const next = state.remaining[0];
      state.currentMandant = next;
      state.remaining = state.remaining.slice(1);
      await storage.setItem(STATE_KEY, state);
      await this.switchMandant(next);
    }
  }

  private async getMandantsFromParent(regex: RegExp): Promise<string[]> {
    const parentDoc = window.parent.document;
    const trigger = parentDoc.querySelector<HTMLButtonElement>('[data-cy="topbar-location-switch"]');
    if (!trigger) return [];

    // Current mandant is shown in the trigger button as "| BikeBox Schmerikon", not in the dropdown list.
    const currentMandant = trigger
      .querySelector<HTMLElement>('.btn-content div span')
      ?.textContent?.trim()
      .replace(/^\|\s*/, '') ?? '';

    trigger.click();
    await this.waitForParentDropdown(parentDoc, 'open');

    const dropdownNames = Array.from(parentDoc.querySelectorAll<HTMLButtonElement>('.location-dropdown button'))
      .map((btn) => btn.querySelector<HTMLElement>('span.medium-text')?.textContent?.trim() ?? '')
      .filter(Boolean);

    trigger.click();
    await this.waitForParentDropdown(parentDoc, 'closed');

    // Combine current mandant with dropdown items, deduplicate, then filter by regex.
    const all = [...new Set([currentMandant, ...dropdownNames].filter(Boolean))];
    const names = all.filter((name) => regex.test(name));

    return names;
  }

  private async switchMandant(name: string) {
    const parentDoc = window.parent.document;
    const trigger = parentDoc.querySelector<HTMLButtonElement>('[data-cy="topbar-location-switch"]');
    if (!trigger) return;

    trigger.click();
    await this.waitForParentDropdown(parentDoc, 'open');

    const btn = Array.from(parentDoc.querySelectorAll<HTMLButtonElement>('.location-dropdown button'))
      .find((b) => b.querySelector<HTMLElement>('span.medium-text')?.textContent?.trim() === name);

    if (btn) {
      btn.click();
      await new Promise((r) => setTimeout(r, 300));
    }

    window.location.href = '/start.php?men_link=personalplanung&men_tool=cal_ferien';
  }

  private waitForParentDropdown(parentDoc: Document, target: 'open' | 'closed'): Promise<void> {
    return new Promise((resolve) => {
      const trigger = parentDoc.querySelector('[data-cy="topbar-location-switch"]');
      const container = trigger?.closest('.custom-dropdown');
      if (!container) { resolve(); return; }

      const targetClass = target === 'open' ? 'dropdown-open' : 'dropdown-closed';
      if (container.classList.contains(targetClass)) { resolve(); return; }

      const observer = new MutationObserver(() => {
        if (container.classList.contains(targetClass)) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(container, { attributes: true, attributeFilter: ['class'] });
      setTimeout(() => { observer.disconnect(); resolve(); }, 2000);
    });
  }
}
