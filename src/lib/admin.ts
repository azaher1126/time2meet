import { getServerSession } from 'next-auth';
import db from './db';
import { authOptions } from './auth';

/**
 * Check if the current user is an admin
 * @returns Promise<boolean>
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;
  
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(session.user.id) as { is_admin: number } | undefined;
  return user?.is_admin === 1;
}

/**
 * Check if a user is active
 * @param userId - The user ID to check
 * @returns boolean
 */
export function isUserActive(userId: string): boolean {
  const user = db.prepare('SELECT is_active FROM users WHERE id = ?').get(userId) as { is_active: number } | undefined;
  return user?.is_active === 1;
}

/**
 * Get admin status for a user
 * @param userId - The user ID to check
 * @returns boolean
 */
export function isUserAdmin(userId: string): boolean {
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(userId) as { is_admin: number } | undefined;
  return user?.is_admin === 1;
}