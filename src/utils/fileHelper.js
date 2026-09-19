/**
 * Utility functions for handling portfolio files, extensions, formatting, and URLs.
 */

export function resolveFileUrl(filePath) {
  if (!filePath) return '';
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('blob:') ||
    filePath.startsWith('data:')
  ) {
    return filePath;
  }
  const apiBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : '';
  let cleanPath = filePath;
  if (cleanPath.startsWith('/uploads/')) {
    cleanPath = filePath;
  } else if (cleanPath.startsWith('uploads/')) {
    cleanPath = `/${filePath}`;
  } else {
    cleanPath = `/uploads/portfolio/${filePath.replace(/^\/+/, '')}`;
  }
  return `${apiBase}${cleanPath}`;
}

export function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function getFileIcon(fileName) {
  if (!fileName) return 'description';
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'picture_as_pdf';
  if (['doc', 'docx'].includes(ext)) return 'article';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'table_chart';
  if (['ppt', 'pptx'].includes(ext)) return 'slideshow';
  return 'description';
}

export function isImageFile(fileName, filePath) {
  const target = (fileName || filePath || '').toLowerCase();
  const ext = target.split('.').pop().split('?')[0];
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
}

export function isPdfFile(fileName, filePath) {
  const target = (fileName || filePath || '').toLowerCase();
  const ext = target.split('.').pop().split('?')[0];
  return ext === 'pdf';
}
