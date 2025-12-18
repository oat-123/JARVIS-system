import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { getSystemConfigs, updateSystemConfig } from "@/lib/google-auth";

export async function GET() {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    const role = session.role?.toLowerCase() || "";
    if (role !== "admin" && role !== "oat" && session.role !== "ผู้ดูแลระบบ") {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const configs = await getSystemConfigs();
        const envInfo = {
            clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
            projectId: process.env.GOOGLE_PROJECT_ID,
            adminSpreadsheetId: "1-NsKFnSosQUzSY3ReFjeoH2nZ2S-1UMDlT-SAWILMSw",
            nodeEnv: process.env.NODE_ENV,
        };
        return NextResponse.json({ success: true, configs, envInfo });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to fetch configs" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    const role = session.role?.toLowerCase() || "";
    if (role !== "admin" && role !== "oat" && session.role !== "ผู้ดูแลระบบ") {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { key, value } = await req.json();
        if (!key) {
            return NextResponse.json({ success: false, error: "Key is required" }, { status: 400 });
        }

        const success = await updateSystemConfig(key, value);
        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, error: "Failed to update config" }, { status: 500 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }
}
