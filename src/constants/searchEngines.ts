export interface SearchEngineDefinition {
  id: string;
  name: string;
  baseUrl: string;
  searchUrlTemplate: string;
  prefixes: string[];
  chipLabel: string;
  chipClass: string;
  fallbackIcon: string;
  defaultFaviconUrl: string;
}

export const SEARCH_ENGINES: SearchEngineDefinition[] = [
  {
    id: 'google',
    name: 'Google',
    baseUrl: 'https://www.google.com',
    searchUrlTemplate: 'https://www.google.com/search?q={query}',
    prefixes: ['google', 'g'],
    chipLabel: 'Google',
    chipClass: 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30',
    fallbackIcon: 'search',
    defaultFaviconUrl: 'https://www.google.com/favicon.ico',
  },
  {
    id: 'seznam',
    name: 'Seznam.cz',
    baseUrl: 'https://search.seznam.cz',
    searchUrlTemplate: 'https://search.seznam.cz/?q={query}',
    prefixes: ['seznam', 's'],
    chipLabel: 'Seznam',
    chipClass: 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30',
    fallbackIcon: 'travel_explore',
    defaultFaviconUrl: 'https://search.seznam.cz/favicon.ico',
  },
  {
    id: 'wikipedia',
    name: 'Wikipedie',
    baseUrl: 'https://cs.wikipedia.org',
    searchUrlTemplate: 'https://cs.wikipedia.org/wiki/Special:Search?search={query}',
    prefixes: ['wiki', 'w'],
    chipLabel: 'Wikipedia',
    chipClass: 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30',
    fallbackIcon: 'menu_book',
    defaultFaviconUrl: 'https://cs.wikipedia.org/static/favicon/wikipedia.ico',
  },
  {
    id: 'centrum',
    name: 'Centrum.cz',
    baseUrl: 'https://www.centrum.cz',
    searchUrlTemplate: 'https://search.centrum.cz/?q={query}',
    prefixes: ['centrum', 'c'],
    chipLabel: 'Centrum',
    chipClass: 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30',
    fallbackIcon: 'public',
    defaultFaviconUrl: 'https://www.centrum.cz/favicon.ico',
  },
];
