/**
 * Admin Path Redirect Middleware
 * Feature: demo-mode
 * 
 * 已废弃：所有管理页面已统一到 /admin/* 路径
 * 此中间件保留用于向后兼容，但不再执行任何重定向
 */

export default defineNuxtRouteMiddleware(() => {
  // 不再需要重定向逻辑，因为所有页面已统一到 /admin/*
  return;
});
