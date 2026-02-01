"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import AvailabilityGrid from "@/components/AvailabilityGrid";

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  creator_id: number | null;
  share_link: string;
  is_private: number;
  created_at: string;
}

interface Slot {
  date: string;
  startTime: string;
  endTime: string;
}

interface ResponseData {
  id: string;
  name: string;
  user_id: number | null;
  guest_name: string | null;
  slots: Array<{
    date: string;
    start_time: string;
    end_time: string;
  }>;
}

export default function MeetingPage({
  params,
}: {
  params: Promise<{ shareLink: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);
  const [guestName, setGuestName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [canViewResults, setCanViewResults] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hasExistingResponse, setHasExistingResponse] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Check for existing guest response when name changes - fetch from API
  const checkGuestResponse = useCallback(
    async (name: string) => {
      if (!name.trim() || session?.user?.id) return;

      try {
        const response = await fetch(
          `/api/meetings/${resolvedParams.shareLink}/responses?guestName=${encodeURIComponent(name.trim())}`,
        );
        const data = await response.json();

        if (data.guestResponse) {
          setHasExistingResponse(true);
          const existingSlots = data.guestResponse.slots.map(
            (s: { date: string; start_time: string; end_time: string }) => ({
              date: s.date,
              startTime: s.start_time,
              endTime: s.end_time,
            }),
          );
          setSelectedSlots(existingSlots);
        } else {
          // Only reset if we previously had a response loaded
          if (hasExistingResponse) {
            setHasExistingResponse(false);
            setSelectedSlots([]);
          }
        }
      } catch {
        console.error("Failed to check guest response");
      }
    },
    [session?.user?.id, hasExistingResponse, resolvedParams.shareLink],
  );

  // Handle guest name change with debounce
  const handleGuestNameChange = (newName: string) => {
    setGuestName(newName);
    setSuccess(""); // Clear success message when name changes
  };

  // Effect to check guest response when name changes
  useEffect(() => {
    if (!session?.user?.id && guestName.trim()) {
      const timeoutId = setTimeout(() => {
        checkGuestResponse(guestName);
      }, 500); // Debounce 500ms
      return () => clearTimeout(timeoutId);
    } else if (!guestName.trim() && hasExistingResponse && !session?.user?.id) {
      // Clear when name is emptied
      setHasExistingResponse(false);
      setSelectedSlots([]);
    }
  }, [guestName, session?.user?.id, checkGuestResponse, hasExistingResponse]);

  const fetchResponses = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/meetings/${resolvedParams.shareLink}/responses`,
      );
      const data = await response.json();

      if (response.ok) {
        setResponses(data.responses || []);

        // Check if this is a userResponseOnly result (private meeting, non-creator)
        // In this case, user can see their own response but not all results
        if (data.userResponseOnly) {
          setCanViewResults(false);
          // Load the user's existing slots
          if (data.responses && data.responses.length > 0) {
            const userResponse = data.responses[0];
            setHasExistingResponse(true);
            const existingSlots = userResponse.slots.map(
              (s: { date: string; start_time: string; end_time: string }) => ({
                date: s.date,
                startTime: s.start_time,
                endTime: s.end_time,
              }),
            );
            setSelectedSlots(existingSlots);
          }
        } else {
          setCanViewResults(true);
          // If user is logged in, check if they have an existing response
          if (session?.user?.id) {
            // First try to find by user_id
            let userResponse = data.responses?.find(
              (r: ResponseData) => r.user_id === session.user.id,
            );

            // Fallback: try to find by name if not found by user_id
            if (!userResponse) {
              const userName = `${session.user.firstName} ${session.user.lastName}`;
              userResponse = data.responses?.find(
                (r: ResponseData) => r.name === userName,
              );
            }

            if (userResponse) {
              setHasExistingResponse(true);
              // Load their existing slots
              const existingSlots = userResponse.slots.map(
                (s: {
                  date: string;
                  start_time: string;
                  end_time: string;
                }) => ({
                  date: s.date,
                  startTime: s.start_time,
                  endTime: s.end_time,
                }),
              );
              setSelectedSlots(existingSlots);
            }
          }
        }
      } else if (response.status === 403) {
        setCanViewResults(false);
      }
    } catch {
      console.error("Failed to fetch responses");
    }
  }, [resolvedParams.shareLink, session?.user?.id]);

  const fetchMeeting = useCallback(async () => {
    try {
      const response = await fetch(`/api/meetings/${resolvedParams.shareLink}`);
      const data = await response.json();

      if (!response.ok) {
        if (data.requiresAuth) {
          setRequiresAuth(true);
        } else {
          setError(data.error || "Failed to load meeting");
        }
        return;
      }

      setMeeting(data.meeting);
      setRequiresAuth(false);
      fetchResponses();
    } catch {
      setError("Failed to load meeting");
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.shareLink, fetchResponses]);

  useEffect(() => {
    fetchMeeting();
  }, [fetchMeeting]);

  const handleSubmit = async () => {
    if (!session && !guestName.trim()) {
      setError("Please enter your name");
      return;
    }

    if (selectedSlots.length === 0) {
      setError("Please select at least one time slot");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/meetings/${resolvedParams.shareLink}/responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestName: guestName.trim() || null,
            slots: selectedSlots,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save response");
      }

      setSuccess(
        hasExistingResponse
          ? "Your availability has been updated!"
          : "Your availability has been saved!",
      );
      setHasExistingResponse(true);
      fetchResponses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedResponses = responses.map((r) => ({
    name: r.name,
    slots: r.slots.map((s) => ({
      date: s.date,
      startTime: s.start_time,
      endTime: s.end_time,
    })),
  }));

  const formatTime12Hour = (time: string): string => {
    const [hour, min] = time.split(":").map(Number);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${min.toString().padStart(2, "0")} ${ampm}`;
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (requiresAuth) {
    // Build the callback URL to return to this page after login
    const callbackUrl = `/m/${resolvedParams.shareLink}`;

    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Sign In Required
          </h2>
          <p className="text-gray-600 mb-6">
            This meeting is private. Please sign in with an invited email
            address to access it.
          </p>
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="inline-block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (error && !meeting) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Go back home
          </Link>
        </div>
      </div>
    );
  }

  if (!meeting) return null;

  const isCreator = session?.user?.id === meeting.creator_id;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-6 sm:py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Meeting Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-6 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    {meeting.title}
                  </h1>
                  {meeting.is_private === 1 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                      <svg
                        className="w-3 h-3 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      Private
                    </span>
                  )}
                </div>
                {meeting.description && (
                  <p className="mt-2 text-indigo-100">{meeting.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                {isCreator && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl transition-colors font-medium"
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                )}
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl transition-colors shrink-0 font-medium"
                >
                  {copied ? (
                    <>
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
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
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                      </svg>
                      Share
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 sm:px-8 bg-gray-50/50">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-indigo-500"
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
                <span className="font-medium">
                  {format(parseISO(meeting.start_date), "MMM d")} -{" "}
                  {format(parseISO(meeting.end_date), "MMM d, yyyy")}
                </span>
              </div>
              {meeting.start_time && meeting.end_time && (
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-indigo-500"
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
                  <span>
                    {formatTime12Hour(meeting.start_time)} -{" "}
                    {formatTime12Hour(meeting.end_time)}
                  </span>
                </div>
              )}
              {meeting.location && (
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-indigo-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>{meeting.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-indigo-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span>
                  {responses.length} response{responses.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setShowResults(false)}
            className={`flex-1 sm:flex-none px-5 py-3 rounded-xl font-medium transition-all ${
              !showResults
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-50 shadow"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span className="hidden sm:inline">Your</span> Availability
            </span>
          </button>
          <button
            onClick={() => setShowResults(true)}
            disabled={!canViewResults}
            className={`flex-1 sm:flex-none px-5 py-3 rounded-xl font-medium transition-all ${
              showResults
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-50 shadow"
            } ${!canViewResults ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="flex items-center justify-center gap-2">
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
              <span className="hidden sm:inline">View</span> Results
              {responses.length > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                    showResults
                      ? "bg-white/20"
                      : "bg-indigo-100 text-indigo-600"
                  }`}
                >
                  {responses.length}
                </span>
              )}
            </span>
          </button>
        </div>

        {!canViewResults && showResults && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
            <svg
              className="w-5 h-5 text-yellow-600 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Only the meeting creator can view results for this private meeting.
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8">
          {!showResults && !session && (
            <div className="mb-6">
              <label
                htmlFor="guestName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Name <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  id="guestName"
                  value={guestName}
                  onChange={(e) => handleGuestNameChange(e.target.value)}
                  className="w-full sm:w-80 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Enter your name"
                />
                {hasExistingResponse && (
                  <span className="inline-flex items-center gap-1 text-sm text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl">
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Previous response loaded
                  </span>
                )}
              </div>
              {hasExistingResponse && (
                <p className="mt-2 text-sm text-gray-500">
                  We found your previous response. Make changes and save to
                  update.
                </p>
              )}
            </div>
          )}

          {!showResults && session && (
            <div className="mb-6 flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 rounded-xl border border-indigo-100">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                {session.user.firstName?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {hasExistingResponse
                    ? "Updating availability as"
                    : "Responding as"}{" "}
                  {session.user.firstName} {session.user.lastName}
                </p>
                <p className="text-sm text-gray-500">{session.user.email}</p>
              </div>
              {hasExistingResponse && (
                <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
                  Already responded
                </span>
              )}
            </div>
          )}

          <AvailabilityGrid
            startDate={meeting.start_date}
            endDate={meeting.end_date}
            startTime={meeting.start_time || "09:00"}
            endTime={meeting.end_time || "17:00"}
            selectedSlots={selectedSlots}
            onSlotsChange={setSelectedSlots}
            readOnly={showResults}
            responses={formattedResponses}
            showResults={showResults}
          />

          {!showResults && (
            <>
              {error && (
                <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                  <svg
                    className="w-5 h-5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
                  <svg
                    className="w-5 h-5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {success}
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || selectedSlots.length === 0}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg
                        className="animate-spin w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {hasExistingResponse ? "Update" : "Save"} Availability
                    </>
                  )}
                </button>
                {canViewResults && responses.length > 0 && (
                  <button
                    onClick={() => setShowResults(true)}
                    className="sm:flex-none bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
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
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    See Results
                  </button>
                )}
              </div>
            </>
          )}

          {showResults && responses.length > 0 && (
            <div className="mt-8 border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Participants ({responses.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {responses.map((response, index) => {
                  const colors = [
                    "from-indigo-500 to-purple-600",
                    "from-pink-500 to-rose-600",
                    "from-emerald-500 to-teal-600",
                    "from-amber-500 to-orange-600",
                    "from-cyan-500 to-blue-600",
                  ];
                  const colorClass = colors[index % colors.length];

                  return (
                    <div
                      key={response.id}
                      className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-xl transition-colors"
                    >
                      <div
                        className={`w-8 h-8 bg-gradient-to-br ${colorClass} rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm`}
                      >
                        {response.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {response.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {response.slots.length} slot
                        {response.slots.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showResults && responses.length === 0 && (
            <div className="mt-8 text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No responses yet
              </h3>
              <p className="text-gray-600 mb-4">
                Share the link with participants to collect their availability
              </p>
              <button
                onClick={copyLink}
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
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
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Copy share link
              </button>
            </div>
          )}
        </div>

        {isCreator && (
          <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 flex items-start gap-3 border border-indigo-100">
            <svg
              className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-indigo-900">
                You created this meeting
              </p>
              <p className="text-sm text-indigo-700 mt-0.5">
                {meeting.is_private
                  ? "Results are private — only you can see them."
                  : "All participants can view the results."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && meeting && (
        <EditMeetingModal
          meeting={meeting}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            fetchMeeting();
          }}
          onDelete={() => {
            router.push("/dashboard");
          }}
        />
      )}
    </div>
  );
}

// Edit Meeting Modal Component
function EditMeetingModal({
  meeting,
  onClose,
  onSave,
  onDelete,
}: {
  meeting: Meeting;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [formData, setFormData] = useState({
    title: meeting.title,
    description: meeting.description || "",
    location: meeting.location || "",
    startDate: meeting.start_date,
    endDate: meeting.end_date,
    startTime: meeting.start_time || "09:00",
    endTime: meeting.end_time || "17:00",
    useTimeWindow: !!meeting.start_time,
    isPrivate: meeting.is_private === 1,
    invitedEmails: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load invited emails
  useEffect(() => {
    const loadInvites = async () => {
      try {
        const response = await fetch(`/api/meetings/${meeting.share_link}`);
        const data = await response.json();
        if (data.invites && data.invites.length > 0) {
          setFormData((prev) => ({
            ...prev,
            invitedEmails: data.invites
              .map((i: { email: string }) => i.email)
              .join(", "),
          }));
        }
      } catch {
        console.error("Failed to load invites");
      }
    };
    loadInvites();
  }, [meeting.share_link]);

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/meetings/${meeting.share_link}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          location: formData.location.trim() || null,
          startDate: formData.startDate,
          endDate: formData.endDate,
          startTime: formData.useTimeWindow ? formData.startTime : null,
          endTime: formData.useTimeWindow ? formData.endTime : null,
          isPrivate: formData.isPrivate,
          invitedEmails: formData.invitedEmails
            ? formData.invitedEmails
                .split(",")
                .map((e) => e.trim().toLowerCase())
                .filter(Boolean)
            : [],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update meeting");
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/meetings/${meeting.share_link}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete meeting");
      }

      onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setDeleting(false);
    }
  };

  const formatTime12Hour = (time: string): string => {
    const [hour, min] = time.split(":").map(Number);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${min.toString().padStart(2, "0")} ${ampm}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Edit Meeting</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-500"
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
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meeting Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                min={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.useTimeWindow}
                onChange={(e) =>
                  setFormData({ ...formData, useTimeWindow: e.target.checked })
                }
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="font-medium text-gray-900 text-sm">
                Limit time window
              </span>
            </label>
            {formData.useTimeWindow && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    From
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPrivate}
                onChange={(e) =>
                  setFormData({ ...formData, isPrivate: e.target.checked })
                }
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="font-medium text-gray-900 text-sm">
                Private results
              </span>
            </label>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Invited emails (comma-separated)
              </label>
              <textarea
                rows={2}
                value={formData.invitedEmails}
                onChange={(e) =>
                  setFormData({ ...formData, invitedEmails: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3 shrink-0">
          {!showDeleteConfirm ? (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="sm:mr-auto px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors text-sm"
              >
                Delete Meeting
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.title.trim()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 flex-1">
                Are you sure? This will delete all responses too.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
