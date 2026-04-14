import { extractVisibleEntriesFromRow } from './row-extraction';

describe('extractVisibleEntriesFromRow', () => {
  it('maps visible headers to visible row cells', () => {
    document.body.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Rent-Nr.</th>
            <th>Mietbeginn</th>
            <th style="display:none;">Hidden</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>R-42</td>
            <td>2026-04-14</td>
            <td style="display:none;">Ignore me</td>
            <td>Offen</td>
            <td><button>Actions</button></td>
          </tr>
        </tbody>
      </table>
    `;

    const row = document.querySelector('tbody tr') as HTMLTableRowElement;
    expect(extractVisibleEntriesFromRow(row)).toEqual([
      { key: 'Rent-Nr.', value: 'R-42' },
      { key: 'Mietbeginn', value: '2026-04-14' },
      { key: 'Status', value: 'Offen' },
    ]);
  });
});
