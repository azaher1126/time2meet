import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const {
      title,
      description,
      location,
      startDate,
      endDate,
      startTime,
      endTime,
      isPrivate,
      invitedEmails,
    } = await request.json();

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Title, start date, and end date are required' },
        { status: 400 }
      );
    }

    const meetingId = uuidv4();
    const shareLink = uuidv4().slice(0, 8);

    db.prepare(
      `INSERT INTO meetings (id, title, description, location, start_date, end_date, start_time, end_time, creator_id, share_link, is_private)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      meetingId,
      title,
      description || null,
      location || null,
      startDate,
      endDate,
      startTime || null,
      endTime || null,
      session?.user?.id || null,
      shareLink,
      isPrivate && session?.user?.id ? 1 : 0
    );

    // Add invited emails if provided
    if (invitedEmails && Array.isArray(invitedEmails) && session?.user?.id) {
      const insertInvite = db.prepare(
        'INSERT OR IGNORE INTO meeting_invites (id, meeting_id, email) VALUES (?, ?, ?)'
      );
      for (const email of invitedEmails) {
        if (email && typeof email === 'string') {
          insertInvite.run(uuidv4(), meetingId, email.toLowerCase().trim());
        }
      }
    }

    return NextResponse.json(
      { meetingId, shareLink },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create meeting error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get meetings created by user
    const createdMeetings = db
      .prepare(
        `SELECT m.*,
          (SELECT COUNT(*) FROM responses WHERE meeting_id = m.id) as response_count
         FROM meetings m
         WHERE m.creator_id = ?
         ORDER BY m.created_at DESC`
      )
      .all(session.user.id);

    // Get meetings user has responded to
    const respondedMeetings = db
      .prepare(
        `SELECT m.*, r.id as response_id
         FROM meetings m
         JOIN responses r ON r.meeting_id = m.id
         WHERE r.user_id = ? AND m.creator_id != ?
         ORDER BY r.updated_at DESC`
      )
      .all(session.user.id, session.user.id);

    return NextResponse.json({
      created: createdMeetings,
      responded: respondedMeetings,
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
