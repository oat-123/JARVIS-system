import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { getSheetsService, getCombinedSheetData, getSystemConfig } from "@/lib/google-auth";

const DEFAULT_CEREMONY_ID = "1E0cu1J33gpRA-OHyNYL7tND30OoHBX4YpeoQ7JFUOaQ";

// The data processing logic can be kept as is
const processSheetData = (values: any[][]) => {
    if (!values || values.length < 2) return [];

    // Always map by index for maximum compatibility
    const data = [];
    for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (!row || row.length === 0) continue;
        const get = (j: number) => (j >= 0 && j < row.length ? row[j] : '');
        data.push({
            ลำดับ: get(0),
            ยศ: get(1),
            ชื่อ: get(2),
            สกุล: get(3),
            ชั้นปีที่: get(4),
            ตอน: get(5),
            ตำแหน่ง: get(6),
            สังกัด: get(7),
            เบอร์โทรศัพท์: get(8),
            ห้องนอน: get(9),
            กรุ๊ปเลือด: get(10),
            ชมรม: get(11),
            เกรดเฉลี่ย: get(12),
            สถิติโดนยอด: get(13) || '0',
        });
    }
    return data;
};

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    const user = session.username;
    const role = session.role;
    const db = session.db;

    if (!user || !role || !db) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const ceremonyId = await getSystemConfig("CEREMONY_SPREADSHEET_ID", DEFAULT_CEREMONY_ID);
        const sheets = await getSheetsService();
        let values: any[][] = [];
        let sheetNameForLog: string = "";

        if (role === 'admin' || role === 'oat' || role === 'ผู้ดูแลระบบ') {
            sheetNameForLog = "all_sheets";
            values = await getCombinedSheetData(ceremonyId);
        } else {
            const sheetName = db;
            sheetNameForLog = sheetName;
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: ceremonyId,
                range: `${sheetName}!A:N`,
            });
            values = response.data.values || [];
        }

        // If ?raw=1 is present, return all raw values for debugging
        const url = new URL(request.url);
        if (url.searchParams.get('raw') === '1') {
            return NextResponse.json({
                success: true,
                rawValues: values,
                timestamp: new Date().toISOString(),
                sheetName: sheetNameForLog,
                mode: 'production'
            });
        }

        const data = processSheetData(values);

        return NextResponse.json({
            success: true,
            data: data,
            timestamp: new Date().toISOString(),
            sheetName: sheetNameForLog,
            mode: 'production'
        });

    } catch (error) {
        console.error('Error fetching ceremony data from Google Sheets:', error);
        return NextResponse.json({ success: false, error: "Failed to fetch data" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    const user = session.username;

    if (!user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const ceremonyId = await getSystemConfig("CEREMONY_SPREADSHEET_ID", DEFAULT_CEREMONY_ID);
        const body = await request.json();
        const { selectedPersons, dutyName, sheetName } = body;
        const sheets = await getSheetsService();

        if (!sheetName || sheetName === 'all_sheets') {
            return NextResponse.json({ success: false, error: "A specific sheetName is required" }, { status: 400 });
        }

        const currentDataResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: ceremonyId,
            range: `${sheetName}!A:N`,
        });

        const currentValues = currentDataResponse.data.values || [];
        const updates: any[] = [];
        const statsColIndex = 13; // Column N

        for (let i = 1; i < currentValues.length; i++) {
            const row = currentValues[i];
            const personId = row[0];
            if (selectedPersons.includes(personId)) {
                const currentStats = (row[statsColIndex] || '0').replace(/^'/, '');
                const newStats = parseInt(currentStats, 10) + 1;
                updates.push({
                    range: `${sheetName}!N${i + 1}`,
                    values: [[newStats.toString()]],
                });
            }
        }

        if (updates.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: ceremonyId,
                requestBody: {
                    valueInputOption: 'RAW',
                    data: updates,
                },
            });
        }

        return NextResponse.json({ success: true, updatedCount: updates.length });
    } catch (error) {
        console.error('Error updating Google Sheets:', error);
        return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 });
    }
}