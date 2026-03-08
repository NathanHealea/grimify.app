'use client';

import { useSyncExternalStore } from 'react';

const DESKTOP_MQ = '(min-width: 768px)';

function subscribeToMediaQuery(callback: () => void) {
  const mq = window.matchMedia(DESKTOP_MQ);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getIsDesktop() {
  return window.matchMedia(DESKTOP_MQ).matches;
}

export function useIsDesktop() {
  return useSyncExternalStore(subscribeToMediaQuery, getIsDesktop, () => false);
}
