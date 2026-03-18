/**
 * Redirect legacy detail page URLs to new master-detail layout
 * /channels/:id -> /admin/settings?authProfile=:id
 * /apps/:id -> /admin/apps?app=:id
 */
export default defineNuxtRouteMiddleware((to) => {
  // Redirect /channels/:id to /admin/settings?authProfile=:id
  const channelMatch = to.path.match(/^\/channels\/([^/]+)$/);
  if (channelMatch) {
    return navigateTo({
      path: '/admin/settings/auth-profiles',
      query: { authProfile: channelMatch[1] },
    });
  }

  // Redirect /apps/:id to /admin/apps?app=:id
  const appMatch = to.path.match(/^\/apps\/([^/]+)$/);
  if (appMatch) {
    return navigateTo({
      path: '/admin/apps',
      query: { app: appMatch[1] },
    });
  }
});
