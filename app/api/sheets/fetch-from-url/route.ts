import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ success: false, error: "Missing URL" }, { status: 400 });
        }

        // Extract Spreadsheet ID
        const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!idMatch) {
            return NextResponse.json({ success: false, error: "Invalid Google Sheets URL" }, { status: 400 });
        }
        const spreadsheetId = idMatch[1];

        // Construct Export URL
        const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
        console.log(`[API] Fetching sheet from: ${exportUrl}`);

        const response = await fetch(exportUrl);

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                return NextResponse.json({ success: false, error: "Cannot access sheet. Please make sure the link is public (Anyone with the link can view)." }, { status: 403 });
            }
            return NextResponse.json({ success: false, error: `Failed to fetch sheet: ${response.statusText}` }, { status: response.status });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse Workbook
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        const sheetsData: { name: string; data: { index: number, cells: any[] }[] }[] = [];

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            // range: 3 means start from row 4 (0-indexed 3)
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 3, defval: "" }) as any[][];

            // START_ROW = 4 (Row 5) or User says Row 4 (Index 3). range: 3 = Row 4.
            // Map to add Original Row Index
            const rowsWithIndex = jsonData.map((cells, i) => ({
                index: 3 + i,
                cells: cells
            }));

            // Filter empty rows
            const cleanedData = rowsWithIndex.filter(row => row.cells.some((cell: any) => cell !== undefined && cell !== ""));

            sheetsData.push({
                name: sheetName,
                data: cleanedData
            });
        });

        return NextResponse.json({ success: true, sheets: sheetsData });

    } catch (error) {
        console.error("[API] Error fetching sheet:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
