import { extractPrintableRowsFromTable, extractVisibleEntriesFromRow } from './row-extraction';

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

  it('creates one printable row per Rent-EAN', () => {
    document.body.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Kunde</th>
            <th>Rent-EAN</th>
            <th>Mietartikel</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Fraser Deck</td>
            <td>2000050
2000051</td>
            <td>E-TERU UNIVERSAL EQ / M</td>
          </tr>
          <tr>
            <td>Jane Doe</td>
            <td>3000001</td>
            <td>Helmet</td>
          </tr>
        </tbody>
      </table>
    `;

    const table = document.querySelector('table') as HTMLTableElement;

    expect(extractPrintableRowsFromTable(table)).toEqual([
      [
        { key: 'Kunde', value: 'Fraser Deck' },
        { key: 'Mietartikel', value: 'E-TERU UNIVERSAL EQ / M' },
        { key: 'Rent-EAN', value: '2000050' },
      ],
      [
        { key: 'Kunde', value: 'Fraser Deck' },
        { key: 'Mietartikel', value: 'E-TERU UNIVERSAL EQ / M' },
        { key: 'Rent-EAN', value: '2000051' },
      ],
      [
        { key: 'Kunde', value: 'Jane Doe' },
        { key: 'Mietartikel', value: 'Helmet' },
        { key: 'Rent-EAN', value: '3000001' },
      ],
    ]);
  });
});
