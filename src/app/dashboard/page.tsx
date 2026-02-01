import { prisma } from "@/lib/prisma";
import { DashboardContent } from "@/components/DashboardContent";
import { requireAuth } from "@/lib/auth/accessControl";

export default async function DashboardPage() {
  const session = await requireAuth("/dashboard");

  const userId = session.user.id;

  // Fetch meetings server-side with Prisma
  const [createdMeetings, respondedMeetings] = await Promise.all([
    // Meetings created by the user
    prisma.meeting.findMany({
      where: {
        creatorId: userId,
      },
      include: {
        _count: {
          select: {
            meetingResponses: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    // Meetings the user has responded to (but didn't create)
    prisma.meeting.findMany({
      where: {
        meetingResponses: {
          some: {
            userId: userId,
          },
        },
        creatorId: {
          not: userId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  return (
    <DashboardContent
      firstName={session.user.firstName}
      createdMeetings={createdMeetings}
      respondedMeetings={respondedMeetings}
    />
  );
}
