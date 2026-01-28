/**
 * Generate a random ID with optional prefix
 */
export function generateId(prefix?: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Generate a slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate that a string is a valid Firestore document ID
 */
export function isValidDocId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  if (id.length === 0 || id.length > 1500) return false;
  if (id.includes('/')) return false;
  if (id === '.' || id === '..') return false;
  return true;
}

/**
 * Extract LLC ID from a Firestore document path
 */
export function extractLlcIdFromPath(path: string): string | null {
  const match = path.match(/^llcs\/([^/]+)/);
  return match?.[1] ?? null;
}
