import { NextRequest, NextResponse } from 'next/server';
import { getSheetsService } from '@/lib/google-auth';

export async function POST(req: NextRequest) {
    try {
        const { url, sheetName, updates } = await req.json();

        if (!url || !sheetName || !updates || !Array.isArray(updates)) {
            return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
        }

        if (updates.length === 0) {
            return NextResponse.json({ success: true, message: "No updates needed" });
        }

        const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!idMatch) {
            return NextResponse.json({ success: false, error: "Invalid Google Sheets URL" }, { status: 400 });
        }
        const spreadsheetId = idMatch[1];

        const sheets = await getSheetsService();
        // Verify sheet exists
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);

        if (!sheet) {
            return NextResponse.json({ success: false, error: "Sheet not found" }, { status: 404 });
        }

        // updates: { rowIndex: number, values: { [colIndex: number]: string } }[]
        // We will use batchUpdate with updateCells for efficiency or value ranges.
        // Since we are updating specific cells in potentially non-contiguous rows, 'batchUpdate' with multiple requests is expensive if too many.
        // 'values.batchUpdate' allows multiple ranges.

        const data = updates.map((u: any) => {
            // u.values is object { colIndex: value }
            // We need to construct value ranges.
            // But if we have multiple columns per row, we can group them? 
            // Or simple: 1 range per row?
            // Let's assume updates are per row. 
            // We can just construct A1 notation? Or R1C1?
            // Let's use A1 notation. 
            // Columns:
            // A=0, B=1, ...
            // We know standard columns: B:Rank(1), E:Year(4), F:Ton(5), G:Pos(6), H:Affil(7), I:Phone(8)
            // We can just update the whole row range B:I if needed?
            // Or specifically update cells.

            // Let's optimize: Group by Row.
            // For each updated row, we construct a ValueRange.
            // If we update B, E, F, G, H, I -> discontinuous.
            // We might need separate ranges for B and E-I?
            // Let's easier: just use individual writes?
            // No, batchUpdate with `updateCells` is better for sparse updates.
            return u;
        });

        const requests: any[] = [];

        updates.forEach((u: any) => {
            // u.rowIndex is 0-based.
            // u.values is { columnIndex: value }
            Object.keys(u.values).forEach(colKey => {
                const colIndex = parseInt(colKey);
                const value = u.values[colKey];

                requests.push({
                    updateCells: {
                        range: {
                            sheetId: sheet.properties!.sheetId,
                            startRowIndex: u.rowIndex,
                            endRowIndex: u.rowIndex + 1,
                            startColumnIndex: colIndex,
                            endColumnIndex: colIndex + 1
                        },
                        rows: [
                            {
                                values: [
                                    { userEnteredValue: { stringValue: String(value) } }
                                ]
                            }
                        ],
                        fields: "userEnteredValue"
                    }
                });
            });
        });

        // Google API Batch Limit? 
        // If requests > 1000? Not usually a problem for 100 people.
        if (requests.length > 5000) {
            // chunk logic if needed, but for now assuming typical usage (100 rows * 6 cols = 600 requests).
            // It's fine.
        }

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests
            }
        });

        return NextResponse.json({ success: true, count: updates.length });

    } catch (error: any) {
        console.error("[API] Error updating sheet:", error);
        if (error.code === 403) {
            return NextResponse.json({ success: false, error: "Permission denied. Check Service Account access." }, { status: 403 });
        }
        return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 });
    }
}
