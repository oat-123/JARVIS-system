import { NextRequest, NextResponse } from "next/server"
import { getIronSession } from "iron-session"
import { cookies } from "next/headers"
import { sessionOptions } from "@/lib/session"
import { getSystemConfigs } from "@/lib/google-auth"

// Public-safe keys that any logged-in user can see
const PUBLIC_CONFIG_KEYS = [
    "CEREMONY_SPREADSHEET_ID",
    "DUTY_433_SPREADSHEET_ID",
    "WEEKLY_433_SPREADSHEET_ID",
    "NIGHT_DUTY_SPREADSHEET_ID",
    "WEEKEND_DUTY_SPREADSHEET_ID",
    "RELEASE_REPORT_SPREADSHEET_ID"
];

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const session = await getIronSession(cookieStore, sessionOptions as any);

        // Require session to see configs (even public ones)
        if (!(session as any).username) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const allConfigs = await getSystemConfigs();

        // Filter only public keys
        const publicConfigs: Record<string, string> = {};
        PUBLIC_CONFIG_KEYS.forEach(key => {
            if (allConfigs[key]) {
                publicConfigs[key] = allConfigs[key];
            }
        });

        return NextResponse.json({ success: true, configs: publicConfigs });
    } catch (error: any) {
        console.error("Error in public config API:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
