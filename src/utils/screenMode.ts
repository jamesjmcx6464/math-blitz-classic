import { ScreenModeType } from '../types/game';

export const STORAGE_KEY_SCREEN = 'mathblitz_screen';

/**
 * Detects whether the current device is a mobile phone vs PC/desktop.
 * Checks for mobile user agents and screen dimensions.
 */
export function detectDevice(): ScreenModeType {
  if (typeof window === 'undefined') return 'pc';
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isNarrowScreen = window.innerWidth < 768;

  if (isMobileUA || isNarrowScreen) {
    return 'phone';
  }
  return 'pc';
}

export function getSelectedScreenMode(): ScreenModeType {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SCREEN);
    if (saved === 'pc' || saved === 'phone') {
      return saved;
    }
  } catch (err) {
    console.error('Error reading screen preference', err);
  }
  return detectDevice();
}

export function setSelectedScreenMode(screen: ScreenModeType): void {
  try {
    localStorage.setItem(STORAGE_KEY_SCREEN, screen);
  } catch (err) {
    console.error('Error writing screen preference', err);
  }
}

