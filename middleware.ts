import { NextResponse, type NextRequest } from "next/server";
import { getAuthCookieName, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/agents",
  "/brand",
  "/uploads",
  "/favicon.ico"
];

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(getAuthCookieName())?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
