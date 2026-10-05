import { currentUser, type SessionUser } from './auth';

export async function viewer(): Promise<SessionUser | null> {
  return currentUser();
}

export function isStaff(user: SessionUser | null): boolean {
  return user?.role === 'teacher' || user?.role === 'admin';
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === 'admin';
}
