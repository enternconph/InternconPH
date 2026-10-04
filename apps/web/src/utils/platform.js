import { Capacitor } from '@capacitor/core';

export const isMobile = () => {
  return Capacitor.isNativePlatform();
};

export const isDesktop = () => {
  return typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');
};

export const isWeb = () => {
  return !isMobile() && !isDesktop();
};
