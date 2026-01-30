"use client";

import { useState, useMemo, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { DataTable, Column } from "./DataTable";
import { updateUserAction } from "../actions";
import type { AdminUser } from "../types";
import { Role } from "../../../../prisma/generated/prisma/enums";

interface UsersTabProps {
  users: AdminUser[];
  currentUserId: number;
}

export function UsersTab({ users, currentUserId }: UsersTabProps) {
  const [isPending, startTransition] = useTransition();
  const [actionUserId, setActionUserId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "user">("all");
  const [showDateFilters, setShowDateFilters] = useState(false);
  const [joinedStartDate, setJoinedStartDate] = useState("");
  const [joinedEndDate, setJoinedEndDate] = useState("");
  const [lastLoginStartDate, setLastLoginStartDate] = useState("");
  const [lastLoginEndDate, setLastLoginEndDate] = useState("");
  const [lastLoginFilter, setLastLoginFilter] = useState<"all" | "never" | "hasLoggedIn">("all");

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

  const handleAction = (userId: number, action: "activate" | "deactivate" | "elevate" | "demote") => {
    setActionUserId(userId);
    startTransition(async () => {
      await updateUserAction(userId, action);
      setActionUserId(null);
    });
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && user.isActive) ||
        (filterStatus === "inactive" && !user.isActive);

      // Role filter
      const matchesRole =
        filterRole === "all" ||
        (filterRole === "admin" && user.role === Role.ADMIN) ||
        (filterRole === "user" && user.role === Role.USER);

      // Joined date filter
      let matchesJoinedDate = true;
      const joinedDate = user.createdAt.split("T")[0];
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

      if (matchesLastLogin && user.last_login && (lastLoginStartDate || lastLoginEndDate)) {
        const lastLoginDate = user.last_login.split("T")[0];
        if (lastLoginStartDate) {
          matchesLastLogin = matchesLastLogin && lastLoginDate >= lastLoginStartDate;
        }
        if (lastLoginEndDate) {
          matchesLastLogin = matchesLastLogin && lastLoginDate <= lastLoginEndDate;
        }
      }

      return matchesSearch && matchesStatus && matchesRole && matchesJoinedDate && matchesLastLogin;
    });
  }, [users, searchTerm, filterStatus, filterRole, joinedStartDate, joinedEndDate, lastLoginFilter, lastLoginStartDate, lastLoginEndDate]);

  // Define table columns
  const columns: Column<AdminUser>[] = [
    {
      key: "name",
      header: "User",
      sortable: true,
      sortValue: (user) => `${user.firstName} ${user.lastName}`,
      render: (user) => (
        <div>
          <div className="font-medium text-gray-900">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (user) => (user.isActive ? 1 : 0),
      render: (user) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {user.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      sortValue: (user) => (user.role === Role.ADMIN ? 1 : 0),
      render: (user) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.role === Role.ADMIN ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"
          }`}
        >
          {user.role === Role.ADMIN ? "Admin" : "User"}
        </span>
      ),
    },
    {
      key: "meetings_count",
      header: "Meetings",
      sortable: true,
      align: "center",
      sortValue: (user) => user.meetings_count,
      render: (user) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.meetings_count > 0 ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-500"
          }`}
        >
          {user.meetings_count}
        </span>
      ),
    },
    {
      key: "responses_count",
      header: "Responses",
      sortable: true,
      align: "center",
      sortValue: (user) => user.responses_count,
      render: (user) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.responses_count > 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
          }`}
        >
          {user.responses_count}
        </span>
      ),
    },
    {
      key: "login_count",
      header: "Logins",
      sortable: true,
      align: "center",
      sortValue: (user) => user.login_count,
      render: (user) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.login_count > 0 ? "bg-indigo-100 text-indigo-800" : "bg-gray-100 text-gray-500"
          }`}
        >
          {user.login_count}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Joined",
      sortable: true,
      sortValue: (user) => user.createdAt,
      render: (user) => (
        <span className="text-sm text-gray-500">
          {format(parseISO(user.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "last_login",
      header: "Last Login",
      sortable: true,
      sortValue: (user) => user.last_login,
      render: (user) =>
        user.last_login ? (
          <span className="text-sm text-gray-500">
            {format(parseISO(user.last_login), "MMM d, yyyy")}
          </span>
        ) : (
          <span className="text-sm text-gray-400 italic">Never</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (user) => {
        if (user.id === currentUserId) {
          return <span className="text-sm text-gray-400">Current User</span>;
        }
        const isLoading = isPending && actionUserId === user.id;
        return (
          <div className="flex justify-end gap-2">
            {user.isActive ? (
              <button
                onClick={() => handleAction(user.id, "deactivate")}
                disabled={isLoading}
                className="text-sm px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Deactivate
              </button>
            ) : (
              <button
                onClick={() => handleAction(user.id, "activate")}
                disabled={isLoading}
                className="text-sm px-3 py-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Activate
              </button>
            )}
            {user.role === Role.ADMIN ? (
              <button
                onClick={() => handleAction(user.id, "demote")}
                disabled={isLoading}
                className="text-sm px-3 py-1 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Demote
              </button>
            ) : (
              <button
                onClick={() => handleAction(user.id, "elevate")}
                disabled={isLoading}
                className="text-sm px-3 py-1 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Make Admin
              </button>
            )}
          </div>
        );
      },
    },
  ];

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
          Showing {filteredUsers.length} of {users.length} users
          {(searchTerm || filterStatus !== "all" || filterRole !== "all" || hasDateFilters) && " (filtered)"}
        </span>
      </div>

      {/* Users Table */}
      <DataTable
        data={filteredUsers}
        columns={columns}
        keyExtractor={(user) => user.id}
        defaultSortKey="created_at"
        defaultSortDirection="desc"
        emptyMessage="No users found matching your filters."
        rowClassName={(user) => (!user.isActive ? "bg-gray-50" : "hover:bg-gray-50 transition-colors")}
      />
    </div>
  );
}
