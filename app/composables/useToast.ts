interface ToastOptions {
  title: string;
  color?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export function useToast() {
  function add(options: ToastOptions) {
    showToast(options.title, options.color || 'info', options.duration);
  }
  
  return { add };
}

export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 3000) {
  if (typeof window === 'undefined') return;
  
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const toast = document.createElement('div');
  toast.className = `flex items-center gap-2 px-4 py-3 rounded-lg text-white text-sm shadow-lg transform transition-all duration-300 translate-x-full ${colors[type]}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  
  container.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full');
  });

  // Remove after duration
  setTimeout(() => {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
