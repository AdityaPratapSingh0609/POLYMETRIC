import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError, handleApiError } from "@/lib/api-utils";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, signSession } from "@/lib/session";
import { loginSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.active) {
      return apiError("Incorrect username or password.", 401);
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return apiError("Incorrect username or password.", 401);
    }

    const token = await signSession({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role as "ADMIN" | "SUPERVISOR" | "OPERATOR",
    });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return NextResponse.json({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role as "ADMIN" | "SUPERVISOR" | "OPERATOR",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
