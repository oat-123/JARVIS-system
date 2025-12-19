import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { getSheetsService } from "@/lib/google-auth";

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    const role = session.role?.toLowerCase() || "";
    if (role !== "admin" && role !== "oat" && session.role !== "ผู้ดูแลระบบ") {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const spreadsheetId = searchParams.get("spreadsheetId");
    const sheetName = searchParams.get("sheetName");

    if (!spreadsheetId) {
        return NextResponse.json({ success: false, error: "Spreadsheet ID is required" }, { status: 400 });
    }

    try {
        const sheets = await getSheetsService();
        // Get client email for debugging if needed
        const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

        // If no sheetName, return list of sheets
        if (!sheetName) {
            console.log(`[API/admin/database] Fetching sheets for ID: ${spreadsheetId}`);
            const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
            const sheetList = spreadsheet.data.sheets?.map(s => ({
                title: s.properties?.title,
                index: s.properties?.index,
                sheetId: s.properties?.sheetId,
            })) || [];
            return NextResponse.json({ success: true, sheets: sheetList });
        }

        // If sheetName provided, return sheet data
        console.log(`[API/admin/database] Fetching data for ID: ${spreadsheetId}, Sheet: ${sheetName}`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:Z`,
        });

        return NextResponse.json({ success: true, values: response.data.values || [] });
    } catch (error: any) {
        console.error("[API/admin/database] Error detail:", error);

        // Handle specific 403 error to be more helpful
        if (error.status === 403) {
            return NextResponse.json({
                success: false,
                error: "ไม่มีสิทธิ์เข้าถึงไฟล์นี้ (403 Forbidden)",
                details: `กรุณาแชร์ไฟล์ Google Sheet นี้ให้แก่ Service Account: ${process.env.GOOGLE_CLIENT_EMAIL}`,
                spreadsheetId
            }, { status: 403 });
        }

        return NextResponse.json({
            success: false,
            error: "เกิดข้อผิดพลาดในการดึงข้อมูลฐานข้อมูล",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
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
        const { spreadsheetId, sheetName, values } = await req.json();

        if (!spreadsheetId || !sheetName || !values) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        const sheets = await getSheetsService();

        // Update the entire sheet with new values
        // We use RAW value input option to avoid automatic formatting issues
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: "RAW",
            requestBody: {
                values,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[API/admin/database] Update Error:", error);
        return NextResponse.json({ success: false, error: "Failed to update database" }, { status: 500 });
    }
}
