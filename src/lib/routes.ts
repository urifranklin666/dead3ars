import type { Route } from 'next';

/* Typed-route helpers: with typedRoutes enabled, a bad link is a compile
 * error, so dynamic hrefs go through here rather than being cast ad hoc. */
export const moduleHref = (id: string): Route => `/modules/${id}` as Route;
export const lessonHref = (id: string, hash?: string): Route =>
  (hash ? `/modules/${id}#${hash}` : `/modules/${id}`) as Route;
