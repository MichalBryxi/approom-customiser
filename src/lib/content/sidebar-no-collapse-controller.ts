import { injectStyle } from './inject-style';

const STYLE_ID = 'approom-sidebar-no-collapse';

// Prevents the ERP from collapsing the sidebar content to width: 0.
// The override targets the same selector the ERP uses so specificity is equal;
// !important wins over the inline rule the framework applies.
const CSS = `
  .sidebar-menu.collapsed .content[data-v-d9887902] {
    width: var(--sidebar-width, 248px) !important;
  }
`;

export class SidebarNoCollapseController {
  mount() {
    injectStyle(STYLE_ID, CSS);
  }
}
