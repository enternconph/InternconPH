import { getApiServerUrl } from './api/client';

export const getApiUrl = () => getApiServerUrl();
export const API_URL = getApiServerUrl();
export const assetUrl = (p) => {
  if (!p) return '';
  if (p.startsWith('http')) return p;
  const baseUrl = getApiServerUrl();
  return `${baseUrl}${p}`;
};
