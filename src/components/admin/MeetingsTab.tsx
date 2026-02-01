"use client";

import { useState, useMemo, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { DataTable, Column } from "./DataTable";
import { deleteMeetingAction } from "@/actions/admin";
import type { AdminMeeting } from "@/types/admin";

interface MeetingsTabProps {
  meetings: AdminMeeting[];
}

export function MeetingsTab({ meetings }: MeetingsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [actionMeetingId, setActionMeetingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [minResponses, setMinResponses] = useState("");
  const [maxResponses, setMaxResponses] = useState("");
  const [ownerSearch, setOwnerSearch] = useState("");
  const [showAnonymousOnly, setShowAnonymousOnly] = useState(false);
  const [visibilityFilter, setVisibilityFilter] = useState<
    "all" | "public" | "private"
  >("all");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    searchTerm !== "" ||
    dateRangeStart !== "" ||
    dateRangeEnd !== "" ||
    minResponses !== "" ||
    maxResponses !== "" ||
    ownerSearch !== "" ||
    showAnonymousOnly ||
    visibilityFilter !== "all";

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

  const handleDelete = (meetingId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this meeting? This action cannot be undone.",
      )
    ) {
      return;
    }

    setActionMeetingId(meetingId);
    startTransition(async () => {
      await deleteMeetingAction(meetingId);
      setActionMeetingId(null);
    });
  };

  // Filter meetings
  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        meeting.title.toLowerCase().includes(searchLower) ||
        meeting.share_link.toLowerCase().includes(searchLower) ||
        meeting.creator_name?.toLowerCase().includes(searchLower) ||
        meeting.creator_email?.toLowerCase().includes(searchLower);

      // Date range filter
      let matchesDateRange = true;
      if (dateRangeStart) {
        matchesDateRange =
          matchesDateRange && meeting.start_date >= dateRangeStart;
      }
      if (dateRangeEnd) {
        matchesDateRange =
          matchesDateRange && meeting.start_date <= dateRangeEnd;
      }

      // Response count filter
      let matchesResponses = true;
      if (minResponses !== "") {
        matchesResponses =
          matchesResponses && meeting.response_count >= parseInt(minResponses);
      }
      if (maxResponses !== "") {
        matchesResponses =
          matchesResponses && meeting.response_count <= parseInt(maxResponses);
      }

      // Owner filter
      let matchesOwner = true;
      if (showAnonymousOnly) {
        matchesOwner = !meeting.creator_email;
      } else if (ownerSearch !== "") {
        const ownerSearchLower = ownerSearch.toLowerCase();
        matchesOwner =
          meeting.creator_name?.toLowerCase().includes(ownerSearchLower) ||
          meeting.creator_email?.toLowerCase().includes(ownerSearchLower) ||
          false;
      }

      // Visibility filter
      let matchesVisibility = true;
      if (visibilityFilter === "public") {
        matchesVisibility = !meeting.is_private;
      } else if (visibilityFilter === "private") {
        matchesVisibility = meeting.is_private;
      }

      return (
        matchesSearch &&
        matchesDateRange &&
        matchesResponses &&
        matchesOwner &&
        matchesVisibility
      );
    });
  }, [
    meetings,
    searchTerm,
    dateRangeStart,
    dateRangeEnd,
    minResponses,
    maxResponses,
    ownerSearch,
    showAnonymousOnly,
    visibilityFilter,
  ]);

  // Define table columns
  const columns: Column<AdminMeeting>[] = [
    {
      key: "title",
      header: "Meeting",
      sortable: true,
      sortValue: (meeting) => meeting.title,
      render: (meeting) => (
        <div>
          <div className="font-medium text-gray-900 flex items-center gap-2">
            {meeting.title}
            {meeting.is_private && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                Private
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 font-mono">
            /m/{meeting.share_link}
          </div>
        </div>
      ),
    },
    {
      key: "creator",
      header: "Creator",
      sortable: true,
      sortValue: (meeting) =>
        meeting.creator_name || meeting.creator_email || "",
      render: (meeting) =>
        meeting.creator_name ? (
          <div>
            <div className="text-sm text-gray-900">{meeting.creator_name}</div>
            <div className="text-sm text-gray-500">{meeting.creator_email}</div>
          </div>
        ) : (
          <span className="text-sm text-gray-400 italic">Anonymous</span>
        ),
    },
    {
      key: "start_date",
      header: "Date Range",
      sortable: true,
      sortValue: (meeting) => meeting.start_date,
      render: (meeting) => (
        <span className="text-sm text-gray-500">
          {format(parseISO(meeting.start_date), "MMM d")} -{" "}
          {format(parseISO(meeting.end_date), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "response_count",
      header: "Responses",
      sortable: true,
      sortValue: (meeting) => meeting.response_count,
      render: (meeting) => (
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
      ),
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      sortValue: (meeting) => meeting.created_at,
      render: (meeting) => (
        <span className="text-sm text-gray-500">
          {format(parseISO(meeting.created_at), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (meeting) => {
        const isLoading = isPending && actionMeetingId === meeting.id;
        return (
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
              onClick={() => handleDelete(meeting.id)}
              disabled={isLoading}
              className="text-sm px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ];

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
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                !
              </span>
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
              {/* Owner Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner (Name or Email)
                </label>
                <input
                  type="text"
                  value={ownerSearch}
                  onChange={(e) => {
                    setOwnerSearch(e.target.value);
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
                  onChange={(e) =>
                    setVisibilityFilter(
                      e.target.value as "all" | "public" | "private",
                    )
                  }
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
                      if (e.target.checked) {
                        setOwnerSearch("");
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    Anonymous meetings only
                  </span>
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
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
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
          Showing {filteredMeetings.length} of {meetings.length} meetings
          {hasActiveFilters && " (filtered)"}
        </span>
      </div>

      {/* Meetings Table */}
      <DataTable
        data={filteredMeetings}
        columns={columns}
        keyExtractor={(meeting) => meeting.id}
        defaultSortKey="created_at"
        defaultSortDirection="desc"
        emptyMessage={
          hasActiveFilters
            ? "No meetings found matching your criteria."
            : "No meetings found."
        }
      />

      {filteredMeetings.length === 0 && hasActiveFilters && (
        <div className="text-center">
          <button
            onClick={clearFilters}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
