"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "../../../prisma/generated/prisma/enums";

// Helper to check if current user is admin
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.role !== Role.ADMIN) {
    throw new Error("Unauthorized");
  }

  return { session, currentUserId: user.id };
}

// User actions
export async function updateUserAction(
  userId: number,
  action: "activate" | "deactivate" | "elevate" | "demote"
) {
  const { currentUserId } = await requireAdmin();

  // Cannot modify self
  if (userId === currentUserId) {
    return { error: "Cannot modify your own account" };
  }

  // Check if target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!targetUser) {
    return { error: "User not found" };
  }

  try {
    switch (action) {
      case "deactivate":
        await prisma.user.update({
          where: { id: userId },
          data: { isActive: false, deactivatedAt: new Date() },
        });
        break;
      case "activate":
        await prisma.user.update({
          where: { id: userId },
          data: { isActive: true, activatedAt: new Date() },
        });
        break;
      case "elevate":
        await prisma.user.update({
          where: { id: userId },
          data: { role: Role.ADMIN },
        });
        break;
      case "demote":
        await prisma.user.update({
          where: { id: userId },
          data: { role: Role.USER },
        });
        break;
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Update user error:", error);
    return { error: "Failed to update user" };
  }
}

// Meeting actions
export async function deleteMeetingAction(meetingId: number) {
  await requireAdmin();

  // Check if meeting exists
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
  });

  if (!meeting) {
    return { error: "Meeting not found" };
  }

  try {
    await prisma.meeting.delete({
      where: { id: meetingId },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Delete meeting error:", error);
    return { error: "Failed to delete meeting" };
  }
}
