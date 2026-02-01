import { prisma } from "@/lib/prisma";
import { DashboardTabView } from "@/components/dashboard/DashboardTabView";
import { requireAuth } from "@/lib/auth/accessControl";
import Link from "next/link";

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
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, {session.user.firstName}!
            </h1>
            <p className="mt-1 text-gray-600">
              Manage your meetings and availability
            </p>
          </div>
          <Link
            href="/create"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Meeting
          </Link>
        </div>
        <DashboardTabView
          createdMeetings={createdMeetings}
          respondedMeetings={respondedMeetings}
        />
      </div>
    </div>
  );
}
