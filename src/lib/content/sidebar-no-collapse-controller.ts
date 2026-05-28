import { injectStyle } from './inject-style';

const STYLE_ID = 'approom-sidebar-no-collapse';

// Prevents the ERP from collapsing the sidebar content to width: 0.
// We intentionally omit the data-v-* scoped attribute the ERP uses — that
// attribute is a Vue build-time ID that changes whenever the component is
// recompiled. The stable class names are sufficient; !important handles
// specificity.
const CSS = `
  .sidebar-menu.collapsed .content {
    width: var(--sidebar-width, 248px) !important;
  }
`;

export class SidebarNoCollapseController {
  mount() {
    injectStyle(STYLE_ID, CSS);
  }
}
