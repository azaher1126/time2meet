import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { isCurrentUserAdmin } from '@/lib/admin';

interface DbMeeting {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  creator_id: string | null;
  creator_name: string | null;
  creator_email: string | null;
  share_link: string;
  is_private: number;
  created_at: string;
  response_count: number;
}

// GET - Get all meetings
export async function GET() {
  try {
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const meetings = db.prepare(`
      SELECT 
        m.*,
        u.name as creator_name,
        u.email as creator_email,
        (SELECT COUNT(*) FROM responses WHERE meeting_id = m.id) as response_count
      FROM meetings m
      LEFT JOIN users u ON m.creator_id = u.id
      ORDER BY m.created_at DESC
    `).all() as DbMeeting[];

    return NextResponse.json({ meetings });
  } catch (error) {
    console.error('Get meetings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a meeting
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('id');

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    // Check if meeting exists
    const meeting = db.prepare('SELECT id FROM meetings WHERE id = ?').get(meetingId);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Delete the meeting (cascades to responses and availability_slots)
    db.prepare('DELETE FROM meetings WHERE id = ?').run(meetingId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete meeting error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}