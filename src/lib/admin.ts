import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { Role } from "../../prisma/generated/prisma/enums";
import { auth } from "./auth";

export async function initializeAdminUser(): Promise<void> {
  const numAdmins = await prisma.user.count({
    where: {
      role: Role.ADMIN,
    },
  });

  if (numAdmins !== 0) {
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn(
      "WARNING: No Admin user exists and ADMIN_EMAIL or ADMIN_PASSWORD was not provided.",
    );
    return; // No admin credentials provided
  }

  const user = await prisma.user.upsert({
    where: {
      email: adminEmail,
    },
    update: {
      role: Role.ADMIN,
    },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      firstName: "Admin",
      lastName: "User",
      role: Role.ADMIN,
    },
  });

  console.log(`User with email ${user.email} is now an admin.`);
}

/**
 * Check if the current user is an admin
 * @returns Promise<boolean>
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  return (
    (await prisma.user.count({
      where: {
        id: session.user.id,
        role: Role.ADMIN,
      },
    })) === 1
  );
}

/**
 * Check if a user is active
 * @param userId - The user ID to check
 * @returns boolean
 */
export async function isUserActive(userId: number): Promise<boolean> {
  return (
    (await prisma.user.count({
      where: {
        id: userId,
        isActive: true,
      },
    })) === 1
  );
}

/**
 * Get admin status for a user
 * @param userId - The user ID to check
 * @returns boolean
 */
export async function isUserAdmin(userId: number): Promise<boolean> {
  return (
    (await prisma.user.count({
      where: {
        id: userId,
        role: Role.ADMIN,
      },
    })) === 1
  );
}
