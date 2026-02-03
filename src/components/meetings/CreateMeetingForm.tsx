"use client";

import { createMeeting, CreateMeetingState } from "@/actions/meetings";
import { format, addDays, differenceInDays, parseISO } from "date-fns";
import { useActionState, useState } from "react";
import { EmailListInput } from "../EmailListInput";

export function CreateMeetingForm({ currentUser }: { currentUser?: string }) {
  const [state, formAction] = useActionState<CreateMeetingState, FormData>(
    createMeeting,
    null,
  );

  const [startDate, setStartDate] = useState(
    state?.startDate ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(
    state?.endDate ?? format(addDays(new Date(), 7), "yyyy-MM-dd"),
  );

  const dateRangeDays =
    differenceInDays(new Date(endDate), new Date(startDate)) + 1;

  const [useTimeWindow, setUseTimeWindow] = useState(
    state?.useTimeWindow ?? true,
  );

  const [startTime, setStartTime] = useState(state?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(state?.endTime ?? "17:00");

  const [invitedEmails, setInvitedEmails] = useState(
    state?.invitedEmails ?? [],
  );

  function formatTime12Hour(time: string): string {
    const [hour, min] = time.split(":").map(Number);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${min.toString().padStart(2, "0")} ${ampm}`;
  }

  return (
    <form action={formAction} className="p-6 sm:p-8 space-y-6">
      {state?.errors && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {state.errors.map((error, index) => (
            <p key={index}>{error}</p>
          ))}
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
          name="title"
          required
          defaultValue={state?.title ?? ""}
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
          name="description"
          rows={3}
          defaultValue={state?.description ?? ""}
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
          name="location"
          defaultValue={state?.location ?? ""}
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
              name="startDate"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
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
              name="endDate"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
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
                {dateRangeDays} day{dateRangeDays !== 1 ? "s" : ""} selected
                {dateRangeDays > 14 && " (maximum 14 days)"}
              </>
            ) : (
              "Invalid date range"
            )}
          </span>
          {dateRangeDays > 0 && dateRangeDays <= 14 && (
            <span className="text-indigo-600 font-medium">
              {format(parseISO(startDate), "MMM d")} -{" "}
              {format(parseISO(endDate), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>

      {/* Time Window Toggle */}
      <div className="bg-gray-50 rounded-xl p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="useTimeWindow"
            key={`${state?.useTimeWindow ?? true}`}
            checked={useTimeWindow}
            onChange={(e) => setUseTimeWindow(e.target.checked)}
            className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <div>
            <span className="font-medium text-gray-900">Limit time window</span>
            <p className="text-sm text-gray-500">
              Restrict availability to specific hours (e.g., business hours
              only)
            </p>
          </div>
        </label>

        {useTimeWindow && (
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
                  name="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
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
                  name="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Time window: {formatTime12Hour(startTime)} -{" "}
              {formatTime12Hour(endTime)}
            </p>
          </div>
        )}

        {!useTimeWindow && (
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
            Participants can select any time of day (9:00 AM - 5:00 PM default)
          </p>
        )}
      </div>

      {/* Privacy Settings - Only for authenticated users */}
      {currentUser && (
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
              name="isPrivate"
              defaultChecked={state?.isPrivate ?? false}
              className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <div>
              <span className="font-medium text-gray-900">Private results</span>
              <p className="text-sm text-gray-500">
                Only you can view the aggregated results
              </p>
            </div>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invite specific participants{" "}
              <span className="text-gray-400">(optional)</span>
            </label>
            <EmailListInput
              value={invitedEmails}
              onChange={setInvitedEmails}
              currentUser={currentUser}
            />
            {invitedEmails.map((email, index) => (
              <input
                key={index}
                type="hidden"
                name="invitedEmails"
                value={email}
              />
            ))}
            <p className="mt-1 text-sm text-gray-500">
              Only these users can access the form (requires sign-in).
            </p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="space-y-3">
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create time2meet
        </button>

        {!currentUser && (
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
  );
}
