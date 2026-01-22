"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";

interface User {
  id: string;
  email: string;
  name: string;
  is_admin: number;
  is_active: number;
  created_at: string;
  last_login: string | null;
  meetings_count: number;
  responses_count: number;
  login_count: number;
}

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string;
  share_link: string;
  is_private: number;
  created_at: string;
  creator_name: string | null;
  creator_email: string | null;
  response_count: number;
}

interface DailyData {
  date: string;
  count: number;
}

interface Analytics {
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

type TabType = "analytics" | "users" | "meetings";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("analytics");
  const [users, setUsers] = useState<User[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      if (!session?.user?.isAdmin) {
        router.push("/dashboard");
      } else {
        fetchData();
      }
    }
  }, [status, session, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, meetingsRes, analyticsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/meetings"),
        fetch("/api/admin/analytics"),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users);
      }

      if (meetingsRes.ok) {
        const data = await meetingsRes.json();
        setMeetings(data.meetings);
      }

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });

      if (res.ok) {
        // Refresh users list
        const usersRes = await fetch("/api/admin/users");
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data.users);
        }
      }
    } catch (error) {
      console.error("Failed to update user:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm("Are you sure you want to delete this meeting? This action cannot be undone.")) {
      return;
    }

    setActionLoading(meetingId);
    try {
      const res = await fetch(`/api/admin/meetings?id=${meetingId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMeetings(meetings.filter((m) => m.id !== meetingId));
        // Refresh analytics
        const analyticsRes = await fetch("/api/admin/analytics");
        if (analyticsRes.ok) {
          const data = await analyticsRes.json();
          setAnalytics(data);
        }
      }
    } catch (error) {
      console.error("Failed to delete meeting:", error);
    } finally {
      setActionLoading(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-gray-600">Manage users, meetings, and view analytics</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === "analytics"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-50 shadow"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === "users"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-50 shadow"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Users ({users.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab("meetings")}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === "meetings"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-50 shadow"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Meetings ({meetings.length})
            </span>
          </button>
        </div>

        {/* Content */}
        {activeTab === "analytics" && analytics && <AnalyticsTab analytics={analytics} />}
        {activeTab === "users" && (
          <UsersTab
            users={users}
            currentUserId={session.user.id}
            onAction={handleUserAction}
            actionLoading={actionLoading}
          />
        )}
        {activeTab === "meetings" && (
          <MeetingsTab
            meetings={meetings}
            onDelete={handleDeleteMeeting}
            actionLoading={actionLoading}
          />
        )}
      </div>
    </div>
  );
}

function AnalyticsTab({ analytics }: { analytics: Analytics }) {
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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
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
              ? Math.round((analytics.totals.responses / analytics.totals.meetings) * 10) / 10
              : 0
          }
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          color="amber"
        />
        <StatCard
          title="Logins Today"
          value={analytics.totals.todayLogins}
          subValue={`${analytics.last7Days.logins} this week`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="cyan"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="New Users (Last 30 Days)" data={analytics.daily.users} color="indigo" />
        <ChartCard title="New Meetings (Last 30 Days)" data={analytics.daily.meetings} color="purple" />
        <ChartCard title="New Responses (Last 30 Days)" data={analytics.daily.responses} color="green" />
        <ChartCard title="Logins (Last 30 Days)" data={analytics.daily.logins} color="cyan" />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subValue,
  growth,
  last7Days,
  icon,
  color,
}: {
  title: string;
  value: number;
  subValue?: string;
  growth?: number;
  last7Days?: number;
  icon: React.ReactNode;
  color: "indigo" | "purple" | "green" | "amber" | "cyan";
}) {
  const colorClasses = {
    indigo: "bg-indigo-100 text-indigo-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-green-100 text-green-600",
    amber: "bg-amber-100 text-amber-600",
    cyan: "bg-cyan-100 text-cyan-600",
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>{icon}</div>
        {growth !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              growth >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {growth >= 0 ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {Math.abs(growth)}%
          </div>
        )}
      </div>
      <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
      {last7Days !== undefined && (
        <p className="text-xs text-gray-500 mt-1">+{last7Days} this week</p>
      )}
    </div>
  );
}

function ChartCard({
  title,
  data,
  color,
}: {
  title: string;
  data: DailyData[];
  color: "indigo" | "purple" | "green" | "cyan";
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);
  
  const colorClasses = {
    indigo: "bg-indigo-500",
    purple: "bg-purple-500",
    green: "bg-green-500",
    cyan: "bg-cyan-500",
  };
  
  const lightColorClasses = {
    indigo: "bg-indigo-100",
    purple: "bg-purple-100",
    green: "bg-green-100",
    cyan: "bg-cyan-100",
  };

  // Generate Y-axis labels (5 steps)
  const yAxisLabels = [0, 1, 2, 3, 4].map((i) => Math.round((maxCount / 4) * (4 - i)));

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500">Total: {totalCount}</span>
      </div>
      
      <div className="flex">
        {/* Y-Axis */}
        <div className="flex flex-col justify-between pr-2 text-xs text-gray-400 h-40">
          {yAxisLabels.map((label, i) => (
            <span key={i} className="text-right w-6">{label}</span>
          ))}
        </div>
        
        {/* Chart Area */}
        <div className="flex-1 flex flex-col">
          {/* Bars Container */}
          <div className="relative h-40 flex items-end border-l border-b border-gray-200">
            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-t border-gray-100 w-full" />
              ))}
            </div>
            
            {/* Bars */}
            <div className="relative z-10 flex items-end w-full h-full gap-px px-px">
              {data.map((d) => {
                const heightPercent = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                return (
                  <div
                    key={d.date}
                    className="flex-1 group relative flex flex-col justify-end"
                    style={{ height: '100%' }}
                  >
                    {/* Bar */}
                    <div
                      className={`w-full ${colorClasses[color]} rounded-t-sm transition-all hover:opacity-80`}
                      style={{ 
                        height: `${heightPercent}%`,
                        minHeight: d.count > 0 ? '2px' : '0'
                      }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-20 shadow-lg">
                      <div className="font-medium">{format(parseISO(d.date), "MMM d, yyyy")}</div>
                      <div>{d.count} {d.count === 1 ? 'item' : 'items'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* X-Axis Labels */}
          <div className="flex justify-between mt-2 text-xs text-gray-400 pl-1">
            <span>{format(parseISO(data[0]?.date || new Date().toISOString()), "MMM d")}</span>
            <span>{format(parseISO(data[Math.floor(data.length / 2)]?.date || new Date().toISOString()), "MMM d")}</span>
            <span>{format(parseISO(data[data.length - 1]?.date || new Date().toISOString()), "MMM d")}</span>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded ${colorClasses[color]}`}></div>
          <span>Daily count</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded ${lightColorClasses[color]} border border-gray-200`}></div>
          <span>Hover for details</span>
        </div>
      </div>
    </div>
  );
}

type UserSortField = "name" | "status" | "role" | "meetings_count" | "responses_count" | "login_count" | "created_at" | "last_login";

function UsersTab({
  users,
  currentUserId,
  onAction,
  actionLoading,
}: {
  users: User[];
  currentUserId: string;
  onAction: (userId: string, action: string) => void;
  actionLoading: string | null;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "user">("all");
  const [showDateFilters, setShowDateFilters] = useState(false);
  const [joinedStartDate, setJoinedStartDate] = useState("");
  const [joinedEndDate, setJoinedEndDate] = useState("");
  const [lastLoginStartDate, setLastLoginStartDate] = useState("");
  const [lastLoginEndDate, setLastLoginEndDate] = useState("");
  const [lastLoginFilter, setLastLoginFilter] = useState<"all" | "never" | "hasLoggedIn">("all");
  const [sortField, setSortField] = useState<UserSortField>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Handle sort column click
  const handleSort = (field: UserSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort icon component - always visible like meetings table
  const SortIcon = ({ field }: { field: UserSortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === "asc" ? (
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const hasDateFilters =
    joinedStartDate !== "" ||
    joinedEndDate !== "" ||
    lastLoginStartDate !== "" ||
    lastLoginEndDate !== "" ||
    lastLoginFilter !== "all";

  const clearDateFilters = () => {
    setJoinedStartDate("");
    setJoinedEndDate("");
    setLastLoginStartDate("");
    setLastLoginEndDate("");
    setLastLoginFilter("all");
  };

  const filteredUsers = users.filter((user) => {
    // Search filter
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && user.is_active === 1) ||
      (filterStatus === "inactive" && user.is_active === 0);
    
    // Role filter
    const matchesRole =
      filterRole === "all" ||
      (filterRole === "admin" && user.is_admin === 1) ||
      (filterRole === "user" && user.is_admin === 0);

    // Helper function to extract date part from datetime string
    // Handles both "YYYY-MM-DD HH:MM:SS" (SQLite) and "YYYY-MM-DDTHH:MM:SS" (ISO) formats
    const extractDate = (datetime: string): string => {
      return datetime.substring(0, 10); // First 10 characters are always YYYY-MM-DD
    };

    // Joined date range filter
    let matchesJoinedDate = true;
    const joinedDate = extractDate(user.created_at);
    if (joinedStartDate) {
      matchesJoinedDate = matchesJoinedDate && joinedDate >= joinedStartDate;
    }
    if (joinedEndDate) {
      matchesJoinedDate = matchesJoinedDate && joinedDate <= joinedEndDate;
    }

    // Last login filter
    let matchesLastLogin = true;
    if (lastLoginFilter === "never") {
      matchesLastLogin = !user.last_login;
    } else if (lastLoginFilter === "hasLoggedIn") {
      matchesLastLogin = !!user.last_login;
    }

    // Last login date range filter (only applies to users who have logged in)
    if (matchesLastLogin && user.last_login && (lastLoginStartDate || lastLoginEndDate)) {
      const lastLoginDate = extractDate(user.last_login);
      if (lastLoginStartDate) {
        matchesLastLogin = matchesLastLogin && lastLoginDate >= lastLoginStartDate;
      }
      if (lastLoginEndDate) {
        matchesLastLogin = matchesLastLogin && lastLoginDate <= lastLoginEndDate;
      }
    }

    return matchesSearch && matchesStatus && matchesRole && matchesJoinedDate && matchesLastLogin;
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "status":
        comparison = a.is_active - b.is_active;
        break;
      case "role":
        comparison = a.is_admin - b.is_admin;
        break;
      case "meetings_count":
        comparison = a.meetings_count - b.meetings_count;
        break;
      case "responses_count":
        comparison = a.responses_count - b.responses_count;
        break;
      case "login_count":
        comparison = a.login_count - b.login_count;
        break;
      case "created_at":
        comparison = a.created_at.localeCompare(b.created_at);
        break;
      case "last_login":
        // Handle null values - users who never logged in go to the end
        if (!a.last_login && !b.last_login) comparison = 0;
        else if (!a.last_login) comparison = -1;
        else if (!b.last_login) comparison = 1;
        else comparison = a.last_login.localeCompare(b.last_login);
        break;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4 space-y-4">
        {/* Primary Filters Row */}
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as "all" | "admin" | "user")}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="user">Users</option>
          </select>
          <button
            onClick={() => setShowDateFilters(!showDateFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showDateFilters || hasDateFilters
                ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Date Filters
            {hasDateFilters && (
              <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">!</span>
            )}
          </button>
        </div>

        {/* Date Filters */}
        {showDateFilters && (
          <div className="pt-4 border-t border-gray-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Joined Date Range */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Date Joined
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={joinedStartDate}
                      onChange={(e) => setJoinedStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={joinedEndDate}
                      onChange={(e) => setJoinedEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Last Login Date Range */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Last Login
                </h4>
                <div className="space-y-2">
                  <select
                    value={lastLoginFilter}
                    onChange={(e) => setLastLoginFilter(e.target.value as "all" | "never" | "hasLoggedIn")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="all">All Users</option>
                    <option value="hasLoggedIn">Has Logged In</option>
                    <option value="never">Never Logged In</option>
                  </select>
                  {lastLoginFilter !== "never" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">From</label>
                        <input
                          type="date"
                          value={lastLoginStartDate}
                          onChange={(e) => setLastLoginStartDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">To</label>
                        <input
                          type="date"
                          value={lastLoginEndDate}
                          onChange={(e) => setLastLoginEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Clear Date Filters */}
            {hasDateFilters && (
              <div className="flex justify-end">
                <button
                  onClick={clearDateFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Date Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {sortedUsers.length} of {users.length} users
          {(searchTerm || filterStatus !== "all" || filterRole !== "all" || hasDateFilters) && " (filtered)"}
        </span>
        <span>
          Sorted by {sortField.replace("_", " ")} ({sortDirection === "asc" ? "ascending" : "descending"})
        </span>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    User
                    <SortIcon field="name" />
                  </div>
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1">
                    Status
                    <SortIcon field="status" />
                  </div>
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("role")}
                >
                  <div className="flex items-center gap-1">
                    Role
                    <SortIcon field="role" />
                  </div>
                </th>
                <th
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("meetings_count")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Meetings
                    <SortIcon field="meetings_count" />
                  </div>
                </th>
                <th
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("responses_count")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Responses
                    <SortIcon field="responses_count" />
                  </div>
                </th>
                <th
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("login_count")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Logins
                    <SortIcon field="login_count" />
                  </div>
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="flex items-center gap-1">
                    Joined
                    <SortIcon field="created_at" />
                  </div>
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("last_login")}
                >
                  <div className="flex items-center gap-1">
                    Last Login
                    <SortIcon field="last_login" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedUsers.map((user) => (
                <tr key={user.id} className={user.is_active === 0 ? "bg-gray-50" : "hover:bg-gray-50 transition-colors"}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active === 1
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.is_active === 1 ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_admin === 1
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {user.is_admin === 1 ? "Admin" : "User"}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.meetings_count > 0
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {user.meetings_count}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.responses_count > 0
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {user.responses_count}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.login_count > 0
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {user.login_count}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(parseISO(user.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                    {user.last_login ? (
                      <span className="text-gray-500">
                        {format(parseISO(user.last_login), "MMM d, yyyy")}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Never</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    {user.id === currentUserId ? (
                      <span className="text-sm text-gray-400">Current User</span>
                    ) : (
                      <div className="flex justify-end gap-2">
                        {user.is_active === 1 ? (
                          <button
                            onClick={() => onAction(user.id, "deactivate")}
                            disabled={actionLoading === user.id}
                            className="text-sm px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => onAction(user.id, "activate")}
                            disabled={actionLoading === user.id}
                            className="text-sm px-3 py-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
                        {user.is_admin === 1 ? (
                          <button
                            onClick={() => onAction(user.id, "demote")}
                            disabled={actionLoading === user.id}
                            className="text-sm px-3 py-1 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Demote
                          </button>
                        ) : (
                          <button
                            onClick={() => onAction(user.id, "elevate")}
                            disabled={actionLoading === user.id}
                            className="text-sm px-3 py-1 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Make Admin
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedUsers.length === 0 && (
          <div className="p-8 text-center text-gray-500">No users found matching your filters.</div>
        )}
      </div>
    </div>
  );
}

type SortField = "title" | "creator" | "start_date" | "response_count" | "created_at";
type SortDirection = "asc" | "desc";

function MeetingsTab({
  meetings,
  onDelete,
  actionLoading,
}: {
  meetings: Meeting[];
  onDelete: (meetingId: string) => void;
  actionLoading: string | null;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [minResponses, setMinResponses] = useState("");
  const [maxResponses, setMaxResponses] = useState("");
  const [ownerSearch, setOwnerSearch] = useState("");
  const [showAnonymousOnly, setShowAnonymousOnly] = useState(false);
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [showFilters, setShowFilters] = useState(false);

  // Handle sort column click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === "asc" ? (
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Filter meetings
  const filteredMeetings = meetings.filter((meeting) => {
    // Search filter (title, link, owner name, owner email)
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      meeting.title.toLowerCase().includes(searchLower) ||
      meeting.share_link.toLowerCase().includes(searchLower) ||
      meeting.creator_name?.toLowerCase().includes(searchLower) ||
      meeting.creator_email?.toLowerCase().includes(searchLower);

    // Date range filter (based on meeting start_date)
    let matchesDateRange = true;
    if (dateRangeStart) {
      matchesDateRange = matchesDateRange && meeting.start_date >= dateRangeStart;
    }
    if (dateRangeEnd) {
      matchesDateRange = matchesDateRange && meeting.start_date <= dateRangeEnd;
    }

    // Response count filter
    let matchesResponses = true;
    if (minResponses !== "") {
      matchesResponses = matchesResponses && meeting.response_count >= parseInt(minResponses);
    }
    if (maxResponses !== "") {
      matchesResponses = matchesResponses && meeting.response_count <= parseInt(maxResponses);
    }

    // Owner filter - text search for name or email
    let matchesOwner = true;
    if (showAnonymousOnly) {
      // If anonymous only is checked, only show meetings without a creator
      matchesOwner = !meeting.creator_email;
    } else if (ownerSearch !== "") {
      // If there's a search term, filter by owner name or email containing the text
      const ownerSearchLower = ownerSearch.toLowerCase();
      matchesOwner =
        meeting.creator_name?.toLowerCase().includes(ownerSearchLower) ||
        meeting.creator_email?.toLowerCase().includes(ownerSearchLower) ||
        false;
    }

    // Visibility filter
    let matchesVisibility = true;
    if (visibilityFilter === "public") {
      matchesVisibility = meeting.is_private === 0;
    } else if (visibilityFilter === "private") {
      matchesVisibility = meeting.is_private === 1;
    }

    return matchesSearch && matchesDateRange && matchesResponses && matchesOwner && matchesVisibility;
  });

  // Sort meetings
  const sortedMeetings = [...filteredMeetings].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "creator":
        const aCreator = a.creator_name || a.creator_email || "";
        const bCreator = b.creator_name || b.creator_email || "";
        comparison = aCreator.localeCompare(bCreator);
        break;
      case "start_date":
        comparison = a.start_date.localeCompare(b.start_date);
        break;
      case "response_count":
        comparison = a.response_count - b.response_count;
        break;
      case "created_at":
        comparison = a.created_at.localeCompare(b.created_at);
        break;
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setDateRangeStart("");
    setDateRangeEnd("");
    setMinResponses("");
    setMaxResponses("");
    setOwnerSearch("");
    setShowAnonymousOnly(false);
    setVisibilityFilter("all");
  };

  const hasActiveFilters =
    searchTerm !== "" ||
    dateRangeStart !== "" ||
    dateRangeEnd !== "" ||
    minResponses !== "" ||
    maxResponses !== "" ||
    ownerSearch !== "" ||
    showAnonymousOnly ||
    visibilityFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="bg-white rounded-2xl shadow-lg p-4 space-y-4">
        {/* Search Bar */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by title, link, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">!</span>
            )}
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="pt-4 border-t border-gray-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range (Start)
                </label>
                <input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range (End)
                </label>
                <input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Response Count Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Responses
                </label>
                <input
                  type="number"
                  min="0"
                  value={minResponses}
                  onChange={(e) => setMinResponses(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Responses
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxResponses}
                  onChange={(e) => setMaxResponses(e.target.value)}
                  placeholder="∞"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Owner Filter - Text Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner (Name or Email)
                </label>
                <input
                  type="text"
                  value={ownerSearch}
                  onChange={(e) => {
                    setOwnerSearch(e.target.value);
                    // Disable anonymous filter when typing in owner search
                    if (e.target.value !== "") {
                      setShowAnonymousOnly(false);
                    }
                  }}
                  placeholder="Search by name or email..."
                  disabled={showAnonymousOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              {/* Visibility Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visibility
                </label>
                <select
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value as "all" | "public" | "private")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Meetings</option>
                  <option value="public">Public Only</option>
                  <option value="private">Private Only</option>
                </select>
              </div>

              {/* Anonymous Only Checkbox */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors w-full">
                  <input
                    type="checkbox"
                    checked={showAnonymousOnly}
                    onChange={(e) => {
                      setShowAnonymousOnly(e.target.checked);
                      // Clear owner search when enabling anonymous filter
                      if (e.target.checked) {
                        setOwnerSearch("");
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Anonymous meetings only</span>
                </label>
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {sortedMeetings.length} of {meetings.length} meetings
          {hasActiveFilters && " (filtered)"}
        </span>
        <span>
          Sorted by {sortField.replace("_", " ")} ({sortDirection === "asc" ? "ascending" : "descending"})
        </span>
      </div>

      {/* Meetings Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("title")}
                >
                  <div className="flex items-center gap-1">
                    Meeting
                    <SortIcon field="title" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("creator")}
                >
                  <div className="flex items-center gap-1">
                    Creator
                    <SortIcon field="creator" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("start_date")}
                >
                  <div className="flex items-center gap-1">
                    Date Range
                    <SortIcon field="start_date" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("response_count")}
                >
                  <div className="flex items-center gap-1">
                    Responses
                    <SortIcon field="response_count" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="flex items-center gap-1">
                    Created
                    <SortIcon field="created_at" />
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedMeetings.map((meeting) => (
                <tr key={meeting.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {meeting.title}
                        {meeting.is_private === 1 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                            Private
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 font-mono">
                        /m/{meeting.share_link}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {meeting.creator_name ? (
                      <div>
                        <div className="text-sm text-gray-900">{meeting.creator_name}</div>
                        <div className="text-sm text-gray-500">{meeting.creator_email}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Anonymous</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(parseISO(meeting.start_date), "MMM d")} -{" "}
                    {format(parseISO(meeting.end_date), "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        meeting.response_count === 0
                          ? "bg-gray-100 text-gray-600"
                          : meeting.response_count < 5
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {meeting.response_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(parseISO(meeting.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <a
                        href={`/m/${meeting.share_link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm px-3 py-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        View
                      </a>
                      <button
                        onClick={() => onDelete(meeting.id)}
                        disabled={actionLoading === meeting.id}
                        className="text-sm px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedMeetings.length === 0 && (
          <div className="p-8 text-center">
            <div className="text-gray-500 mb-2">No meetings found matching your criteria.</div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}