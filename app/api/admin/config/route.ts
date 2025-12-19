import { NextRequest, NextResponse } from "next/server";
import { getSystemConfigs, updateSystemConfig, logToSheet } from "@/lib/google-auth";
import { getSessionAndValidate } from "@/lib/auth-utils";

export async function GET() {
    const { errorResponse } = await getSessionAndValidate(["admin", "oat", "ผู้ดูแลระบบ"]);
    if (errorResponse) return errorResponse;

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
    const { errorResponse } = await getSessionAndValidate(["admin", "oat", "ผู้ดูแลระบบ"]);
    if (errorResponse) return errorResponse;

    try {
        const { session } = await getSessionAndValidate();
        const { key, value } = await req.json();
        if (!key) {
            return NextResponse.json({ success: false, error: "Key is required" }, { status: 400 });
        }

        const success = await updateSystemConfig(key, value);
        if (success) {
            await logToSheet("CONFIG_UPDATE", session.username || "unknown", `Updated ${key} to ${value}`);
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, error: "Failed to update config" }, { status: 500 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }
}
