// Utilities for building absolute URLs for assets served by the backend
// Handles cases where the backend returns a relative path like "uploads/profile-images/.."
// and when running the CRA dev server on port 3000 with a proxy to :8080.

export function resolveImageUrl(path) {
  if (!path) return null;
  // If already an absolute URL
  if (/^https?:\/\//i.test(path)) return path;

  // Figure out backend base when in dev (CRA default port 3000)
  const isDev = process.env.NODE_ENV === 'development';
  const isCRADev = isDev && typeof window !== 'undefined' && window.location && window.location.port === '3000';
  // Respect server context path (defaults to '/api' based on backend config)
  const apiBasePath = process.env.REACT_APP_API_BASE_PATH || '/api';
  const backendBase = isCRADev ? `http://localhost:8080${apiBasePath}` : apiBasePath;

  // Normalize leading slash
  if (path.startsWith('/')) {
    return backendBase ? `${backendBase}${path}` : path;
  }
  return backendBase ? `${backendBase}/${path}` : `/${path}`;
}
