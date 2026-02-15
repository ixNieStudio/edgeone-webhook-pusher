/**
 * 日期时间格式化工具
 * 统一采用中文习惯格式
 */

/**
 * 格式化日期时间 (完整格式)
 * 输出: 2024年1月15日 14:30:25
 */
export function formatDateTime(input: string | number | Date | undefined | null): string {
  if (!input) return '-';
  
  const date = typeof input === 'object' ? input : new Date(input);
  if (isNaN(date.getTime())) return '-';
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}年${month}月${day}日 ${hour}:${minute}:${second}`;
}

/**
 * 格式化日期时间 (短格式，不含年份)
 * 输出: 1月15日 14:30:25
 */
export function formatDateTimeShort(input: string | number | Date | undefined | null): string {
  if (!input) return '-';
  
  const date = typeof input === 'object' ? input : new Date(input);
  if (isNaN(date.getTime())) return '-';
  
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  return `${month}月${day}日 ${hour}:${minute}:${second}`;
}

/**
 * 格式化日期 (仅日期)
 * 输出: 2024年1月15日
 */
export function formatDate(input: string | number | Date | undefined | null): string {
  if (!input) return '-';
  
  const date = typeof input === 'object' ? input : new Date(input);
  if (isNaN(date.getTime())) return '-';
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  return `${year}年${month}月${day}日`;
}

/**
 * 格式化时间 (仅时间)
 * 输出: 14:30:25
 */
export function formatTime(input: string | number | Date | undefined | null): string {
  if (!input) return '-';
  
  const date = typeof input === 'object' ? input : new Date(input);
  if (isNaN(date.getTime())) return '-';
  
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  return `${hour}:${minute}:${second}`;
}
