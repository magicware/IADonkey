export type AspectRatioType = '16:9' | '4:3' | '1:1';

export interface AspectRatioLock {
  ratio: number;
  label: AspectRatioType;
}

export interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Determines aspect ratio lock from keyboard modifier keys:
 * Shift -> 16:9
 * Ctrl  -> 4:3
 * Alt   -> 1:1
 */
export function getActiveAspectLock(modifiers: {
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}): AspectRatioLock | null {
  if (modifiers.altKey) {
    return { ratio: 1.0, label: '1:1' };
  }
  if (modifiers.ctrlKey) {
    return { ratio: 4 / 3, label: '4:3' };
  }
  if (modifiers.shiftKey) {
    return { ratio: 16 / 9, label: '16:9' };
  }
  return null;
}

/**
 * Calculates rectangle between start and current points with optional aspect ratio lock
 * and optional screen boundary constraints.
 */
export function calculateAspectBox(
  start: Point,
  current: Point,
  lock: AspectRatioLock | null,
  bounds?: { width: number; height: number }
): BoxRect {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const dirX = dx >= 0 ? 1 : -1;
  const dirY = dy >= 0 ? 1 : -1;

  let rawW = Math.abs(dx);
  let rawH = Math.abs(dy);

  if (!lock) {
    return {
      x: Math.min(start.x, current.x),
      y: Math.min(start.y, current.y),
      width: rawW,
      height: rawH,
    };
  }

  const targetRatio = lock.ratio; // targetWidth / targetHeight
  let w = 0;
  let h = 0;

  if (rawW === 0 && rawH === 0) {
    w = 0;
    h = 0;
  } else if (rawW / targetRatio >= rawH) {
    // Horizontal distance dominates relative to ratio -> width drives height
    w = rawW;
    h = Math.round(rawW / targetRatio);
  } else {
    // Vertical distance dominates relative to ratio -> height drives width
    h = rawH;
    w = Math.round(rawH * targetRatio);
  }

  // Constrain inside screen boundaries if provided
  if (bounds) {
    const maxW = dirX >= 0 ? Math.max(0, bounds.width - start.x) : start.x;
    const maxH = dirY >= 0 ? Math.max(0, bounds.height - start.y) : start.y;

    if (w > maxW) {
      w = maxW;
      h = Math.round(w / targetRatio);
    }
    if (h > maxH) {
      h = maxH;
      w = Math.round(h * targetRatio);
    }
  }

  const x = dirX >= 0 ? start.x : start.x - w;
  const y = dirY >= 0 ? start.y : start.y - h;

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(0, Math.round(w)),
    height: Math.max(0, Math.round(h)),
  };
}

/**
 * Returns formatted aspect ratio string (e.g. 16:9, 4:3, 1:1, or reduced ratio).
 */
export function formatAspectRatio(w: number, h: number): string {
  if (w <= 0 || h <= 0) return '1:1';

  const ratio = w / h;

  // Check common standard aspect ratios within tolerance
  if (Math.abs(ratio - 16 / 9) <= 0.02) return '16:9';
  if (Math.abs(ratio - 4 / 3) <= 0.02) return '4:3';
  if (Math.abs(ratio - 1.0) <= 0.02) return '1:1';
  if (Math.abs(ratio - 16 / 10) <= 0.02) return '16:10';
  if (Math.abs(ratio - 21 / 9) <= 0.03) return '21:9';

  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const rw = Math.round(w);
  const rh = Math.round(h);
  const divisor = gcd(rw, rh);
  const divW = Math.round(rw / divisor);
  const divH = Math.round(rh / divisor);

  if (divW <= 21 && divH <= 21) {
    return `${divW}:${divH}`;
  }

  return `${ratio.toFixed(2)}:1`;
}
