// Path utilities
export function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
}

export function dirname(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/');
}

export function basename(path: string): string {
  return path.split('/').pop() || '';
}

export function extname(path: string): string {
  const base = basename(path);
  const dotIndex = base.lastIndexOf('.');
  return dotIndex > 0 ? base.slice(dotIndex) : '';
}

export function relativePath(from: string, to: string): string {
  const fromParts = from.split('/').filter(Boolean);
  const toParts = to.split('/').filter(Boolean);

  let commonLength = 0;
  while (commonLength < fromParts.length && commonLength < toParts.length && fromParts[commonLength] === toParts[commonLength]) {
    commonLength++;
  }

  const upParts = fromParts.length - commonLength;
  const downParts = toParts.slice(commonLength);

  const upPath = Array(upParts).fill('..').join('/');
  const downPath = downParts.join('/');

  return joinPath(upPath, downPath);
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}
