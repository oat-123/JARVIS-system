
import { NextResponse } from 'next/server';
import { getSheetsService, getSystemConfig } from '@/lib/google-auth';
import { rateLimitedSheetsOperation } from '@/lib/rate-limiter';

export const runtime = 'nodejs';
// This endpoint is designed to fetch data from a specific public Google Sheet.
// It's configured for the "Ceremony Duty Grade" feature.

const DEFAULT_GRADE_ID = '1E0cu1J33gpRA-OHyNYL7tND30OoHBX4YpeoQ7JFUOaQ';
const GID = '0';

// Helper function to convert an array of arrays to an array of objects
const arrayToObject = (data: any[][]): Record<string, any>[] => {
  if (!data || data.length < 2) {
    return [];
  }
  const headers = data[0];
  const rows = data.slice(1);

  return rows.map(row => {
    const obj: Record<string, any> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
};

export async function GET() {
  try {
    const spreadsheetIdInput = await getSystemConfig("DUTY_433_SPREADSHEET_ID", DEFAULT_GRADE_ID);
    const sheets = await getSheetsService();

    // First, get spreadsheet metadata to find the sheet name for GID 0
    const spreadsheetMeta = await rateLimitedSheetsOperation(() =>
      sheets.spreadsheets.get({
        spreadsheetId: spreadsheetIdInput,
      })
    );

    const sheet = spreadsheetMeta.data.sheets?.find(
      (s) => s.properties?.sheetId === parseInt(GID, 10)
    );

    if (!sheet || !sheet.properties?.title) {
      throw new Error(`Sheet with GID ${GID} not found.`);
    }

    const sheetName = sheet.properties.title;

    // Now, fetch the actual data from that sheet with rate limiting
    const response = await rateLimitedSheetsOperation(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetIdInput,
        range: sheetName, // Use the dynamically found sheet name
      })
    );

    const values = response.data.values;
    if (!values) {
      return NextResponse.json({ success: true, data: [] });
    }

    const jsonData = arrayToObject(values);

    return NextResponse.json({ success: true, data: jsonData });

  } catch (error: any) {
    console.error('[API/sheets/grade-data] ERROR:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown server error' },
      { status: 500 }
    );
  }
}
