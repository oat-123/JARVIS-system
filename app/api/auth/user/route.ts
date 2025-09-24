// app/api/auth/user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (session.username && session.role && session.db) {
    return NextResponse.json({ success: true, user: { username: session.username, role: session.role, db: session.db } });
  } else {
    return NextResponse.json({ success: false, user: null });
  }
}