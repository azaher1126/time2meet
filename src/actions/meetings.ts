"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import {
  type CreateMeetingData,
  createMeetingSchema,
  convertCheckBoxToBool,
} from "@/validators/meetings";
import { parseISO } from "date-fns";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";

export type CreateMeetingState =
  | (CreateMeetingData & { errors?: string[] })
  | null;

type CreateMeetingRawData = Omit<
  CreateMeetingData,
  "useTimeWindow" | "isPrivate"
> & { useTimeWindow?: string; isPrivate?: string };

export async function createMeeting(
  _prevState: CreateMeetingState,
  formData: FormData,
): Promise<CreateMeetingState> {
  const rawData = {
    ...Object.fromEntries(formData),
    invitedEmails: formData.getAll("invitedEmails"),
  } as CreateMeetingRawData;
  const meetingData = createMeetingSchema.safeParse(rawData);

  if (!meetingData.success) {
    return {
      ...rawData,
      useTimeWindow: convertCheckBoxToBool.parse(rawData.useTimeWindow),
      isPrivate: convertCheckBoxToBool.parse(rawData.isPrivate),
      errors: meetingData.error.issues.map((issue) => issue.message),
    };
  }

  let timeWindowId: number | null = null;

  if (meetingData.data.startTime && meetingData.data.endTime) {
    const [startHour, startMin] = meetingData.data.startTime
      .split(":")
      .map(Number);
    const [endHour, endMin] = meetingData.data.endTime.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    let timeWindow = await prisma.meetingTimeWindow.findUnique({
      where: {
        startTime_endTime: {
          startTime: startMinutes,
          endTime: endMinutes,
        },
      },
    });

    if (!timeWindow) {
      timeWindow = await prisma.meetingTimeWindow.create({
        data: {
          startTime: startMinutes,
          endTime: endMinutes,
        },
      });
    }

    timeWindowId = timeWindow.id;
  }

  const session = await auth();
  const userId = session?.user?.id;

  const meeting = await prisma.meeting.create({
    data: {
      title: meetingData.data.title,
      description: meetingData.data.description,
      location: meetingData.data.location,
      startDate: parseISO(meetingData.data.startDate),
      endDate: parseISO(meetingData.data.endDate),
      timeWindowId,
      creatorId: userId,
      shareLink: nanoid(),
      isPrivate: meetingData.data.isPrivate,
      meetingInvites: {
        create: meetingData.data.invitedEmails.map((email) => ({ email })),
      },
    },
  });

  redirect(`m/${meeting.shareLink}`);
}
