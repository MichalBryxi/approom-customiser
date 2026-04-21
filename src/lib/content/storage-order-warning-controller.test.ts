import { StorageOrderWarningController } from './storage-order-warning-controller';

function buildOrderPage() {
  document.body.innerHTML = `
    <table id="bestell_artikel" class="table table-condensed table-block">
      <thead>
        <tr>
          <th>Pos.</th>
          <th>Anzahl bestellt</th>
          <th>Anzahl eingebucht</th>
          <th>Anzahl einbuchen</th>
        </tr>
      </thead>
      <tbody>
        <tr id="warning-row">
          <td>1</td>
          <td><input type="number" value="2" readonly></td>
          <td><input type="number" value="1" readonly></td>
          <td><input type="number" value="2"></td>
        </tr>
        <tr id="safe-row">
          <td>2</td>
          <td><input type="number" value="1" readonly></td>
          <td><input type="number" value="0" readonly></td>
          <td><input type="number" value="1"></td>
        </tr>
      </tbody>
    </table>
  `;
}

describe('StorageOrderWarningController', () => {
  beforeEach(() => {
    buildOrderPage();
  });

  it('marks rows red when Anzahl einbuchen is lower than bestellt plus eingebucht', () => {
    const controller = new StorageOrderWarningController();

    controller.sync(true);

    const warningRow = document.querySelector<HTMLTableRowElement>('#warning-row');
    const safeRow = document.querySelector<HTMLTableRowElement>('#safe-row');

    expect(warningRow?.dataset.appRoomCheckInWarning).toBe('');
    expect(warningRow?.style.backgroundColor).toBe('rgb(248, 215, 218)');
    expect(safeRow?.hasAttribute('data-app-room-check-in-warning')).toBe(false);
  });

  it('updates the warning when the editable quantity changes', () => {
    const controller = new StorageOrderWarningController();
    controller.sync(true);

    const warningRow = document.querySelector<HTMLTableRowElement>('#warning-row');
    const pendingInput = warningRow?.querySelector<HTMLInputElement>('td:last-child input');
    pendingInput!.value = '3';
    pendingInput?.dispatchEvent(new Event('input', { bubbles: true }));

    expect(warningRow?.hasAttribute('data-app-room-check-in-warning')).toBe(false);
    expect(warningRow?.style.backgroundColor).toBe('');
  });

  it('clears existing warnings when the feature is disabled', () => {
    const controller = new StorageOrderWarningController();
    controller.sync(true);
    controller.sync(false);

    const warningRow = document.querySelector<HTMLTableRowElement>('#warning-row');

    expect(warningRow?.hasAttribute('data-app-room-check-in-warning')).toBe(false);
    expect(warningRow?.style.backgroundColor).toBe('');
  });
});
