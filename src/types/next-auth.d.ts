import "next-auth";
import { DefaultUser } from "next-auth";
import type { Role } from "../../prisma/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: User;
  }

  interface User extends Omit<DefaultUser, "id"> {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string | number;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
  }
}
