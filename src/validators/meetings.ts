import { differenceInDays, parseISO } from "date-fns";
import { z } from "zod";

export const convertCheckBoxToBool = z.transform(
  (val: string | undefined) => val === "on",
);

export const createMeetingSchema = z
  .object({
    title: z.string().trim().min(1, "A meeting name must be provided."),
    description: z.optional(z.string().trim()),
    location: z.optional(z.string().trim()),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    startTime: z.optional(z.iso.time()),
    endTime: z.optional(z.iso.time()),
    useTimeWindow: convertCheckBoxToBool,
    isPrivate: convertCheckBoxToBool,
    invitedEmails: z.array(z.email().trim().toLowerCase()),
  })
  .refine(
    (data) => {
      const difference =
        differenceInDays(parseISO(data.endDate), parseISO(data.startDate)) + 1;
      return difference > 0 && difference <= 14;
    },
    {
      error: "Meeting duration must be between 1 and 14 days.",
      path: ["endDate"],
    },
  );

export type CreateMeetingData = z.infer<typeof createMeetingSchema>;
