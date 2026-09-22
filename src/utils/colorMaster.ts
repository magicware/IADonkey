import type { LauncherAction, LauncherItem } from '../types';

export interface ParsedColor {
  hex: string;
  hexNoHash: string;
  rgb: string;
  rgba: string;
  hsl: string;
  hsla: string;
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Clamps a number between min and max
 */
function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * Converts RGB numbers (0-255) to 6-digit hex string with #
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Converts RGB numbers (0-255) to HSL object
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rNorm = clamp(r, 0, 255) / 255;
  const gNorm = clamp(g, 0, 255) / 255;
  const bNorm = clamp(b, 0, 255) / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Converts HSL numbers to RGB object
 */
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hNorm = (h % 360) / 360;
  const sNorm = clamp(s, 0, 100) / 100;
  const lNorm = clamp(l, 0, 100) / 100;

  if (sNorm === 0) {
    const val = Math.round(lNorm * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tAdj = t;
    if (tAdj < 0) tAdj += 1;
    if (tAdj > 1) tAdj -= 1;
    if (tAdj < 1 / 6) return p + (q - p) * 6 * tAdj;
    if (tAdj < 1 / 2) return q;
    if (tAdj < 2 / 3) return p + (q - p) * (2 / 3 - tAdj) * 6;
    return p;
  };

  const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
  const p = 2 * lNorm - q;

  return {
    r: Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hNorm) * 255),
    b: Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255),
  };
}

/**
 * Parses and normalizes various color formats (HEX, RGB, RGBA, HSL, HSLA).
 * Returns null if the input is not a recognized color format.
 */
