/**
 * Redirect legacy detail page URLs to new master-detail layout
 * /channels/:id -> /admin/channels?selected=:id
 * /apps/:id -> /admin/apps?selected=:id
 */
export default defineNuxtRouteMiddleware((to) => {
  // Redirect /channels/:id to /admin/channels?selected=:id
  const channelMatch = to.path.match(/^\/channels\/([^/]+)$/);
  if (channelMatch) {
    return navigateTo({
      path: '/admin/channels',
      query: { selected: channelMatch[1] },
    });
  }

  // Redirect /apps/:id to /admin/apps?selected=:id
  const appMatch = to.path.match(/^\/apps\/([^/]+)$/);
  if (appMatch) {
    return navigateTo({
      path: '/admin/apps',
      query: { selected: appMatch[1] },
    });
  }
});
