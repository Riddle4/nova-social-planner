import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionToken, getAuthCookieName, verifyPassword } from "@/lib/auth";

function safeNextUrl(value: FormDataEntryValue | null) {
  const next = String(value || "/dashboard");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") || "");
  const next = safeNextUrl(formData.get("next"));

  if (!verifyPassword(password)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  const cookieStore = await cookies();
  cookieStore.set(getAuthCookieName(), await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return NextResponse.redirect(new URL(next, request.url));
}
