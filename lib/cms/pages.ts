import pagesData from '../../reference/localized-pages.json';
import { ReferencePage } from './types';

export const pages = pagesData as Record<string, ReferencePage & { bodyAttributes?: Record<string, string>; htmlClass?: string; locale:'ru'|'en';canonicalPath:string }>;
const paths = Object.keys(pages);

function knownPath(path: string): string | null {
 if (Object.prototype.hasOwnProperty.call(pages, path)) return path;
 try {
  const decoded = decodeURIComponent(path);
  return paths.find(candidate => decodeURIComponent(candidate) === decoded) || null;
 } catch { return null; }
}

// Shopify collection/product URLs display the same product and share its content.
export function resolvePagePath(path: string): string | null {
 // English snapshots and their document keys remain archived, not routable.
 if (russianRedirectPath(path) !== null) return null;
 const clean=canonicalPath(path);
 const product = clean.match(/^\/collections\/[^/]+(\/products\/.+)$/);
 return (product && knownPath(product[1])) || knownPath(clean);
}

/** Accept pathname only. Always produce a same-origin path, never //host. */
export function russianRedirectPath(path:string):string|null {
 let decoded:string;
 try { decoded=decodeURIComponent(path).replace(/\\/g,'/'); } catch { return null; }
 if (decoded!=='/en'&&!decoded.startsWith('/en/')) return null;
 const suffix=decoded.slice(3).replace(/^\/+/, '');
 // Re-encode each path segment so encoded ?, #, control characters and slashes
 // cannot turn a preserved pathname into a URL authority or a response header.
 return '/'+suffix.split('/').map(segment=>encodeURIComponent(segment)).join('/');
}

export function pageLocale(path:string):'ru'|'en' { return path==='/en'||path.startsWith('/en/')?'en':'ru'; }
export function canonicalPath(path:string):string {return pageLocale(path)==='en'?path.slice(3)||'/':path;}
// Preserve the original English documents; Russian edits use their own keys.
export function documentKey(path:string):string {return path==='__settings'?path:pageLocale(path)==='en'?canonicalPath(path):'/ru'+canonicalPath(path);}

export const editablePages = Object.entries(pages).filter(([path,page]) => page.locale==='ru'&&resolvePagePath(path) === path);
