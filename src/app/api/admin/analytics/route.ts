import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { isCurrentUserAdmin } from '@/lib/admin';
import { format, subDays } from 'date-fns';

interface DailyCount {
  date: string;
  count: number;
}

// Calculate growth rate between two values
function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

// GET - Get analytics data
export async function GET() {
  try {
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const today = new Date();
    const last30Days: string[] = [];
    
    for (let i = 29; i >= 0; i--) {
      last30Days.push(format(subDays(today, i), 'yyyy-MM-dd'));
    }

    // Get totals
    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
    const totalMeetings = (db.prepare('SELECT COUNT(*) as count FROM meetings').get() as { count: number }).count;
    const totalResponses = (db.prepare('SELECT COUNT(*) as count FROM responses').get() as { count: number }).count;
    const activeUsers = (db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get() as { count: number }).count;
    const totalLogins = (db.prepare('SELECT COUNT(*) as count FROM login_history').get() as { count: number }).count;

    // Get daily new users for last 30 days
    const dailyUsers = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users
      WHERE DATE(created_at) >= DATE('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all() as DailyCount[];

    // Get daily new meetings for last 30 days
    const dailyMeetings = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM meetings
      WHERE DATE(created_at) >= DATE('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all() as DailyCount[];

    // Get daily new responses for last 30 days
    const dailyResponses = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM responses
      WHERE DATE(created_at) >= DATE('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all() as DailyCount[];

    // Get daily logins for last 30 days
    const dailyLogins = db.prepare(`
      SELECT DATE(logged_in_at) as date, COUNT(*) as count
      FROM login_history
      WHERE DATE(logged_in_at) >= DATE('now', '-30 days')
      GROUP BY DATE(logged_in_at)
      ORDER BY date
    `).all() as DailyCount[];

    // Convert to lookup maps
    const usersMap = new Map(dailyUsers.map(d => [d.date, d.count]));
    const meetingsMap = new Map(dailyMeetings.map(d => [d.date, d.count]));
    const responsesMap = new Map(dailyResponses.map(d => [d.date, d.count]));
    const loginsMap = new Map(dailyLogins.map(d => [d.date, d.count]));

    // Build full 30-day arrays
    const usersData = last30Days.map(date => ({
      date,
      count: usersMap.get(date) || 0
    }));

    const meetingsData = last30Days.map(date => ({
      date,
      count: meetingsMap.get(date) || 0
    }));

    const responsesData = last30Days.map(date => ({
      date,
      count: responsesMap.get(date) || 0
    }));

    const loginsData = last30Days.map(date => ({
      date,
      count: loginsMap.get(date) || 0
    }));

    // Calculate growth rates (compare last 7 days to previous 7 days)
    const last7DaysUsers = usersData.slice(-7).reduce((sum, d) => sum + d.count, 0);
    const prev7DaysUsers = usersData.slice(-14, -7).reduce((sum, d) => sum + d.count, 0);
    const usersGrowthRate = calculateGrowthRate(last7DaysUsers, prev7DaysUsers);

    const last7DaysMeetings = meetingsData.slice(-7).reduce((sum, d) => sum + d.count, 0);
    const prev7DaysMeetings = meetingsData.slice(-14, -7).reduce((sum, d) => sum + d.count, 0);
    const meetingsGrowthRate = calculateGrowthRate(last7DaysMeetings, prev7DaysMeetings);

    const last7DaysResponses = responsesData.slice(-7).reduce((sum, d) => sum + d.count, 0);
    const prev7DaysResponses = responsesData.slice(-14, -7).reduce((sum, d) => sum + d.count, 0);
    const responsesGrowthRate = calculateGrowthRate(last7DaysResponses, prev7DaysResponses);

    const last7DaysLogins = loginsData.slice(-7).reduce((sum, d) => sum + d.count, 0);
    const prev7DaysLogins = loginsData.slice(-14, -7).reduce((sum, d) => sum + d.count, 0);
    const loginsGrowthRate = calculateGrowthRate(last7DaysLogins, prev7DaysLogins);

    // Today's logins
    const todayLogins = loginsData[loginsData.length - 1]?.count || 0;

    return NextResponse.json({
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
        users: usersGrowthRate,
        meetings: meetingsGrowthRate,
        responses: responsesGrowthRate,
        logins: loginsGrowthRate,
      },
      last7Days: {
        users: last7DaysUsers,
        meetings: last7DaysMeetings,
        responses: last7DaysResponses,
        logins: last7DaysLogins,
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}