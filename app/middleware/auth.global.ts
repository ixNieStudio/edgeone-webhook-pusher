/**
 * Auth Middleware
 * Feature: frontend-admin-ui
 * 
 * Protects routes that require authentication.
 * Redirects to login page if not authenticated.
 */
import { useAuthStore } from '~/stores/auth';

// API 和公开路径白名单 - 这些路径不需要认证
const PUBLIC_PATHS = [
  '/login',
  '/admin/login',
  '/bind-',
  '/subscribe-',
];

// API 路径前缀白名单 - 这些 API 路由不会被前端中间件拦截
const API_PREFIXES = [
  '/v1/',
  '/api/',
  '/send/',
  '/topic/',
];

export default defineNuxtRouteMiddleware((to) => {
  // Skip auth check for API routes (handled by backend)
  if (API_PREFIXES.some(prefix => to.path.startsWith(prefix))) {
    return;
  }

  // Skip auth check for public pages
  if (PUBLIC_PATHS.some(path => to.path === path || to.path.startsWith(path))) {
    return;
  }

  // 在体验模式下，根路径 / 不需要认证（体验前端）
  const config = useRuntimeConfig();
  const isDemoMode = config.public.demoMode;
  
  if (isDemoMode && to.path === '/') {
    console.log('[Auth Middleware] Demo mode enabled, skipping auth for root path');
    return;
  }

  // Only run on client side
  if (import.meta.server) {
    return;
  }

  const auth = useAuthStore();
  
  // Initialize auth from localStorage
  auth.init();

  // Redirect to login if not authenticated
  if (!auth.isLoggedIn) {
    const loginPath = isDemoMode ? '/admin/login' : '/login';
    console.log('[Auth Middleware] Not logged in, redirecting to:', loginPath);
    return navigateTo(loginPath);
  }
});
