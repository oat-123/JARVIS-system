// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { authenticateUserFromSheet } from "@/lib/google-auth";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  const { username, password } = await req.json();

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