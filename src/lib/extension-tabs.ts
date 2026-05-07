export async function reloadErpTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({ url: 'https://erp.app-room.ch/*' });
  await Promise.all(
    tabs.filter((tab) => tab.id !== undefined).map((tab) => chrome.tabs.reload(tab.id!)),
  );
}
