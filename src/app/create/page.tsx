"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, addDays, differenceInDays } from "date-fns";

export default function CreateMeeting() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const today = format(new Date(), "yyyy-MM-dd");
  const nextWeek = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    startDate: today,
    endDate: nextWeek,
    startTime: "09:00",
    endTime: "17:00",
    useTimeWindow: true,
    isPrivate: false,
    invitedEmails: "",
  });

  // Calculate date range info
  const dateRangeDays =
    differenceInDays(new Date(formData.endDate), new Date(formData.startDate)) +
    1;

  // Validate form
  const isStep1Valid = formData.title.trim().length > 0;
  const isStep2Valid =
    formData.startDate &&
    formData.endDate &&
    new Date(formData.endDate) >= new Date(formData.startDate) &&
    dateRangeDays <= 14; // Max 2 weeks

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isStep1Valid || !isStep2Valid) {
      setError("Please fill in all required fields correctly");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create meeting");
      }

      router.push(`/m/${data.shareLink}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format time for display
  const formatTime12Hour = (time: string): string => {
    const [hour, min] = time.split(":").map(Number);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${min.toString().padStart(2, "0")} ${ampm}`;
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 sm:px-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Create a time2meet
            </h1>
            <p className="mt-2 text-indigo-100">
              Set up your availability poll and share it with participants
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Meeting Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="e.g., Team Weekly Standup"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Description <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                placeholder="Add any additional details about the meeting..."
              />
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Location <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="e.g., Conference Room A or Zoom link"
              />
            </div>

            {/* Date Range */}
            <div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    required
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    required
                    value={formData.endDate}
                    min={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                      dateRangeDays > 14
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                  />
                </div>
              </div>
              {/* Date range info */}
              <div className="mt-2 flex items-center justify-between text-sm">
                <span
                  className={`${dateRangeDays > 14 ? "text-red-600" : "text-gray-500"}`}
                >
                  {dateRangeDays > 0 ? (
                    <>
                      {dateRangeDays} day{dateRangeDays !== 1 ? "s" : ""}{" "}
                      selected
                      {dateRangeDays > 14 && " (maximum 14 days)"}
                    </>
                  ) : (
                    "Invalid date range"
                  )}
                </span>
                {dateRangeDays > 0 && dateRangeDays <= 14 && (
                  <span className="text-indigo-600 font-medium">
                    {format(new Date(formData.startDate), "MMM d")} -{" "}
                    {format(new Date(formData.endDate), "MMM d, yyyy")}
                  </span>
                )}
              </div>
            </div>

            {/* Time Window Toggle */}
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.useTimeWindow}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      useTimeWindow: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <div>
                  <span className="font-medium text-gray-900">
                    Limit time window
                  </span>
                  <p className="text-sm text-gray-500">
                    Restrict availability to specific hours (e.g., business
                    hours only)
                  </p>
                </div>
              </label>

              {formData.useTimeWindow && (
                <div className="mt-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="startTime"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Earliest Time
                      </label>
                      <input
                        type="time"
                        id="startTime"
                        value={formData.startTime}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            startTime: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="endTime"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Latest Time
                      </label>
                      <input
                        type="time"
                        id="endTime"
                        value={formData.endTime}
                        onChange={(e) =>
                          setFormData({ ...formData, endTime: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Time window: {formatTime12Hour(formData.startTime)} -{" "}
                    {formatTime12Hour(formData.endTime)}
                  </p>
                </div>
              )}

              {!formData.useTimeWindow && (
                <p className="mt-3 text-sm text-gray-500 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Participants can select any time of day (9:00 AM - 5:00 PM
                  default)
                </p>
              )}
            </div>

            {/* Privacy Settings - Only for authenticated users */}
            {session && (
              <div className="bg-indigo-50 rounded-xl p-4 space-y-4">
                <h3 className="font-medium text-indigo-900 flex items-center gap-2">
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
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Privacy Settings
                </h3>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPrivate}
                    onChange={(e) =>
                      setFormData({ ...formData, isPrivate: e.target.checked })
                    }
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">
                      Private results
                    </span>
                    <p className="text-sm text-gray-500">
                      Only you can view the aggregated results
                    </p>
                  </div>
                </label>

                <div>
                  <label
                    htmlFor="invitedEmails"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Invite specific participants{" "}
                    <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    id="invitedEmails"
                    rows={2}
                    value={formData.invitedEmails}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invitedEmails: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                    placeholder="email1@example.com, email2@example.com"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Comma-separated emails. Only these users can access the form
                    (requires sign-in).
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={isSubmitting || !isStep1Valid || !isStep2Valid}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
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
                    Creating your time2meet...
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Create time2meet
                  </>
                )}
              </button>

              {!session && (
                <p className="text-center text-sm text-gray-500">
                  <a
                    href="/login"
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Sign in
                  </a>{" "}
                  to access privacy settings and track your meetings
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
