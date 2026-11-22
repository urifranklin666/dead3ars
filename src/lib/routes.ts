import type { Route } from 'next';

/* Typed-route helpers: with typedRoutes enabled, a bad link is a compile
 * error, so dynamic hrefs go through here rather than being cast ad hoc. */
export const moduleHref = (id: string): Route => `/modules/${id}` as Route;
export const lessonHref = (id: string, hash?: string): Route =>
  (hash ? `/modules/${id}#${hash}` : `/modules/${id}`) as Route;
export const classHref = (id: number): Route => `/teacher/classes/${id}` as Route;
export const classAnalyticsHref = (id: number): Route =>
  `/teacher/classes/${id}/analytics` as Route;
export const studentHref = (id: number): Route => `/teacher/students/${id}` as Route;
export const studentClassHref = (id: number): Route => `/classes/${id}` as Route;
export const assignmentHref = (id: number): Route => `/assignments/${id}` as Route;
export const gradingHref = (id: number): Route => `/teacher/assignments/${id}` as Route;
