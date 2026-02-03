import { CreateMeetingForm } from "@/components/meetings/CreateMeetingForm";
import { auth } from "@/lib/auth/auth";

export default async function CreateMeeting() {
  const session = await auth();

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
          <CreateMeetingForm
            currentUser={session?.user.email}
          ></CreateMeetingForm>
        </div>
      </div>
    </div>
  );
}
