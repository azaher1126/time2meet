import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardContent } from "@/components/DashboardContent";

export default async function DashboardPage() {
  // Server-side auth check
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

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
