export const API_URL = import.meta.env.VITE_API_URL || '';
export const assetUrl = (p) => !p ? '' : p.startsWith('http') ? p : `${API_URL}${p}`;
