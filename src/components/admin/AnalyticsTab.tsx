"use client";

import { StatCard } from "./StatCard";
import { ChartCard } from "./ChartCard";
import type { Analytics } from "@/types/admin";

interface AnalyticsTabProps {
  analytics: Analytics;
}

export function AnalyticsTab({ analytics }: AnalyticsTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={analytics.totals.users}
          subValue={`${analytics.totals.activeUsers} active`}
          growth={analytics.growthRates.users}
          last7Days={analytics.last7Days.users}
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
          color="indigo"
        />
        <StatCard
          title="Total Meetings"
          value={analytics.totals.meetings}
          growth={analytics.growthRates.meetings}
          last7Days={analytics.last7Days.meetings}
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
          color="purple"
        />
        <StatCard
          title="Total Responses"
          value={analytics.totals.responses}
          growth={analytics.growthRates.responses}
          last7Days={analytics.last7Days.responses}
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          }
          color="green"
        />
        <StatCard
          title="Total Logins"
          value={analytics.totals.logins}
          subValue={`${analytics.totals.todayLogins} today`}
          growth={analytics.growthRates.logins}
          last7Days={analytics.last7Days.logins}
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
          }
          color="cyan"
        />
      </div>

      {/* Summary Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Avg Responses/Meeting"
          value={
            analytics.totals.meetings > 0
              ? Math.round(
                  (analytics.totals.responses / analytics.totals.meetings) * 10,
                ) / 10
              : 0
          }
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          }
          color="amber"
        />
        <StatCard
          title="Logins Today"
          value={analytics.totals.todayLogins}
          subValue={`${analytics.last7Days.logins} this week`}
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          color="cyan"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="New Users (Last 30 Days)"
          data={analytics.daily.users}
          color="indigo"
        />
        <ChartCard
          title="New Meetings (Last 30 Days)"
          data={analytics.daily.meetings}
          color="purple"
        />
        <ChartCard
          title="New Responses (Last 30 Days)"
          data={analytics.daily.responses}
          color="green"
        />
        <ChartCard
          title="Logins (Last 30 Days)"
          data={analytics.daily.logins}
          color="cyan"
        />
      </div>
    </div>
  );
}
