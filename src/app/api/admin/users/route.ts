import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import db from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { isCurrentUserAdmin } from '@/lib/admin';

interface DbUser {
  id: string;
  email: string;
  name: string;
  is_admin: number;
  is_active: number;
  created_at: string;
  last_login: string | null;
  meetings_count: number;
  responses_count: number;
  login_count: number;
}

// GET - Get all users
export async function GET() {
  try {
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const users = db.prepare(`
      SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.is_admin, 
        u.is_active, 
        u.created_at,
        (SELECT MAX(logged_in_at) FROM login_history WHERE user_id = u.id) as last_login,
        (SELECT COUNT(*) FROM meetings WHERE creator_id = u.id) as meetings_count,
        (SELECT COUNT(*) FROM responses WHERE user_id = u.id) as responses_count,
        (SELECT COUNT(*) FROM login_history WHERE user_id = u.id) as login_count
      FROM users u
      ORDER BY u.created_at DESC
    `).all() as DbUser[];

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update user (deactivate/activate, elevate to admin, demote from admin)
export async function PATCH(request: NextRequest) {
  try {
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    const { userId, action } = await request.json();

    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 });
    }

    // Cannot modify self
    if (userId === session?.user?.id) {
      return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 });
    }

    // Check if target user exists
    const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    switch (action) {
      case 'deactivate':
        db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(userId);
        break;
      case 'activate':
        db.prepare('UPDATE users SET is_active = 1 WHERE id = ?').run(userId);
        break;
      case 'elevate':
        db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(userId);
        break;
      case 'demote':
        db.prepare('UPDATE users SET is_admin = 0 WHERE id = ?').run(userId);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}