import { NextRequest, NextResponse } from 'next/server';
import { getSheetsService } from '@/lib/google-auth';

export async function POST(req: NextRequest) {
    try {
        const { url, sheetName } = await req.json();

        if (!url || !sheetName) {
            return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
        }

        const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!idMatch) {
            return NextResponse.json({ success: false, error: "Invalid Google Sheets URL" }, { status: 400 });
        }
        const spreadsheetId = idMatch[1];

        const sheets = await getSheetsService();
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);

        if (!sheet || sheet.properties?.sheetId === undefined) {
            return NextResponse.json({ success: false, error: "Sheet not found" }, { status: 404 });
        }
        const sheetId = sheet.properties.sheetId;

        // Request to clear formatting in Column D (Index 3)
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startColumnIndex: 3,
                                endColumnIndex: 4
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: {
                                        red: 1, green: 1, blue: 1 // Write white? Or nothing?
                                        // Actually better to clear the format but fields requires defining what to keep.
                                        // If we use updateCells without fields it clears? No.
                                        // Let's use standard clear formatting logic.
                                    }
                                }
                            },
                            fields: "userEnteredFormat.backgroundColor" // Reset background
                        }
                    }
                ]
            }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("[API] Error resetting formatting:", error);
        return NextResponse.json({ success: false, error: "Failed to reset" }, { status: 500 });
    }
}
