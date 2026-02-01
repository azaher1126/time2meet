import { AnalyticsTab } from "./AnalyticsTab";
import { UsersTab } from "./UsersTab";
import { MeetingsTab } from "./MeetingsTab";
import type { Analytics, AdminUser, AdminMeeting } from "../../types/admin";
import { TabView } from "../TabView";

interface AdminContentProps {
  analytics: Analytics;
  users: AdminUser[];
  meetings: AdminMeeting[];
  currentUserId: number;
}

export function AdminTabView({
  analytics,
  users,
  meetings,
  currentUserId,
}: AdminContentProps) {
  return (
    <TabView
      tabs={[
        {
          buttonContent: (
            <span className="flex items-center gap-2">
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Analytics
            </span>
          ),
          tabContent: <AnalyticsTab analytics={analytics} />,
        },
        {
          buttonContent: (
            <span className="flex items-center gap-2">
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
              Users ({users.length})
            </span>
          ),
          tabContent: <UsersTab users={users} currentUserId={currentUserId} />,
        },
        {
          buttonContent: (
            <span className="flex items-center gap-2">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Meetings ({meetings.length})
            </span>
          ),
          tabContent: <MeetingsTab meetings={meetings} />,
        },
      ]}
    />
  );
}
