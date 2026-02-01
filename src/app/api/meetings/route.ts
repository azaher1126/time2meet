import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
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

    const userId = session?.user?.id;
    const shareLink = nanoid(8);

    // Create meeting with optional time window
    let timeWindowId: number | null = null;

    if (startTime !== null && endTime !== null) {
      // Convert time strings (HH:mm) to minutes from midnight
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Find or create time window
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

    const meeting = await prisma.meeting.create({
      data: {
        title,
        description: description || null,
        location: location || null,
        startdate: new Date(startDate),
        endDate: new Date(endDate),
        timeWindowId,
        creatorId: userId,
        shareLink,
        isPrivate: isPrivate ?? false,
        meetingInvites:
          invitedEmails && Array.isArray(invitedEmails)
            ? {
                create: invitedEmails
                  .filter(
                    (email: unknown) => email && typeof email === "string",
                  )
                  .map((email: string) => ({
                    email: email.toLowerCase().trim(),
                  })),
              }
            : undefined,
      },
    });

    return NextResponse.json(
      { meetingId: meeting.id, shareLink },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create meeting error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get meetings created by user
    const createdMeetings = await prisma.meeting.findMany({
      where: { creatorId: userId },
      include: {
        _count: { select: { meetingResponses: true } },
        timeWimdow: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Get meetings user has responded to (not as creator)
    const respondedMeetings = await prisma.meeting.findMany({
      where: {
        meetingResponses: {
          some: {
            // Find by user's name (firstName + lastName)
            name: `${session.user.firstName} ${session.user.lastName}`,
          },
        },
        NOT: { creatorId: userId },
      },
      include: {
        meetingResponses: {
          where: {
            name: `${session.user.firstName} ${session.user.lastName}`,
          },
        },
        timeWimdow: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to match expected format
    const created = createdMeetings.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      location: m.location,
      start_date: m.startdate.toISOString().split("T")[0],
      end_date: m.endDate.toISOString().split("T")[0],
      start_time: m.timeWimdow
        ? `${Math.floor(m.timeWimdow.startTime / 60)
            .toString()
            .padStart(
              2,
              "0",
            )}:${(m.timeWimdow.startTime % 60).toString().padStart(2, "0")}`
        : null,
      end_time: m.timeWimdow
        ? `${Math.floor(m.timeWimdow.endTime / 60)
            .toString()
            .padStart(
              2,
              "0",
            )}:${(m.timeWimdow.endTime % 60).toString().padStart(2, "0")}`
        : null,
      creator_id: m.creatorId,
      share_link: m.shareLink,
      is_private: m.isPrivate ? 1 : 0,
      created_at: m.createdAt.toISOString(),
      response_count: m._count.meetingResponses,
    }));

    const responded = respondedMeetings.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      location: m.location,
      start_date: m.startdate.toISOString().split("T")[0],
      end_date: m.endDate.toISOString().split("T")[0],
      start_time: m.timeWimdow
        ? `${Math.floor(m.timeWimdow.startTime / 60)
            .toString()
            .padStart(
              2,
              "0",
            )}:${(m.timeWimdow.startTime % 60).toString().padStart(2, "0")}`
        : null,
      end_time: m.timeWimdow
        ? `${Math.floor(m.timeWimdow.endTime / 60)
            .toString()
            .padStart(
              2,
              "0",
            )}:${(m.timeWimdow.endTime % 60).toString().padStart(2, "0")}`
        : null,
      creator_id: m.creatorId,
      share_link: m.shareLink,
      is_private: m.isPrivate ? 1 : 0,
      created_at: m.createdAt.toISOString(),
      response_id: m.meetingResponses[0]?.id,
    }));

    return NextResponse.json({
      created,
      responded,
    });
  } catch (error) {
    console.error("Get meetings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
