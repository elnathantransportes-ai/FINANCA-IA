export const vibrate = (pattern: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;

  switch (pattern) {
    case 'light':
      navigator.vibrate(10); // Subtle tick
      break;
    case 'medium':
      navigator.vibrate(40); // Standard click
      break;
    case 'heavy':
      navigator.vibrate(70); // Strong feedback
      break;
    case 'success':
      navigator.vibrate([10, 30, 10, 30]); // Double tick
      break;
    case 'error':
      navigator.vibrate([50, 30, 50, 30, 50]); // Triple buzz
      break;
  }
};