import type { LauncherItem } from '../types';

/**
 * Validates standalone email address format.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Detects if query is a standalone email address (e.g. alzbeta.radova@magicware.cz)
 * and generates a direct link to open the Gmail compose window with that recipient.
 *
 * Example:
 * Input: "alzbeta.radova@magicware.cz"
 * Generated URL: https://mail.google.com/mail/u/0/?tf=cm&fs=1&to=alzbeta.radova@magicware.cz&hl=cs
 */
export function detectEmail(query: string): LauncherItem | null {
  const trimmed = query.trim();
  if (trimmed.length < 5 || !trimmed.includes('@')) return null;

  if (!EMAIL_REGEX.test(trimmed)) {
    return null;
  }

  const gmailUrl = `https://mail.google.com/mail/u/0/?tf=cm&fs=1&to=${trimmed}&hl=cs`;

  return {
    id: `gmail-${trimmed.toLowerCase()}`,
    name: `Napsat e-mail: ${trimmed}`,
    location: gmailUrl,
    action: 'open',
    icon: 'mail',
    image: null,
    priority: -1.5,
    settings: null,
  };
}
