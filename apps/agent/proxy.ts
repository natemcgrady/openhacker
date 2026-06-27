import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, authEnabled, expectedToken } from "./agent/lib/auth";

export async function proxy(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const expected = await expectedToken();
  if (token && token === expected) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

// Protect the dashboard. Excludes Next internals, the login page, the eve agent
// routes (guarded by eve's own auth), and the API (guarded by a bearer token).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|eve|api).*)"],
};
