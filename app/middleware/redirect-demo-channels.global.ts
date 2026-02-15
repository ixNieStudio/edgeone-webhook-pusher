/**
 * Demo Channels Redirect Middleware
 * Feature: demo-mode
 * 
 * 在体验模式下，将根路径的 /channels 重定向到 /（体验模式不显示渠道页面）
 */

export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig();
  const isDemoMode = config.public.demoMode;

  // 非体验模式，不做任何处理
  if (!isDemoMode) {
    return;
  }

  // 体验模式下，访问 /channels（不带 /admin 前缀）时重定向到首页
  if (to.path === '/channels') {
    return navigateTo('/', { redirectCode: 301 });
  }
});
