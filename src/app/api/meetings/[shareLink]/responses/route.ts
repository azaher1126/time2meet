import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v4 as uuidv4 } from "uuid";
import db from "@/lib/db";
import { authOptions } from "@/lib/auth";

interface Meeting {
  id: string;
  title: string;
  creator_id: string | null;
  is_private: number;
}

interface MeetingInvite {
  email: string;
}

interface Response {
  id: string;
  meeting_id: string;
  user_id: string | null;
  guest_name: string | null;
  created_at: string;
  updated_at: string;
}

interface AvailabilitySlot {
  id: string;
  response_id: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface ResponseWithSlots extends Response {
  name: string;
  slots: AvailabilitySlot[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string }> },
) {
  try {
    const { shareLink } = await params;
    const session = await getServerSession(authOptions);
    const { guestName, slots } = await request.json();

    const meeting = db
      .prepare("SELECT * FROM meetings WHERE share_link = ?")
      .get(shareLink) as Meeting | undefined;

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Check invite list access
    const invites = db
      .prepare("SELECT email FROM meeting_invites WHERE meeting_id = ?")
      .all(meeting.id) as MeetingInvite[];

    if (invites.length > 0 && meeting.creator_id !== session?.user?.id) {
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: "This meeting requires authentication" },
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

    // Guest users must provide a name
    if (!session?.user?.id && !guestName) {
      return NextResponse.json(
        { error: "Guest name is required" },
        { status: 400 },
      );
    }

    // Check for existing response
    let existingResponse: Response | undefined;
    if (session?.user?.id) {
      existingResponse = db
        .prepare("SELECT * FROM responses WHERE meeting_id = ? AND user_id = ?")
        .get(meeting.id, session.user.id) as Response | undefined;
    } else if (guestName) {
      // For guest users, check if they have an existing response by name (case-insensitive)
      existingResponse = db
        .prepare(
          "SELECT * FROM responses WHERE meeting_id = ? AND LOWER(guest_name) = LOWER(?)",
        )
        .get(meeting.id, guestName.trim()) as Response | undefined;
    }

    const responseId = existingResponse?.id || uuidv4();

    if (existingResponse) {
      // Delete existing slots
      db.prepare("DELETE FROM availability_slots WHERE response_id = ?").run(
        responseId,
      );
      // Update response
      db.prepare(
        "UPDATE responses SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      ).run(responseId);
    } else {
      // Create new response
      db.prepare(
        "INSERT INTO responses (id, meeting_id, user_id, guest_name) VALUES (?, ?, ?, ?)",
      ).run(
        responseId,
        meeting.id,
        session?.user?.id || null,
        session?.user?.id ? null : guestName.trim(),
      );
    }

    // Insert new slots
    const insertSlot = db.prepare(
      "INSERT INTO availability_slots (id, response_id, date, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
    );

    for (const slot of slots) {
      insertSlot.run(
        uuidv4(),
        responseId,
        slot.date,
        slot.startTime,
        slot.endTime,
      );
    }

    return NextResponse.json(
      { message: "Response saved successfully", responseId },
      { status: 201 },
    );
  } catch (error) {
    console.error("Save response error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string }> },
) {
  try {
    const { shareLink } = await params;
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const guestName = searchParams.get("guestName");

    const meeting = db
      .prepare("SELECT * FROM meetings WHERE share_link = ?")
      .get(shareLink) as Meeting | undefined;

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Check if user can view results
    const isCreator = session?.user?.id === meeting.creator_id;
    const isPrivate = meeting.is_private === 1;

    // If a specific guest name is provided, return only that guest's response
    // This allows guests to load their own previous response even on private meetings
    if (guestName) {
      const guestResponse = db
        .prepare(
          `SELECT r.*, COALESCE(u.name, r.guest_name) as name
           FROM responses r
           LEFT JOIN users u ON r.user_id = u.id
           WHERE r.meeting_id = ? AND LOWER(r.guest_name) = LOWER(?)`,
        )
        .get(meeting.id, guestName.trim()) as
        | (Response & { name: string })
        | undefined;

      if (guestResponse) {
        const slots = db
          .prepare("SELECT * FROM availability_slots WHERE response_id = ?")
          .all(guestResponse.id) as AvailabilitySlot[];

        return NextResponse.json({
          guestResponse: { ...guestResponse, slots },
          canViewAllResults: !isPrivate || isCreator,
        });
      }

      return NextResponse.json({
        guestResponse: null,
        canViewAllResults: !isPrivate || isCreator,
      });
    }

    // If meeting is private and user is not creator, deny access to full results
    if (isPrivate && !isCreator) {
      // But still return the user's own response if they're logged in
      if (session?.user?.id) {
        const userResponse = db
          .prepare(
            `SELECT r.*, COALESCE(u.name, r.guest_name) as name
             FROM responses r
             LEFT JOIN users u ON r.user_id = u.id
             WHERE r.meeting_id = ? AND r.user_id = ?`,
          )
          .get(meeting.id, session.user.id) as
          | (Response & { name: string })
          | undefined;

        if (userResponse) {
          const slots = db
            .prepare("SELECT * FROM availability_slots WHERE response_id = ?")
            .all(userResponse.id) as AvailabilitySlot[];

          return NextResponse.json({
            responses: [{ ...userResponse, slots }],
            userResponseOnly: true,
          });
        }
      }

      return NextResponse.json(
        { error: "Only the creator can view results for this meeting" },
        { status: 403 },
      );
    }

    // Get all responses with user info
    const responses = db
      .prepare(
        `SELECT r.*, COALESCE(u.name, r.guest_name) as name
         FROM responses r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.meeting_id = ?`,
      )
      .all(meeting.id) as (Response & { name: string })[];

    // Get slots for each response
    const responsesWithSlots: ResponseWithSlots[] = responses.map(
      (response) => {
        const slots = db
          .prepare("SELECT * FROM availability_slots WHERE response_id = ?")
          .all(response.id) as AvailabilitySlot[];

        return {
          ...response,
          slots,
        };
      },
    );

    return NextResponse.json({ responses: responsesWithSlots });
  } catch (error) {
    console.error("Get responses error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
