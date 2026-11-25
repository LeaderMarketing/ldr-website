// Prefixes a root-relative path with the deploy base, so the site works both at a
// domain root (www.ldr.com.au) and under a subpath (GitHub Pages preview: /ldr-website/).
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const url = (path: string) => (path.startsWith('/') ? BASE + path : path);
