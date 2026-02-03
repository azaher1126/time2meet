import Link from "next/link";
import { format, isPast, isToday, isFuture } from "date-fns";
import { TabView } from "../TabView";
import { CopyLinkButton } from "../CopyButton";
import { Meeting as DbMeeting } from "../../../prisma/generated/prisma/client";

type Meeting = DbMeeting & {
  _count?: {
    meetingResponses: number;
  };
};

interface DashboardTabViewProps {
  createdMeetings: Meeting[];
  respondedMeetings: Meeting[];
}

export function DashboardTabView({
  createdMeetings,
  respondedMeetings,
}: DashboardTabViewProps) {
  return (
    <TabView
      tabs={[
        {
          buttonContent: (
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Created ({createdMeetings.length})
            </span>
          ),
          tabContent: (
            <>
              {createdMeetings.length === 0 ? (
                <EmptyState type="created" />
              ) : (
                createdMeetings.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} isCreator />
                ))
              )}
            </>
          ),
        },
        {
          buttonContent: (
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              Responded ({respondedMeetings.length})
            </span>
          ),
          tabContent: (
            <>
              {respondedMeetings.length === 0 ? (
                <EmptyState type="responded" />
              ) : (
                respondedMeetings.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))
              )}
            </>
          ),
        },
      ]}
    />
  );
}

function EmptyState({ type }: { type: "created" | "responded" }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {type === "created" ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          )}
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {type === "created" ? "No meetings yet" : "No responses yet"}
      </h3>
      <p className="text-gray-600 mb-6">
        {type === "created"
          ? "Create your first time2meet to get started"
          : "Meetings you respond to will appear here"}
      </p>
      {type === "created" && (
        <Link
          href="/create"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create a meeting
        </Link>
      )}
    </div>
  );
}

function MeetingCard({
  meeting,
  isCreator = false,
}: {
  meeting: Meeting;
  isCreator?: boolean;
}) {
  const meetingLink = `m/${meeting.shareLink}`;

  const endDate = meeting.endDate;
  const startDate = meeting.startDate;
  const isPastMeeting = isPast(endDate) && !isToday(endDate);

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow ${
        isPastMeeting ? "opacity-70" : ""
      }`}
    >
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {meeting.title}
              </h3>
              {meeting.isPrivate && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
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
              {isPastMeeting && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  Ended
                </span>
              )}
              {!isPastMeeting && isFuture(startDate) && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Upcoming
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>
                  {format(startDate, "MMM d")} -{" "}
                  {format(endDate, "MMM d, yyyy")}
                </span>
              </div>
              {isCreator && meeting._count && (
                <div className="flex items-center gap-1">
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span>
                    {meeting._count.meetingResponses} response
                    {meeting._count.meetingResponses !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {meeting.location && (
                <div className="flex items-center gap-1">
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
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="truncate max-w-[150px]">
                    {meeting.location}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {isCreator && (
              <CopyLinkButton
                text={meetingLink}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                copiedChildren={
                  <>
                    <svg
                      className="w-4 h-4 text-green-600"
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
                    <span className="hidden sm:inline">Copied!</span>
                  </>
                }
              >
                <>
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
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Share</span>
                </>
              </CopyLinkButton>
            )}
            <Link
              href={meetingLink}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              <span>View</span>
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
