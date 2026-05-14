"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, getAuthCookieName, verifyPassword } from "@/lib/auth";

export async function login(formData: FormData) {
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");

  if (!verifyPassword(password)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(getAuthCookieName(), await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(getAuthCookieName());
  redirect("/login");
}