export function parseColorQuery(query: string): ParsedColor | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // 1. HEX match: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
  const hexMatch = trimmed.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  if (hexMatch) {
    const raw = hexMatch[1];
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 1;

    if (raw.length === 3 || raw.length === 4) {
      r = parseInt(raw[0] + raw[0], 16);
      g = parseInt(raw[1] + raw[1], 16);
      b = parseInt(raw[2] + raw[2], 16);
      if (raw.length === 4) {
        a = parseFloat((parseInt(raw[3] + raw[3], 16) / 255).toFixed(2));
      }
    } else {
      r = parseInt(raw.slice(0, 2), 16);
      g = parseInt(raw.slice(2, 4), 16);
      b = parseInt(raw.slice(4, 6), 16);
      if (raw.length === 8) {
        a = parseFloat((parseInt(raw.slice(6, 8), 16) / 255).toFixed(2));
      }
    }

    const hexStandard = rgbToHex(r, g, b);
    const hsl = rgbToHsl(r, g, b);

    return {
      hex: hexStandard,
      hexNoHash: hexStandard.replace('#', ''),
      rgb: `rgb(${r}, ${g}, ${b})`,
      rgba: `rgba(${r}, ${g}, ${b}, ${a})`,
      hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      hsla: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${a})`,
      r,
      g,
      b,
      a,
    };
  }

  // 2. RGB / RGBA match: rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgbMatch) {
    const r = clamp(parseInt(rgbMatch[1], 10), 0, 255);
    const g = clamp(parseInt(rgbMatch[2], 10), 0, 255);
    const b = clamp(parseInt(rgbMatch[3], 10), 0, 255);
    const a = rgbMatch[4] !== undefined ? clamp(parseFloat(rgbMatch[4]), 0, 1) : 1;

    const hexStandard = rgbToHex(r, g, b);
    const hsl = rgbToHsl(r, g, b);

    return {
      hex: hexStandard,
      hexNoHash: hexStandard.replace('#', ''),
      rgb: `rgb(${r}, ${g}, ${b})`,
      rgba: `rgba(${r}, ${g}, ${b}, ${a})`,
      hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      hsla: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${a})`,
      r,
      g,
      b,
      a,
    };
  }

  // 3. HSL / HSLA match: hsl(h, s%, l%) or hsla(h, s%, l%, a)
  const hslMatch = trimmed.match(/^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (hslMatch) {
    const h = parseInt(hslMatch[1], 10) % 360;
    const s = clamp(parseInt(hslMatch[2], 10), 0, 100);
    const l = clamp(parseInt(hslMatch[3], 10), 0, 100);
    const a = hslMatch[4] !== undefined ? clamp(parseFloat(hslMatch[4]), 0, 1) : 1;

    const rgb = hslToRgb(h, s, l);
    const hexStandard = rgbToHex(rgb.r, rgb.g, rgb.b);

    return {
      hex: hexStandard,
      hexNoHash: hexStandard.replace('#', ''),
      rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      rgba: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`,
      hsl: `hsl(${h}, ${s}%, ${l}%)`,
      hsla: `hsla(${h}, ${s}%, ${l}%, ${a})`,
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      a,
    };
  }

  return null;
}

/**
 * Formats parsed color based on requested format
 */
export function formatColorValue(
  color: ParsedColor,
  format: 'hex' | 'hex-no-hash' | 'rgb' | 'rgba' | 'hsl' = 'hex'
): string {
  switch (format) {
    case 'hex-no-hash':
      return color.hexNoHash;
    case 'rgb':
      return color.a < 1 ? color.rgba : color.rgb;
    case 'rgba':
      return color.rgba;
    case 'hsl':
      return color.a < 1 ? color.hsla : color.hsl;
    case 'hex':
    default:
      return color.hex;
  }
}

/**
 * Builds LauncherItem for a recognized color in Spotlight
 */
export function createColorLauncherItem(
  color: ParsedColor,
  defaultFormat: 'hex' | 'hex-no-hash' | 'rgb' | 'rgba' | 'hsl' = 'hex'
): LauncherItem {
  const primaryCopyValue = formatColorValue(color, defaultFormat);

  const actions: LauncherAction[] = [
    {
      name: 'Zavřít',
      action: 'close',
      location: 'Zavřít a resetovat vyhledávač',
      icon: 'close',
    },
    {
      name: 'Zkopírovat HEX',
      action: 'copy',
      location: color.hex,
      icon: 'content_copy',
    },
    {
      name: 'Zkopírovat RGB',
      action: 'copy',
      location: color.rgb,
      icon: 'content_copy',
    },
    {
      name: 'Zkopírovat RGBA',
      action: 'copy',
      location: color.rgba,
      icon: 'content_copy',
    },
    {
      name: 'Zkopírovat HSL',
      action: 'copy',
      location: color.hsl,
      icon: 'content_copy',
    },
    {
      name: 'Zkopírovat bez mřížky',
      action: 'copy',
      location: color.hexNoHash,
      icon: 'content_copy',
    },
    {
      name: 'Doladit barvu...',
      action: 'tune-color',
      location: color.hex,
      icon: 'tune',
    },
    {
      name: 'Nastavit jako hlavní barvu aplikace (IADonkey)',
      action: 'set-primary-color',
      location: color.hex,
      icon: 'palette',
    },
    {
      name: 'Nastavit jako barvu akcí (IADonkey)',
      action: 'set-actions-color',
      location: color.hex,
      icon: 'bolt',
    },
  ];

  return {
    id: 'colormaster-detected-color',
    name: color.hex,
    location: `${color.rgb} • ${color.hsl} (Enter zkopíruje ${defaultFormat.toUpperCase()})`,
    action: 'copy',
    icon: 'palette',
    colorPreview: color.hex,
    priority: -1.2,
    actions,
    shortcuts: ['barva', 'color', color.rgb, color.rgba, color.hsl, color.hexNoHash],
  };
}

/**
 * Returns available DonkeyTools commands when query starts with '/'
 */
export function getDonkeyToolsCommands(
  query: string,
  options?: { colorMasterEnabled?: boolean; quickCapEnabled?: boolean; fastSnapEnabled?: boolean }
): LauncherItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed.startsWith('/')) return [];

  const command = trimmed.slice(1).trim();
  const list: LauncherItem[] = [];

  const isColorMasterActive = options ? options.colorMasterEnabled === true : true;
  const isQuickCapActive = options ? (options.quickCapEnabled ?? options.fastSnapEnabled ?? true) : true;

  // ColorMaster (kapátko / eyedropper / picker / barva)
  if (isColorMasterActive) {
    const shortcuts = ['/kapatko', '/picker', '/eyedropper', '/color', '/barva'];
    const isColorMasterMatch =
      command === '' ||
      'colormaster'.includes(command) ||
      shortcuts.some((s) => s.replace(/^\//, '').includes(command)) ||
      'nabrat barvu'.includes(command);

    if (isColorMasterMatch) {
      list.push({
        id: 'donkeytools-kapatko',
        name: 'ColorMaster',
        location: 'Nabrat barvu z obrazovky (EyeDropper)',
        action: 'pick-color',
        icon: 'colorize',
        priority: -1.5,
        sourceId: 'donkeytools',
        shortcuts,
      });
    }
  }

  // QuickCap (/quickcap, /cap, /vystrizek, /snip, /screenshot, /snap)
  if (isQuickCapActive) {
    const shortcuts = ['/quickcap', '/cap', '/vystrizek', '/snip', '/screenshot', '/snap'];
    const isQuickCapMatch =
      command === '' ||
      'quickcap'.includes(command) ||
      shortcuts.some((s) => s.replace(/^\//, '').includes(command)) ||
      'vystrizek obrazovky'.includes(command);

    if (isQuickCapMatch) {
      list.push({
        id: 'donkeytools-quickcap',
        name: 'QuickCap',
        location: 'Výstřižek obrazovky s uložením a schránkou',
        action: 'quickcap',
        icon: 'crop',
        priority: -1.4,
        sourceId: 'donkeytools',
        shortcuts,
      });
    }
  }

  return list;
}

/**
 * Invokes Chromium native EyeDropper API across the Windows desktop
 */
export async function pickScreenColor(options?: { noClipboard?: boolean; noSpotlight?: boolean }): Promise<string | null> {
  if (typeof window !== 'undefined' && window.electronAPI?.pickScreenColor) {
    try {
      const res = await window.electronAPI.pickScreenColor(options);
      return res && res.trim() ? res.trim().toUpperCase() : null;
    } catch (err) {
      console.error('electronAPI.pickScreenColor failed:', err);
      return null;
    }
  }

  if (typeof window !== 'undefined' && 'EyeDropper' in window) {
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      return result?.sRGBHex ? result.sRGBHex.toUpperCase() : null;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return null;
      }
      console.warn('EyeDropper error:', err);
      return null;
    }
  }

  return null;
}
