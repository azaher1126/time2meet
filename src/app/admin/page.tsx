import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { AdminContent } from "../../components/admin/AdminContent";
import { Role } from "../../../prisma/generated/prisma/enums";
import { format, subDays } from "date-fns";
import type {
  Analytics,
  AdminUser,
  AdminMeeting,
  DailyData,
} from "../../types/admin";
import { requireAuth } from "@/lib/auth/accessControl";

// Helper to calculate growth rate
function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

// Fetch all admin data directly from Prisma
async function getAdminData() {
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  const last30Days: string[] = [];

  for (let i = 29; i >= 0; i--) {
    last30Days.push(format(subDays(today, i), "yyyy-MM-dd"));
  }

  // Fetch users with stats
  const usersRaw = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          meetings: true,
          loginRecords: true,
        },
      },
      loginRecords: {
        orderBy: { loggedInAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Format users and get response counts
  const users: AdminUser[] = await Promise.all(
    usersRaw.map(async (user) => {
      const responsesCount = await prisma.meetingResponse.count({
        where: {
          name: `${user.firstName} ${user.lastName}`,
        },
      });

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        last_login: user.loginRecords[0]?.loggedInAt.toISOString() || null,
        meetings_count: user._count.meetings,
        responses_count: responsesCount,
        login_count: user._count.loginRecords,
      };
    }),
  );

  // Fetch meetings with stats
  const meetingsRaw = await prisma.meeting.findMany({
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      _count: {
        select: { meetingResponses: true },
      },
      timeWimdow: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const meetings: AdminMeeting[] = meetingsRaw.map((meeting) => ({
    id: meeting.id,
    title: meeting.title,
    description: meeting.description,
    location: meeting.location,
    start_date: meeting.startdate.toISOString().split("T")[0],
    end_date: meeting.endDate.toISOString().split("T")[0],
    start_time: meeting.timeWimdow
      ? `${Math.floor(meeting.timeWimdow.startTime / 60)
          .toString()
          .padStart(
            2,
            "0",
          )}:${(meeting.timeWimdow.startTime % 60).toString().padStart(2, "0")}`
      : null,
    end_time: meeting.timeWimdow
      ? `${Math.floor(meeting.timeWimdow.endTime / 60)
          .toString()
          .padStart(
            2,
            "0",
          )}:${(meeting.timeWimdow.endTime % 60).toString().padStart(2, "0")}`
      : null,
    creator_id: meeting.creatorId,
    creator_name: meeting.creator
      ? `${meeting.creator.firstName} ${meeting.creator.lastName}`
      : "Anonymous",
    creator_email: meeting.creator ? meeting.creator.email : null,
    share_link: meeting.shareLink,
    is_private: meeting.isPrivate,
    created_at: meeting.createdAt.toISOString(),
    response_count: meeting._count.meetingResponses,
  }));

  // Calculate analytics
  const [totalUsers, totalMeetings, totalResponses, activeUsers, totalLogins] =
    await Promise.all([
      prisma.user.count(),
      prisma.meeting.count(),
      prisma.meetingResponse.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.loginRecord.count(),
    ]);

  // Get daily data for last 30 days
  const dailyUsersRaw = await prisma.user.groupBy({
    by: ["createdAt"],
    _count: { id: true },
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  const dailyMeetingsRaw = await prisma.meeting.groupBy({
    by: ["createdAt"],
    _count: { id: true },
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  const dailyLoginsRaw = await prisma.loginRecord.groupBy({
    by: ["loggedInAt"],
    _count: { userId: true },
    where: { loggedInAt: { gte: thirtyDaysAgo } },
  });

  // Convert to date-keyed maps
  const usersMap = new Map<string, number>();
  dailyUsersRaw.forEach((item) => {
    const date = format(item.createdAt, "yyyy-MM-dd");
    usersMap.set(date, (usersMap.get(date) || 0) + item._count.id);
  });

  const meetingsMap = new Map<string, number>();
  dailyMeetingsRaw.forEach((item) => {
    const date = format(item.createdAt, "yyyy-MM-dd");
    meetingsMap.set(date, (meetingsMap.get(date) || 0) + item._count.id);
  });

  const loginsMap = new Map<string, number>();
  dailyLoginsRaw.forEach((item) => {
    const date = format(item.loggedInAt, "yyyy-MM-dd");
    loginsMap.set(date, (loginsMap.get(date) || 0) + item._count.userId);
  });

  // Build full 30-day arrays
  const usersData: DailyData[] = last30Days.map((date) => ({
    date,
    count: usersMap.get(date) || 0,
  }));

  const meetingsData: DailyData[] = last30Days.map((date) => ({
    date,
    count: meetingsMap.get(date) || 0,
  }));

  const responsesData: DailyData[] = last30Days.map((date) => ({
    date,
    count: 0, // MeetingResponse doesn't have createdAt
  }));

  const loginsData: DailyData[] = last30Days.map((date) => ({
    date,
    count: loginsMap.get(date) || 0,
  }));

  // Calculate growth rates
  const last7DaysUsers = usersData
    .slice(-7)
    .reduce((sum, d) => sum + d.count, 0);
  const prev7DaysUsers = usersData
    .slice(-14, -7)
    .reduce((sum, d) => sum + d.count, 0);

  const last7DaysMeetings = meetingsData
    .slice(-7)
    .reduce((sum, d) => sum + d.count, 0);
  const prev7DaysMeetings = meetingsData
    .slice(-14, -7)
    .reduce((sum, d) => sum + d.count, 0);

  const last7DaysResponses = responsesData
    .slice(-7)
    .reduce((sum, d) => sum + d.count, 0);
  const prev7DaysResponses = responsesData
    .slice(-14, -7)
    .reduce((sum, d) => sum + d.count, 0);

  const last7DaysLogins = loginsData
    .slice(-7)
    .reduce((sum, d) => sum + d.count, 0);
  const prev7DaysLogins = loginsData
    .slice(-14, -7)
    .reduce((sum, d) => sum + d.count, 0);

  const todayLogins = loginsData[loginsData.length - 1]?.count || 0;

  const analytics: Analytics = {
    totals: {
      users: totalUsers,
      meetings: totalMeetings,
      responses: totalResponses,
      activeUsers: activeUsers,
      logins: totalLogins,
      todayLogins: todayLogins,
    },
    daily: {
      users: usersData,
      meetings: meetingsData,
      responses: responsesData,
      logins: loginsData,
    },
    growthRates: {
      users: calculateGrowthRate(last7DaysUsers, prev7DaysUsers),
      meetings: calculateGrowthRate(last7DaysMeetings, prev7DaysMeetings),
      responses: calculateGrowthRate(last7DaysResponses, prev7DaysResponses),
      logins: calculateGrowthRate(last7DaysLogins, prev7DaysLogins),
    },
    last7Days: {
      users: last7DaysUsers,
      meetings: last7DaysMeetings,
      responses: last7DaysResponses,
      logins: last7DaysLogins,
    },
  };

  return { users, meetings, analytics };
}

export default async function AdminPage() {
  const session = await requireAuth(undefined, [Role.ADMIN]);
  const userId = session.user.id;

  // Fetch all admin data
  const { users, meetings, analytics } = await getAdminData();

  return (
    <AdminContent
      analytics={analytics}
      users={users}
      meetings={meetings}
      currentUserId={userId}
    />
  );
}
