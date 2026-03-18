export interface AdminNavigationItem {
  label: string;
  to: string;
  prefix: string;
  icon: 'apps' | 'messages' | 'settings' | 'sparkles';
}

export const ADMIN_NAVIGATION: AdminNavigationItem[] = [
  {
    label: '应用',
    to: '/admin/apps',
    prefix: '/admin/apps',
    icon: 'apps',
  },
  {
    label: '消息',
    to: '/admin/messages',
    prefix: '/admin/messages',
    icon: 'messages',
  },
  {
    label: 'MCP',
    to: '/admin/mcp',
    prefix: '/admin/mcp',
    icon: 'sparkles',
  },
  {
    label: '设置',
    to: '/admin/settings/general',
    prefix: '/admin/settings',
    icon: 'settings',
  },
];
