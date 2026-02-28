import type { MessageDirection, MessageRecordType, DeliveryResult } from '~/types';

export function useMessageFormatting() {
  function getDirectionIcon(direction: MessageDirection): string {
    return direction === 'outbound' ? 'heroicons:arrow-up-right' : 'heroicons:arrow-down-left';
  }

  function getDirectionClass(direction: MessageDirection): string {
    return direction === 'outbound'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  }

  function getTypeLabel(type: MessageRecordType): string {
    const labels: Record<MessageRecordType, string> = {
      push: '推送',
      text: '文本',
      event: '事件',
    };
    return labels[type] || type;
  }

  function getTypeClass(type: MessageRecordType): string {
    const classes: Record<MessageRecordType, string> = {
      push: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      text: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      event: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return classes[type] || 'bg-gray-100 text-gray-700';
  }

  function getStatusClass(results: DeliveryResult[]): string {
    const allSuccess = results.every(r => r.success);
    const allFailed = results.every(r => !r.success);
    if (allSuccess) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (allFailed) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  }

  function getStatusText(results: DeliveryResult[]): string {
    const success = results.filter(r => r.success).length;
    const total = results.length;
    if (success === total) return '成功';
    if (success === 0) return '失败';
    return `${success}/${total}`;
  }

  function truncateOpenId(openId?: string): string {
    if (!openId) return '-';
    if (openId.length <= 12) return openId;
    return `${openId.slice(0, 6)}...${openId.slice(-4)}`;
  }

  function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;
  }

  return {
    getDirectionIcon,
    getDirectionClass,
    getTypeLabel,
    getTypeClass,
    getStatusClass,
    getStatusText,
    truncateOpenId,
    formatDateTime,
  };
}
