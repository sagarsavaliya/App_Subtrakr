import { NextResponse } from "next/server";

/** Permissive CORS for the /api/auth/* mobile-callable endpoints. These
 *  are also reachable identically via curl/native HTTP with no Origin
 *  header at all (CORS only gates browser-JS callers), and are already
 *  self-protected by their own rate-limiting/existence checks — so a
 *  wildcard origin here doesn't meaningfully change what's reachable,
 *  it just lets a browser-context caller (e.g. testing via Flutter's web
 *  target, or any future web client) actually read the response. */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function corsJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, { ...init, headers: CORS_HEADERS });
}

export function corsPreflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
