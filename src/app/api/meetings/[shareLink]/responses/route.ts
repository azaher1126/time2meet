import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface SlotInput {
  date: string;
  startTime: string;
  endTime: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string }> }
) {
  try {
    const { shareLink } = await params;
    const session = await auth();
    const { guestName, slots } = await request.json();

    const meeting = await prisma.meeting.findUnique({
      where: { shareLink },
      include: { meetingInvites: true },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const userId = session?.user?.id;
    const invites = meeting.meetingInvites;

    // Check invite list access
    if (invites.length > 0 && meeting.creatorId !== userId) {
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: "This meeting requires authentication" },
          { status: 403 }
        );
      }

      const isInvited = invites.some(
        (inv) => inv.email.toLowerCase() === session.user.email.toLowerCase()
      );

      if (!isInvited) {
        return NextResponse.json(
          { error: "You are not invited to this meeting" },
          { status: 403 }
        );
      }
    }

    // Determine the name for the response
    let responseName: string;
    if (session?.user?.id) {
      // Logged in user - use their full name
      responseName = `${session.user.firstName} ${session.user.lastName}`;
    } else if (guestName && typeof guestName === "string") {
      // Guest user - use provided name
      responseName = guestName.trim();
    } else {
      return NextResponse.json(
        { error: "Guest name is required" },
        { status: 400 }
      );
    }

    // Upsert response and slots in a transaction
    const response = await prisma.$transaction(async (tx) => {
      // Find existing response - for logged-in users, first try by userId
      let existingResponse = null;
      
      if (userId) {
        // For logged-in users, look up by userId first
        existingResponse = await tx.meetingResponse.findFirst({
          where: {
            meetingId: meeting.id,
            userId: userId,
          },
        });
      }
      
      // If not found by userId, try by name
      if (!existingResponse) {
        existingResponse = await tx.meetingResponse.findUnique({
          where: {
            meetingId_name: {
              meetingId: meeting.id,
              name: responseName,
            },
          },
        });
      }

      if (existingResponse) {
        // Delete existing slots
        await tx.availabilitySlot.deleteMany({
          where: { meetingResponseId: existingResponse.id },
        });
        
        // Update the response to ensure userId and name are current
        existingResponse = await tx.meetingResponse.update({
          where: { id: existingResponse.id },
          data: {
            userId: userId ?? null,
            name: responseName,
          },
        });
      } else {
        // Create new response
        existingResponse = await tx.meetingResponse.create({
          data: {
            meetingId: meeting.id,
            name: responseName,
            userId: userId ?? null,
          },
        });
      }

      // Convert and insert new slots
      if (slots && Array.isArray(slots) && slots.length > 0) {
        const slotData = slots.map((slot: SlotInput) => {
          // Parse time strings (HH:mm) to minutes from midnight
          const [startHour, startMin] = slot.startTime.split(":").map(Number);
          const [endHour, endMin] = slot.endTime.split(":").map(Number);

          return {
            meetingResponseId: existingResponse.id,
            date: new Date(slot.date),
            startTime: startHour * 60 + startMin,
            endTime: endHour * 60 + endMin,
          };
        });

        await tx.availabilitySlot.createMany({
          data: slotData
        });
      }

      return existingResponse;
    });

    return NextResponse.json(
      { message: "Response saved successfully", responseId: response.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Save response error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string }> }
) {
  try {
    const { shareLink } = await params;
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const guestName = searchParams.get("guestName");

    const meeting = await prisma.meeting.findUnique({
      where: { shareLink },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const userId = session?.user?.id;
    const isCreator = userId === meeting.creatorId;
    const isPrivate = meeting.isPrivate;

    // Helper to format slots
    const formatSlots = (
      slots: { id: number; date: Date; startTime: number; endTime: number }[]
    ) =>
      slots.map((slot) => ({
        id: slot.id,
        date: slot.date.toISOString().split("T")[0],
        start_time: `${Math.floor(slot.startTime / 60)
          .toString()
          .padStart(2, "0")}:${(slot.startTime % 60).toString().padStart(2, "0")}`,
        end_time: `${Math.floor(slot.endTime / 60)
          .toString()
          .padStart(2, "0")}:${(slot.endTime % 60).toString().padStart(2, "0")}`,
      }));

    // If a specific guest name is provided, return only that guest's response
    if (guestName) {
      const guestResponse = await prisma.meetingResponse.findUnique({
        where: {
          meetingId_name: {
            meetingId: meeting.id,
            name: guestName.trim(),
          },
        },
        include: { availabilitySlots: true },
      });

      if (guestResponse) {
        return NextResponse.json({
          guestResponse: {
            id: guestResponse.id,
            meeting_id: guestResponse.meetingId,
            name: guestResponse.name,
            slots: formatSlots(guestResponse.availabilitySlots),
          },
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
        // Look up by userId first
        let userResponse = await prisma.meetingResponse.findFirst({
          where: {
            meetingId: meeting.id,
            userId: session.user.id,
          },
          include: { availabilitySlots: true },
        });
        
        // Fallback to name lookup if not found by userId
        if (!userResponse) {
          const userName = `${session.user.firstName} ${session.user.lastName}`;
          userResponse = await prisma.meetingResponse.findUnique({
            where: {
              meetingId_name: {
                meetingId: meeting.id,
                name: userName,
              },
            },
            include: { availabilitySlots: true },
          });
        }

        if (userResponse) {
          return NextResponse.json({
            responses: [
              {
                id: userResponse.id,
                meeting_id: userResponse.meetingId,
                name: userResponse.name,
                user_id: userResponse.userId,
                slots: formatSlots(userResponse.availabilitySlots),
              },
            ],
            userResponseOnly: true,
          });
        }
      }

      return NextResponse.json(
        { error: "Only the creator can view results for this meeting" },
        { status: 403 }
      );
    }

    // Get all responses with slots
    const responses = await prisma.meetingResponse.findMany({
      where: { meetingId: meeting.id },
      include: { availabilitySlots: true },
    });

    const responsesWithSlots = responses.map((response) => ({
      id: response.id,
      meeting_id: response.meetingId,
      name: response.name,
      user_id: response.userId,
      slots: formatSlots(response.availabilitySlots),
    }));

    return NextResponse.json({ responses: responsesWithSlots });
  } catch (error) {
    console.error("Get responses error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
