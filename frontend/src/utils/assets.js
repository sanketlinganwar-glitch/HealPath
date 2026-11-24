/**
 * Resolves static asset URLs with Vite's BASE_URL (essential for GitHub Pages subpath routing).
 */
export function resolveAssetUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
  return `${cleanBase}${cleanUrl}`;
}
