/**
 * Admin Path Redirect Middleware
 * Feature: demo-mode
 * 
 * 在体验模式下，将管理后台路由重定向到 /admin 前缀
 * 确保体验前端（/）和管理后台（/admin/*）完全隔离
 */

export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig();
  const isDemoMode = config.public.demoMode;

  // 非体验模式，不做任何处理
  if (!isDemoMode) {
    return;
  }

  // 需要重定向的管理后台路由（不包括 /login，因为已在 auth 中间件处理）
  const adminRoutes = ['/apps', '/channels', '/messages', '/api-docs', '/settings'];
  
  // 如果访问的是管理后台路由（不带 /admin 前缀）
  if (adminRoutes.includes(to.path)) {
    // 重定向到 /admin 前缀的路径
    return navigateTo(`/admin${to.path}`, { redirectCode: 301 });
  }
});
