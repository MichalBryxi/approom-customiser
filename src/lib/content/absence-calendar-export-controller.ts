import { getSettings } from '../settings';

function csvCell(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export class AbsenceCalendarExportController {
  mount(wrapper: HTMLElement) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-default';
    btn.textContent = 'CSV exportieren';
    btn.style.marginRight = '3px';
    btn.addEventListener('click', () => { void this.exportCsv(); });
    wrapper.append(btn);
  }

  private async exportCsv() {
    const thead = document.getElementById('absences_table_head');
    if (!thead) return;

    const tbody = thead.closest('table')?.querySelector('tbody');
    if (!tbody) return;

    const { absenceCalendarExportMarkActive } = await getSettings();

    const ths = Array.from(thead.querySelectorAll<HTMLTableCellElement>('th'));

    // Build date headers from th IDs: format is "{prefix}_{day}_{month}_{year}"
    const headers = ['Mitarbeiter'];
    let month = '';
    let year = '';
    for (let i = 1; i < ths.length; i++) {
      const parts = ths[i].id.split('_');
      const day = parts.at(-3) ?? '';
      month = parts.at(-2) ?? month;
      year = parts.at(-1) ?? year;
      headers.push(`${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`);
    }

    const rows: string[][] = [headers];
    for (const tr of tbody.querySelectorAll('tr')) {
      rows.push(
        Array.from(tr.querySelectorAll('td')).map((td) => {
          const text = td.textContent?.trim() ?? '';
          if (!text && absenceCalendarExportMarkActive && td.classList.contains('active')) {
            return '-';
          }
          return text;
        }),
      );
    }

    const csv = rows.map((row) => row.map(csvCell).join(';')).join('\n');
    const filename = `abwesenheiten-${year}-${month.padStart(2, '0')}.csv`;

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
