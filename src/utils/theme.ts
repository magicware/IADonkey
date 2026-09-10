/**
 * Applies the primary accent color across the application.
 * Directly injects and updates dynamic CSS rules with !important to guarantee
 * immediate real-time styling without relying on bundler reloads.
 */
export function applyPrimaryColor(hexColor?: string) {
  const hex = (hexColor || '#6366f1').trim();
  const validHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex) ? hex : '#6366f1';

  let fullHex = validHex;
  if (fullHex.length === 4) {
    fullHex = '#' + fullHex[1] + fullHex[1] + fullHex[2] + fullHex[2] + fullHex[3] + fullHex[3];
  }

  const r = parseInt(fullHex.slice(1, 3), 16);
  const g = parseInt(fullHex.slice(3, 5), 16);
  const b = parseInt(fullHex.slice(5, 7), 16);

  // Lighter tint for text / icons on dark backgrounds
  const rLighter = Math.min(255, Math.round(r + (255 - r) * 0.25));
  const gLighter = Math.min(255, Math.round(g + (255 - g) * 0.25));
  const bLighter = Math.min(255, Math.round(b + (255 - b) * 0.25));
  const hexLighter = `#${rLighter.toString(16).padStart(2, '0')}${gLighter.toString(16).padStart(2, '0')}${bLighter.toString(16).padStart(2, '0')}`;

  // Darker shade for active / pressed buttons
  const rDarker = Math.round(r * 0.82);
  const gDarker = Math.round(g * 0.82);
  const bDarker = Math.round(b * 0.82);
  const hexDarker = `#${rDarker.toString(16).padStart(2, '0')}${gDarker.toString(16).padStart(2, '0')}${bDarker.toString(16).padStart(2, '0')}`;

  // Set standard root variables
  const root = document.documentElement;
  root.style.setProperty('--color-primary-hex', fullHex);
  root.style.setProperty('--color-primary-rgb', `${r}, ${g}, ${b}`);
  root.style.setProperty('--color-primary-500-rgb', `${r} ${g} ${b}`);
  root.style.setProperty('--color-primary-400-rgb', `${rLighter} ${gLighter} ${bLighter}`);
  root.style.setProperty('--color-primary-300-rgb', `${rLighter} ${gLighter} ${bLighter}`);
  root.style.setProperty('--color-primary-600-rgb', `${rDarker} ${gDarker} ${bDarker}`);

  // Create or update dedicated dynamic stylesheet
  let styleEl = document.getElementById('iadonkey-dynamic-theme') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'iadonkey-dynamic-theme';
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    /* Primary buttons */
    .bg-indigo-600 {
      background-color: ${fullHex} !important;
    }
    .hover\\:bg-indigo-500:hover,
    .hover\\:bg-indigo-600:hover {
      background-color: ${hexLighter} !important;
    }
    .active\\:bg-indigo-700:active {
      background-color: ${hexDarker} !important;
    }

    /* Primary texts & icons */
    .text-indigo-400,
    .text-indigo-300,
    .text-indigo-200 {
      color: ${hexLighter} !important;
    }

    /* Borders & outlines */
    .border-indigo-500,
    .border-indigo-400 {
      border-color: ${fullHex} !important;
    }
    .border-t-indigo-500,
    .border-t-indigo-400 {
      border-top-color: ${fullHex} !important;
    }
    .focus\\:border-indigo-500:focus,
    .focus-within\\:border-indigo-500:focus-within {
      border-color: ${fullHex} !important;
    }

    /* Selected spotlight row */
    .bg-indigo-600\\/30 {
      background-color: rgba(${r}, ${g}, ${b}, 0.28) !important;
    }
    .border-indigo-500\\/40 {
      border-color: rgba(${r}, ${g}, ${b}, 0.5) !important;
    }

    /* Subitems chips & option badges */
    .bg-indigo-500\\/20 {
      background-color: rgba(${r}, ${g}, ${b}, 0.2) !important;
    }
    .hover\\:bg-indigo-500\\/35:hover {
      background-color: rgba(${r}, ${g}, ${b}, 0.35) !important;
    }
    .border-indigo-500\\/30,
    .border-indigo-500\\/20 {
      border-color: rgba(${r}, ${g}, ${b}, 0.35) !important;
    }

    /* Navigation banners & headers */
    .bg-indigo-950\\/40 {
      background-color: rgba(${r}, ${g}, ${b}, 0.18) !important;
    }
    .hover\\:bg-indigo-900\\/40:hover {
      background-color: rgba(${r}, ${g}, ${b}, 0.28) !important;
    }

    /* Gradients */
    .from-indigo-500 {
      --tw-gradient-from: ${fullHex} var(--tw-gradient-from-position) !important;
      --tw-gradient-to: rgba(${r}, ${g}, ${b}, 0) var(--tw-gradient-to-position) !important;
      --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
    }

    /* Shadows & rings */
    .shadow-indigo-600\\/30,
    .shadow-indigo-600\\/20,
    .shadow-indigo-500\\/20 {
      --tw-shadow-color: rgba(${r}, ${g}, ${b}, 0.35) !important;
    }
    .ring-indigo-500\\/50 {
      --tw-ring-color: rgba(${r}, ${g}, ${b}, 0.5) !important;
    }
  `;
}
