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
    chipClass: 'bg-amber-500/20 text-amber-300',
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
    chipClass: 'bg-rose-500/20 text-rose-300',
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
    chipClass: 'bg-blue-500/20 text-blue-300',
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
    chipClass: 'bg-orange-500/20 text-orange-300',
    fallbackIcon: 'public',
    defaultFaviconUrl: 'https://www.centrum.cz/favicon.ico',
  },
];
