import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string }> }
) {
  try {
    const { shareLink } = await params;
    const session = await auth();

    const meeting = await prisma.meeting.findUnique({
      where: { shareLink },
      include: {
        meetingInvites: true,
        timeWimdow: true,
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const invites = meeting.meetingInvites;
    const hasInviteList = invites.length > 0;
    const userId = session?.user?.id;

    // If meeting has invite list and user is not creator
    if (hasInviteList && meeting.creatorId !== userId) {
      // User must be logged in and in the invite list
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: "This meeting requires authentication", requiresAuth: true },
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

    // Transform meeting to expected format
    const meetingResponse = {
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      location: meeting.location,
      start_date: meeting.startdate.toISOString().split("T")[0],
      end_date: meeting.endDate.toISOString().split("T")[0],
      start_time: meeting.timeWimdow
        ? `${Math.floor(meeting.timeWimdow.startTime / 60)
            .toString()
            .padStart(2, "0")}:${(meeting.timeWimdow.startTime % 60).toString().padStart(2, "0")}`
        : null,
      end_time: meeting.timeWimdow
        ? `${Math.floor(meeting.timeWimdow.endTime / 60)
            .toString()
            .padStart(2, "0")}:${(meeting.timeWimdow.endTime % 60).toString().padStart(2, "0")}`
        : null,
      creator_id: meeting.creatorId,
      share_link: meeting.shareLink,
      is_private: meeting.isPrivate ? 1 : 0,
      created_at: meeting.createdAt.toISOString(),
    };

    return NextResponse.json({
      meeting: meetingResponse,
      invites: invites.map((inv) => ({ email: inv.email })),
    });
  } catch (error) {
    console.error("Get meeting error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string }> }
) {
  try {
    const { shareLink } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const meeting = await prisma.meeting.findUnique({
      where: { shareLink },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Only the creator can edit the meeting
    if (meeting.creatorId !== userId) {
      return NextResponse.json(
        { error: "Only the creator can edit this meeting" },
        { status: 403 }
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
        { status: 400 }
      );
    }

    // Handle time window
    let timeWindowId: number | null = null;

    if (startTime !== null && endTime !== null) {
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      let timeWindow = await prisma.meetingTimeWindow.findUnique({
        where: {
          startTime_endTime: {
            startTime: startMinutes,
            endTime: endMinutes,
          },
        },
      });

      if (!timeWindow) {
        timeWindow = await prisma.meetingTimeWindow.create({
          data: { startTime: startMinutes, endTime: endMinutes },
        });
      }

      timeWindowId = timeWindow.id;
    }

    // Update meeting and invites in a transaction
    await prisma.$transaction(async (tx) => {
      // Update the meeting
      await tx.meeting.update({
        where: { id: meeting.id },
        data: {
          title,
          description: description || null,
          location: location || null,
          startdate: new Date(startDate),
          endDate: new Date(endDate),
          timeWindowId,
          isPrivate: isPrivate ?? false,
        },
      });

      // Delete existing invites
      await tx.meetingInvite.deleteMany({
        where: { meetingId: meeting.id },
      });

      // Add new invites
      if (invitedEmails && Array.isArray(invitedEmails)) {
        const validEmails = invitedEmails
          .filter((email: unknown) => email && typeof email === "string")
          .map((email: string) => ({
            meetingId: meeting.id,
            email: email.toLowerCase().trim(),
          }));

        if (validEmails.length > 0) {
          await tx.meetingInvite.createMany({
            data: validEmails,
          });
        }
      }
    });

    return NextResponse.json({ message: "Meeting updated successfully" });
  } catch (error) {
    console.error("Update meeting error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string }> }
) {
  try {
    const { shareLink } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const meeting = await prisma.meeting.findUnique({
      where: { shareLink },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Only the creator can delete the meeting
    if (meeting.creatorId !== userId) {
      return NextResponse.json(
        { error: "Only the creator can delete this meeting" },
        { status: 403 }
      );
    }

    // Delete the meeting (cascades to invites and responses due to onDelete: Cascade)
    await prisma.meeting.delete({
      where: { id: meeting.id },
    });

    return NextResponse.json({ message: "Meeting deleted successfully" });
  } catch (error) {
    console.error("Delete meeting error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
