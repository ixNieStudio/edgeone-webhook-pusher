/**
 * Redirect legacy detail page URLs to new master-detail layout
 * /channels/:id -> /channels?selected=:id
 * /apps/:id -> /apps?selected=:id
 */
export default defineNuxtRouteMiddleware((to) => {
  // Redirect /channels/:id to /channels?selected=:id
  const channelMatch = to.path.match(/^\/channels\/([^/]+)$/);
  if (channelMatch) {
    return navigateTo({
      path: '/channels',
      query: { selected: channelMatch[1] },
    });
  }

  // Redirect /apps/:id to /apps?selected=:id
  const appMatch = to.path.match(/^\/apps\/([^/]+)$/);
  if (appMatch) {
    return navigateTo({
      path: '/apps',
      query: { selected: appMatch[1] },
    });
  }
});
