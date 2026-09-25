/**
 * Utility functions for handling portfolio files, extensions, formatting, and URLs.
 */

export function resolveFileUrl(filePath) {
  if (!filePath) return '';
  const apiBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : '';

  if (filePath.startsWith('certificate://') || filePath.startsWith('certificate:')) {
    const code = filePath.replace(/^certificate:\/\//, '').replace(/^certificate:/, '');
    return `${apiBase}/api/certificates/render/${code}`;
  }

  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('blob:') ||
    filePath.startsWith('data:')
  ) {
    return filePath;
  }

  if (filePath.startsWith('/api/')) {
    return `${apiBase}${filePath}`;
  }

  if (filePath.startsWith('/photo/') || filePath.startsWith('photo/')) {
    return filePath.startsWith('/') ? filePath : `/${filePath}`;
  }

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function formatCleanFileName(fileName) {
  if (!fileName) return '';
  let clean = fileName.replace(UUID_REGEX, '').replace(/^[_-]+/, '');
  clean = clean.replace(/\.[^/.]+$/, '');
  clean = clean.replace(/[_-]+/g, ' ').trim();
  if (clean && clean.length > 1 && !UUID_REGEX.test(clean) && /[a-zA-Z]/.test(clean)) {
    return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return '';
}

export function formatPortfolioTitle(item, categoryFallback = 'Portfolio Artifact', index) {
  if (!item) return categoryFallback;
  const rawTitle = (item.title || '').trim();
  const rawFileName = (item.file_name || item.name || '').trim();

  // If title is a genuine human title (not empty, not uuid, not raw uuid filename)
  if (rawTitle && !UUID_REGEX.test(rawTitle) && rawTitle !== rawFileName) {
    const cleanRaw = rawTitle.replace(UUID_REGEX, '').trim();
    if (cleanRaw.length > 2 && /[a-zA-Z]/.test(cleanRaw)) {
      return rawTitle;
    }
  }

  // Try extracting human name from filename
  const cleanFromFileName = formatCleanFileName(rawFileName);
  if (cleanFromFileName) {
    return cleanFromFileName;
  }

  // Fallback to item_type or categoryFallback
  if (item.item_type) {
    const typeLabel = item.item_type.replace(/[_-]+/g, ' ').trim();
    const formatted = typeLabel.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if (formatted && formatted.toLowerCase() !== 'document' && !UUID_REGEX.test(formatted)) {
      return typeof index === 'number' ? `${formatted} #${index + 1}` : formatted;
    }
  }

  return typeof index === 'number' ? `${categoryFallback} #${index + 1}` : categoryFallback;
}

export function formatFileSubtitle(item) {
  if (!item) return '';
  const parts = [];

  const rawFileName = item.file_name || item.name || '';
  const ext = (rawFileName.split('.').pop() || '').toUpperCase();
  if (ext && ext.length <= 5 && ext !== rawFileName.toUpperCase()) {
    parts.push(ext);
  }

  if (item.file_size) {
    parts.push(formatFileSize(item.file_size));
  }

  if (item.created_at) {
    try {
      const d = new Date(item.created_at);
      if (!isNaN(d.getTime())) {
        parts.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
      }
    } catch {
      // ignore
    }
  }

  return parts.join(' • ');
}

export function formatAddress(addr, fallback = 'Philippines') {
  if (!addr) return fallback;
  let parsed = addr;
  if (typeof addr === 'string') {
    const trimmed = addr.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {
        return trimmed || fallback;
      }
    } else {
      return trimmed || fallback;
    }
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const parts = [
      parsed.street,
      parsed.barangay,
      parsed.city,
      parsed.province,
      parsed.region && (!parsed.province || !parsed.province.toLowerCase().includes(parsed.region.toLowerCase())) ? parsed.region : null,
      parsed.postalCode
    ].filter(Boolean).map(s => String(s).trim());

    return parts.length > 0 ? parts.join(', ') : fallback;
  }

  return String(addr) || fallback;
}
