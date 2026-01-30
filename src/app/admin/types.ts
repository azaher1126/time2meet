import { Role } from "../../../prisma/generated/prisma/enums";

// Analytics types
export interface DailyData {
  date: string;
  count: number;
}

export interface Analytics {
  totals: {
    users: number;
    meetings: number;
    responses: number;
    activeUsers: number;
    logins: number;
    todayLogins: number;
  };
  daily: {
    users: DailyData[];
    meetings: DailyData[];
    responses: DailyData[];
    logins: DailyData[];
  };
  growthRates: {
    users: number;
    meetings: number;
    responses: number;
    logins: number;
  };
  last7Days: {
    users: number;
    meetings: number;
    responses: number;
    logins: number;
  };
}

// User types for admin panel
export interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  createdAt: string; // ISO string from server
  last_login: string | null;
  meetings_count: number;
  responses_count: number;
  login_count: number;
}

// Meeting types for admin panel
export interface AdminMeeting {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  creator_id: number | null;
  creator_name: string;
  creator_email: string | null;
  share_link: string;
  is_private: boolean;
  created_at: string;
  response_count: number;
}

export type TabType = "analytics" | "users" | "meetings";

// Generic table column definition
export interface TableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  render: (item: T) => React.ReactNode;
}
