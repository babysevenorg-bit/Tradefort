import { NextResponse } from "next/server";
import { UnauthorizedError } from "./auth";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function handle<T>(fn: () => Promise<T>): Promise<Response> {
  try {
    const data = await fn();
    // If a handler already returned a fully-formed Response (e.g. fail(...)),
    // pass it through unchanged — otherwise it gets re-wrapped as 200 {} and
    // every error path (401/402/404/400) silently degrades to a 200 empty body.
    if (data instanceof Response) return data;
    return ok(data);
  } catch (e) {
    if (e instanceof UnauthorizedError) return fail("Not signed in", 401);
    const message = e instanceof Error ? e.message : "Unexpected error";
    console.error("[api]", message);
    return fail(message, 400);
  }
}

export const n = (v: unknown) => Number(v ?? 0);
