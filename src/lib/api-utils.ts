import { NextResponse } from "next/server";
import { ForbiddenError, UnauthorizedError } from "./auth";
import { ZodError } from "zod";

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof UnauthorizedError) return apiError("Please sign in.", 401);
  if (error instanceof ForbiddenError) return apiError("You don't have permission to do that.", 403);
  if (error instanceof ZodError) {
    return apiError(error.issues.map((i) => i.message).join(", "), 400);
  }
  if (error instanceof Error) {
    console.error(error);
    return apiError(error.message || "Something went wrong.", 400);
  }
  console.error(error);
  return apiError("Something went wrong.", 500);
}
