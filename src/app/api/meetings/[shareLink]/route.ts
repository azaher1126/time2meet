import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v4 as uuidv4 } from "uuid";
import db from "@/lib/db";
import { authOptions } from "@/lib/auth";

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  creator_id: string | null;
  share_link: string;
  is_private: number;
  created_at: string;
}

interface MeetingInvite {
  email: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string }> },
) {
  try {
    const { shareLink } = await params;
    const session = await getServerSession(authOptions);

    const meeting = db
      .prepare("SELECT * FROM meetings WHERE share_link = ?")
      .get(shareLink) as Meeting | undefined;

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Check if meeting is private and has invited emails
    const invites = db
      .prepare("SELECT email FROM meeting_invites WHERE meeting_id = ?")
      .all(meeting.id) as MeetingInvite[];

    const hasInviteList = invites.length > 0;

    // If meeting has invite list and user is not creator
    if (hasInviteList && meeting.creator_id !== session?.user?.id) {
      // User must be logged in and in the invite list
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: "This meeting requires authentication", requiresAuth: true },
          { status: 403 },
        );
      }

      const isInvited = invites.some(
        (inv) => inv.email.toLowerCase() === session.user.email.toLowerCase(),
      );

      if (!isInvited) {
        return NextResponse.json(
          { error: "You are not invited to this meeting" },
          { status: 403 },
        );
      }
    }

    return NextResponse.json({ meeting, invites });
  } catch (error) {
    console.error("Get meeting error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string }> },
) {
  try {
    const { shareLink } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const meeting = db
      .prepare("SELECT * FROM meetings WHERE share_link = ?")
      .get(shareLink) as Meeting | undefined;

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Only the creator can edit the meeting
    if (meeting.creator_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the creator can edit this meeting" },
        { status: 403 },
      );
    }

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
        { error: "Title, start date, and end date are required" },
        { status: 400 },
      );
    }

    // Update the meeting
    db.prepare(
      `UPDATE meetings
       SET title = ?, description = ?, location = ?, start_date = ?, end_date = ?,
           start_time = ?, end_time = ?, is_private = ?
       WHERE id = ?`,
    ).run(
      title,
      description || null,
      location || null,
      startDate,
      endDate,
      startTime || null,
      endTime || null,
      isPrivate ? 1 : 0,
      meeting.id,
    );

    // Update invited emails - delete existing and re-add
    db.prepare("DELETE FROM meeting_invites WHERE meeting_id = ?").run(
      meeting.id,
    );

    if (invitedEmails && Array.isArray(invitedEmails)) {
      const insertInvite = db.prepare(
        "INSERT OR IGNORE INTO meeting_invites (id, meeting_id, email) VALUES (?, ?, ?)",
      );
      for (const email of invitedEmails) {
        if (email && typeof email === "string") {
          insertInvite.run(uuidv4(), meeting.id, email.toLowerCase().trim());
        }
      }
    }

    return NextResponse.json({ message: "Meeting updated successfully" });
  } catch (error) {
    console.error("Update meeting error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string }> },
) {
  try {
    const { shareLink } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const meeting = db
      .prepare("SELECT * FROM meetings WHERE share_link = ?")
      .get(shareLink) as Meeting | undefined;

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Only the creator can delete the meeting
    if (meeting.creator_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the creator can delete this meeting" },
        { status: 403 },
      );
    }

    // Delete the meeting (cascades to invites and responses due to foreign keys)
    db.prepare("DELETE FROM meetings WHERE id = ?").run(meeting.id);

    return NextResponse.json({ message: "Meeting deleted successfully" });
  } catch (error) {
    console.error("Delete meeting error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
