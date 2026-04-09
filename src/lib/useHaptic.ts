/**
 * useHaptic — thin wrapper around the Web Vibration API.
 * Silently no-ops on unsupported browsers (desktop, iOS Safari).
 */
export function useHaptic() {
  const vibrate = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  return {
    /** Very short tick — good for slider steps */
    tick: () => vibrate(10),
    /** Light tap — good for toggle ON */
    light: () => vibrate(20),
    /** Medium double-bump — good for toggle OFF */
    medium: () => vibrate([15, 40, 15]),
    /** Soft confirmation — good for route set */
    success: () => vibrate([10, 30, 60]),
  };
}
