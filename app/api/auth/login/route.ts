// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { authenticateUserFromSheet } from "@/lib/google-auth";

export async function POST(req: NextRequest) {
  const { username, password, rememberMe } = await req.json();

  // Dynamically set session options based on "Remember Me"
  const dynamicSessionOptions = {
    ...sessionOptions,
    // Set ttl (server-side expiration) to 1 year if rememberMe is true, else 2 hours
    ttl: rememberMe ? 60 * 60 * 24 * 365 : 60 * 60 * 2,
    cookieOptions: {
      ...sessionOptions.cookieOptions,
      // Set maxAge (client-side cookie expiration) if rememberMe is true, otherwise it's a session cookie
      maxAge: rememberMe ? 60 * 60 * 24 * 365 : undefined, // 1 year
    },
  };

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, dynamicSessionOptions);

  console.log(`[API/auth/login] Login attempt for user: '${username}'`);

  try {
    const user = await authenticateUserFromSheet(username, password);

    if (user) {
      console.log(`[API/auth/login] SUCCESS: User '${username}' authenticated. Role: '${user.role}', DB: '${user.db}'`);
      session.username = user.username;
      session.role = user.role;
      session.db = user.db;
      await session.save();
      return NextResponse.json({ success: true, user: { username: user.username, role: user.role, db: user.db } });
    } else {
      console.log(`[API/auth/login] FAILED: Invalid credentials for user: '${username}'`);
      return NextResponse.json({ success: false, error: "Invalid username or password" }, { status: 401 });
    }
  } catch (error) {
    console.error("[API/auth/login] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, error: "Authentication service failed", details: errorMessage }, { status: 500 });
  }
}