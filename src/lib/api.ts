import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { Prisma } from "@prisma/client";

/**
 * Error with an HTTP status and a message that is safe to show to the user.
 * Services throw these; route handlers turn them into JSON responses via `handle()`.
 */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (msg: string, code?: string) => new AppError(400, msg, code);
export const unauthorized = (msg = "Please sign in to continue") => new AppError(401, msg, "UNAUTHORIZED");
export const forbidden = (msg = "You don't have access to this") => new AppError(403, msg, "FORBIDDEN");
export const notFound = (msg = "Not found") => new AppError(404, msg, "NOT_FOUND");
export const conflict = (msg: string, code?: string) => new AppError(409, msg, code);
export const tooMany = (msg: string) => new AppError(429, msg, "RATE_LIMITED");

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

function toResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: error.issues[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
        issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 400 }
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "That value is already in use", code: "DUPLICATE" }, { status: 409 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }
  }
  console.error("[api] Unhandled error:", error);
  return NextResponse.json({ error: "Something went wrong. Please try again.", code: "INTERNAL" }, { status: 500 });
}

/** Wrap a route handler so thrown AppError / ZodError / known Prisma errors become JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      return toResponse(error);
    }
  };
}

/** Parse and validate a JSON request body. Throws ZodError / AppError on bad input. */
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
  return schema.parse(body);
}

/** Best-effort client IP for rate limiting (first hop of x-forwarded-for). */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
