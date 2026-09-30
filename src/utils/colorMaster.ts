import type { LauncherAction, LauncherItem } from '../types';

export interface ParsedColor {
  hex: string;
  hex8: string;
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
 * Converts RGBA numbers to 8-digit hex string with #
 */
export function rgbaToHex8(r: number, g: number, b: number, a: number = 1): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  const aHex = clamp(Math.round(a * 255), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${aHex}`.toUpperCase();
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
    const hex8Standard = rgbaToHex8(r, g, b, a);
    const hsl = rgbToHsl(r, g, b);

    return {
      hex: hexStandard,
      hex8: hex8Standard,
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
    const hex8Standard = rgbaToHex8(r, g, b, a);
    const hsl = rgbToHsl(r, g, b);

    return {
      hex: hexStandard,
      hex8: hex8Standard,
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
    const hex8Standard = rgbaToHex8(rgb.r, rgb.g, rgb.b, a);

    return {
      hex: hexStandard,
      hex8: hex8Standard,
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
  format: 'hex' | 'hex8' | 'hex-no-hash' | 'rgb' | 'rgba' | 'hsl' = 'hex'
): string {
  switch (format) {
    case 'hex8':
      return color.hex8;
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
  defaultFormat: 'hex' | 'hex8' | 'hex-no-hash' | 'rgb' | 'rgba' | 'hsl' = 'hex'
): LauncherItem {
  const primaryCopyValue = formatColorValue(color, defaultFormat);

  const actions: LauncherAction[] = [
    {
      name: 'Zkopírovat HEX',
      action: 'copy',
      location: color.hex,
      icon: 'content_copy',
    },
    {
      name: 'Zkopírovat HEX8 (s průhledností)',
      action: 'copy',
      location: color.hex8,
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
    shortcuts: ['barva', 'color', color.hex8, color.rgb, color.rgba, color.hsl, color.hexNoHash],
  };
}

/**
 * Returns available DonkeyTools commands when query starts with '/'
 */
export function getDonkeyToolsCommands(
  query: string,
  options?: { colorMasterEnabled?: boolean; quickCapEnabled?: boolean; fastSnapEnabled?: boolean; screenRulerEnabled?: boolean; easyClipEnabled?: boolean }
): LauncherItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed.startsWith('/')) return [];

  const command = trimmed.slice(1).trim();
  const list: LauncherItem[] = [];

  const isColorMasterActive = options ? options.colorMasterEnabled === true : true;
  const isQuickCapActive = options ? (options.quickCapEnabled ?? options.fastSnapEnabled ?? true) : true;
  const isScreenRulerActive = options ? options.screenRulerEnabled === true : true;
  const isEasyClipActive = options ? options.easyClipEnabled === true : true;

  // Eyedropper (kapátko / eyedropper / picker / barva)
  if (isColorMasterActive) {
    const shortcuts = ['/kapatko', '/picker', '/eyedropper', '/color', '/barva'];
    const isEyedropperMatch =
      command === '' ||
      'eyedropper'.includes(command) ||
      'kapatko'.includes(command) ||
      'colormaster'.includes(command) ||
      shortcuts.some((s) => s.replace(/^\//, '').includes(command)) ||
      'nabrat barvu'.includes(command);

    if (isEyedropperMatch) {
      list.push({
        id: 'donkeytools-kapatko',
        name: 'Eyedropper',
        location: 'Nabrat barvu z obrazovky (DonkeyTools)',
        action: 'pick-color',
        icon: 'colorize',
        priority: -1.5,
        sourceId: 'donkeytools',
        shortcuts,
      });
    }

    // PaletteMaster (/palette, /paleta, /palety)
    const paletteShortcuts = ['/palette', '/paleta', '/palety'];
    const isPaletteMatch =
      command === '' ||
      'palettemaster'.includes(command) ||
      'palette'.includes(command) ||
      'paleta'.includes(command) ||
      'palety'.includes(command) ||
      paletteShortcuts.some((s) => s.replace(/^\//, '').includes(command)) ||
      command.startsWith('palette') ||
      command.startsWith('paleta');

    if (isPaletteMatch) {
      list.push({
        id: 'donkeytools-palettemaster',
        name: 'PaletteMaster',
        location: 'Správa a výběr barevných palet (DonkeyTools)',
        action: 'palette-list',
        icon: 'palette',
        priority: -1.45,
        sourceId: 'donkeytools',
        shortcuts: paletteShortcuts,
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

  // ScreenRuler (/ruler, /pravitko, /meritko, /scale)
  if (isScreenRulerActive) {
    const shortcuts = ['/ruler', '/pravitko', '/meritko', '/scale'];
    const isRulerMatch =
      command === '' ||
      'screenruler'.includes(command) ||
      'ruler'.includes(command) ||
      shortcuts.some((s) => s.replace(/^\//, '').includes(command)) ||
      'meritko a pravitko'.includes(command);

    if (isRulerMatch) {
      list.push({
        id: 'donkeytools-screenruler',
        name: 'ScreenRuler',
        location: 'Měřítko a pravítko obrazovky (px, %, dp)',
        action: 'screenruler',
        icon: 'straighten',
        priority: -1.3,
        sourceId: 'donkeytools',
        shortcuts,
      });
    }
  }

  // EasyClip (/easyclip, /clip, /schranka, /clipboard)
  if (isEasyClipActive) {
    const shortcuts = ['/easyclip', '/clip', '/schranka', '/clipboard'];
    const isEasyClipMatch =
      command === '' ||
      'easyclip'.includes(command) ||
      'clip'.includes(command) ||
      shortcuts.some((s) => s.replace(/^\//, '').includes(command)) ||
      'historie schranky'.includes(command) ||
      'schranka'.includes(command);

    if (isEasyClipMatch) {
      list.push({
        id: 'donkeytools-easyclip',
        name: 'EasyClip',
        location: 'Historie schránky s podporou textu i obrázků',
        action: 'easyclip',
        icon: 'content_paste',
        priority: -1.2,
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

/**
 * Calculates relative luminance of RGB components
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/**
 * Returns black (#000000) or white (#FFFFFF) for optimal contrast on given background
 */
export function getContrastColor(hex: string): string {
  const p = parseColorQuery(hex);
  if (!p) return '#FFFFFF';
  return getLuminance(p.r, p.g, p.b) > 0.4 ? '#000000' : '#FFFFFF';
}

/**
 * Mixes two colors by given weight (0 = all color1, 1 = all color2)
 */
export function mixColors(color1: string, color2: string, weight: number): string {
  const p1 = parseColorQuery(color1);
  const p2 = parseColorQuery(color2);
  if (!p1 || !p2) return color1;
  const w = Math.min(1, Math.max(0, weight));
  const r = Math.round(p1.r * (1 - w) + p2.r * w);
  const g = Math.round(p1.g * (1 - w) + p2.g * w);
  const b = Math.round(p1.b * (1 - w) + p2.b * w);
  return rgbToHex(r, g, b);
}

/**
 * Adjusts HSL channels of a color
 */
export function adjustHsl(color: string, deltaH: number, deltaS: number, deltaL: number): string {
  const p = parseColorQuery(color);
  if (!p) return color;
  const hsl = rgbToHsl(p.r, p.g, p.b);
  const newH = (hsl.h + deltaH + 360) % 360;
  const newS = Math.min(100, Math.max(0, hsl.s + deltaS));
  const newL = Math.min(100, Math.max(0, hsl.l + deltaL));
  const rgb = hslToRgb(newH, newS, newL);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

export interface DerivedColorToken {
  id: string;
  name: string;
  role: string;
  hex: string;
  hex8: string;
  rgb: string;
  rgba: string;
  hsl: string;
  isDark?: boolean;
  bgPreview?: string;
  fgText?: string;
  previewType?: 'button' | 'surface' | 'container';
  isDarkBg?: boolean;
}

/**
 * Derives button, surface and container preview colors from a single base color
 */
export function deriveSingleColorSurfaces(baseHex: string): DerivedColorToken[] {
  const p = parseColorQuery(baseHex) || parseColorQuery('#6366F1')!;
  const base = p.hex;

  const rawList = [
    {
      id: 'btn-filled-light',
      name: 'Plné tlačítko (světlé)',
      role: 'Plná barva tlačítka na světlém pozadí',
      hex: base,
      bgPreview: '#F4F5F8',
      fgText: getContrastColor(base),
      previewType: 'button' as const,
      isDarkBg: false,
    },
    {
      id: 'btn-filled-dark',
      name: 'Plné tlačítko (tmavé)',
      role: 'Plná barva tlačítka na tmavém pozadí',
      hex: base,
      bgPreview: '#14151B',
      fgText: getContrastColor(base),
      previewType: 'button' as const,
      isDarkBg: true,
    },
    {
      id: 'surface-light',
      name: 'Světlý povrch (Surface)',
      role: 'Jemně tónovaný světlý povrch',
      hex: mixColors('#FFFFFF', base, 0.06),
      bgPreview: '#E5E7EB',
      fgText: '#111827',
      previewType: 'surface' as const,
      isDarkBg: false,
    },
    {
      id: 'surface-dark',
      name: 'Tmavý povrch (Surface)',
      role: 'Jemně tónovaný tmavý povrch',
      hex: mixColors('#121318', base, 0.08),
      bgPreview: '#000000',
      fgText: '#F9FAFB',
      previewType: 'surface' as const,
      isDarkBg: true,
    },
    {
      id: 'container-light',
      name: 'Světlý kontejner',
      role: 'Tónované tlačítko na světlém povrchu',
      hex: mixColors('#FFFFFF', base, 0.20),
      bgPreview: '#F8F9FA',
      fgText: mixColors('#000000', base, 0.38),
      previewType: 'container' as const,
      isDarkBg: false,
    },
    {
      id: 'container-dark',
      name: 'Tmavý kontejner',
      role: 'Tónované tlačítko na tmavém povrchu',
      hex: mixColors('#161822', base, 0.26),
      bgPreview: '#0F1015',
      fgText: mixColors('#FFFFFF', base, 0.15),
      previewType: 'container' as const,
      isDarkBg: true,
    },
  ];

  return rawList.map((item) => {
    const parsed = parseColorQuery(item.hex)!;
    return {
      id: item.id,
      name: item.name,
      role: item.role,
      hex: parsed.hex,
      hex8: parsed.hex8,
      rgb: parsed.rgb,
      rgba: parsed.rgba,
      hsl: parsed.hsl,
      isDark: item.fgText === '#FFFFFF' || item.isDarkBg,
      bgPreview: item.bgPreview,
      fgText: item.fgText,
      previewType: item.previewType,
      isDarkBg: item.isDarkBg,
    };
  });
}

export interface Material3Scheme {
  primaryLight: string;
  onPrimaryLight: string;
  primaryContainerLight: string;
  onPrimaryContainerLight: string;
  secondaryLight: string;
  onSecondaryLight: string;
  secondaryContainerLight: string;
  onSecondaryContainerLight: string;
  tertiaryLight: string;
  onTertiaryLight: string;
  tertiaryContainerLight: string;
  onTertiaryContainerLight: string;
  errorLight: string;
  onErrorLight: string;
  errorContainerLight: string;
  onErrorContainerLight: string;
  backgroundLight: string;
  onBackgroundLight: string;
  surfaceLight: string;
  onSurfaceLight: string;
  surfaceVariantLight: string;
  onSurfaceVariantLight: string;
  outlineLight: string;
  outlineVariantLight: string;
  scrimLight: string;
  inverseSurfaceLight: string;
  inverseOnSurfaceLight: string;
  inversePrimaryLight: string;
  surfaceDimLight: string;
  surfaceBrightLight: string;
  surfaceContainerLowestLight: string;
  surfaceContainerLowLight: string;
  surfaceContainerLight: string;
  surfaceContainerHighLight: string;
  surfaceContainerHighestLight: string;
}

/**
 * Generates full Material 3 Color Scheme from 5 palette slots
 */
export function generateMaterial3Scheme(paletteColors: (string | null)[]): Material3Scheme {
  const primary = paletteColors[0] || '#004E9F';
  const secondary = paletteColors[1] || adjustHsl(primary, 0, -25, -12);
  const tertiary = paletteColors[2] || adjustHsl(primary, 60, -15, 0);
  const error = paletteColors[3] || '#BA1A1A';
  const surfaceBase = paletteColors[4] || mixColors('#F9F9FF', primary, 0.05);

  return {
    primaryLight: primary,
    onPrimaryLight: getContrastColor(primary),
    primaryContainerLight: mixColors('#FFFFFF', primary, 0.22),
    onPrimaryContainerLight: mixColors('#000000', primary, 0.35),

    secondaryLight: secondary,
    onSecondaryLight: getContrastColor(secondary),
    secondaryContainerLight: mixColors('#FFFFFF', secondary, 0.22),
    onSecondaryContainerLight: mixColors('#000000', secondary, 0.35),

    tertiaryLight: tertiary,
    onTertiaryLight: getContrastColor(tertiary),
    tertiaryContainerLight: mixColors('#FFFFFF', tertiary, 0.22),
    onTertiaryContainerLight: mixColors('#000000', tertiary, 0.35),

    errorLight: error,
    onErrorLight: getContrastColor(error),
    errorContainerLight: mixColors('#FFFFFF', error, 0.16),
    onErrorContainerLight: mixColors('#000000', error, 0.38),

    backgroundLight: surfaceBase,
    onBackgroundLight: getContrastColor(surfaceBase),
    surfaceLight: surfaceBase,
    onSurfaceLight: getContrastColor(surfaceBase),
    surfaceVariantLight: mixColors('#FFFFFF', surfaceBase, 0.14),
    onSurfaceVariantLight: mixColors('#000000', surfaceBase, 0.32),
    outlineLight: mixColors('#808080', surfaceBase, 0.15),
    outlineVariantLight: mixColors('#C0C0C0', surfaceBase, 0.12),
    scrimLight: '#000000',
    inverseSurfaceLight: mixColors('#1A1C20', surfaceBase, 0.06),
    inverseOnSurfaceLight: mixColors('#F0F2F8', surfaceBase, 0.04),
    inversePrimaryLight: adjustHsl(primary, 0, 15, 35),
    surfaceDimLight: mixColors('#D0D2DC', surfaceBase, 0.08),
    surfaceBrightLight: mixColors('#FFFFFF', surfaceBase, 0.02),
    surfaceContainerLowestLight: '#FFFFFF',
    surfaceContainerLowLight: mixColors('#FFFFFF', surfaceBase, 0.06),
    surfaceContainerLight: mixColors('#FFFFFF', surfaceBase, 0.10),
    surfaceContainerHighLight: mixColors('#FFFFFF', surfaceBase, 0.14),
    surfaceContainerHighestLight: mixColors('#FFFFFF', surfaceBase, 0.18),
  };
}

/**
 * Converts a hex string into Android Studio Compose Color(0xFF...) format
 */
export function hexToAndroidStudioColor(hex: string): string {
  const clean = hex.replace('#', '').toUpperCase();
  if (clean.length === 8) {
    return `Color(0x${clean.slice(6, 8)}${clean.slice(0, 6)})`;
  }
  return `Color(0xFF${clean.slice(0, 6)})`;
}

/**
 * Exports Material 3 theme color tokens to Kotlin syntax for Android Studio (Jetpack Compose)
 * exactly matching Google guideline template (without extra custom colors like success)
 */
export function exportToAndroidStudioKotlin(paletteColors: (string | null)[]): string {
  const scheme = generateMaterial3Scheme(paletteColors);
  return [
    `val primaryLight = ${hexToAndroidStudioColor(scheme.primaryLight)}`,
    `val onPrimaryLight = ${hexToAndroidStudioColor(scheme.onPrimaryLight)}`,
    `val primaryContainerLight = ${hexToAndroidStudioColor(scheme.primaryContainerLight)}`,
    `val onPrimaryContainerLight = ${hexToAndroidStudioColor(scheme.onPrimaryContainerLight)}`,
    `val secondaryLight = ${hexToAndroidStudioColor(scheme.secondaryLight)}`,
    `val onSecondaryLight = ${hexToAndroidStudioColor(scheme.onSecondaryLight)}`,
    `val secondaryContainerLight = ${hexToAndroidStudioColor(scheme.secondaryContainerLight)}`,
    `val onSecondaryContainerLight = ${hexToAndroidStudioColor(scheme.onSecondaryContainerLight)}`,
    `val tertiaryLight = ${hexToAndroidStudioColor(scheme.tertiaryLight)}`,
    `val onTertiaryLight = ${hexToAndroidStudioColor(scheme.onTertiaryLight)}`,
    `val tertiaryContainerLight = ${hexToAndroidStudioColor(scheme.tertiaryContainerLight)}`,
    `val onTertiaryContainerLight = ${hexToAndroidStudioColor(scheme.onTertiaryContainerLight)}`,
    `val errorLight = ${hexToAndroidStudioColor(scheme.errorLight)}`,
    `val onErrorLight = ${hexToAndroidStudioColor(scheme.onErrorLight)}`,
    `val errorContainerLight = ${hexToAndroidStudioColor(scheme.errorContainerLight)}`,
    `val onErrorContainerLight = ${hexToAndroidStudioColor(scheme.onErrorContainerLight)}`,
    `val backgroundLight = ${hexToAndroidStudioColor(scheme.backgroundLight)}`,
    `val onBackgroundLight = ${hexToAndroidStudioColor(scheme.onBackgroundLight)}`,
    `val surfaceLight = ${hexToAndroidStudioColor(scheme.surfaceLight)}`,
    `val onSurfaceLight = ${hexToAndroidStudioColor(scheme.onSurfaceLight)}`,
    `val surfaceVariantLight = ${hexToAndroidStudioColor(scheme.surfaceVariantLight)}`,
    `val onSurfaceVariantLight = ${hexToAndroidStudioColor(scheme.onSurfaceVariantLight)}`,
    `val outlineLight = ${hexToAndroidStudioColor(scheme.outlineLight)}`,
    `val outlineVariantLight = ${hexToAndroidStudioColor(scheme.outlineVariantLight)}`,
    `val scrimLight = ${hexToAndroidStudioColor(scheme.scrimLight)}`,
    `val inverseSurfaceLight = ${hexToAndroidStudioColor(scheme.inverseSurfaceLight)}`,
    `val inverseOnSurfaceLight = ${hexToAndroidStudioColor(scheme.inverseOnSurfaceLight)}`,
    `val inversePrimaryLight = ${hexToAndroidStudioColor(scheme.inversePrimaryLight)}`,
    `val surfaceDimLight = ${hexToAndroidStudioColor(scheme.surfaceDimLight)}`,
    `val surfaceBrightLight = ${hexToAndroidStudioColor(scheme.surfaceBrightLight)}`,
    `val surfaceContainerLowestLight = ${hexToAndroidStudioColor(scheme.surfaceContainerLowestLight)}`,
    `val surfaceContainerLowLight = ${hexToAndroidStudioColor(scheme.surfaceContainerLowLight)}`,
    `val surfaceContainerLight = ${hexToAndroidStudioColor(scheme.surfaceContainerLight)}`,
    `val surfaceContainerHighLight = ${hexToAndroidStudioColor(scheme.surfaceContainerHighLight)}`,
    `val surfaceContainerHighestLight = ${hexToAndroidStudioColor(scheme.surfaceContainerHighestLight)}`,
  ].join('\n');
}

/**
 * Exports Material 3 theme color tokens to CSS Variables syntax
 */
export function exportToCssVariables(paletteColors: (string | null)[]): string {
  const scheme = generateMaterial3Scheme(paletteColors);
  const toKebab = (str: string) => str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const lines = Object.entries(scheme).map(([key, val]) => `  --${toKebab(key)}: ${val};`);
  return `:root {\n${lines.join('\n')}\n}`;
}
