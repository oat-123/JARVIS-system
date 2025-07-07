import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Define the credentials interface
interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// You need to replace this with your actual credentials
const credentials: ServiceAccountCredentials = {
  type: process.env.GOOGLE_TYPE || '',
  project_id: process.env.GOOGLE_PROJECT_ID || '',
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID || '',
  private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLIENT_EMAIL || '',
  client_id: process.env.GOOGLE_CLIENT_ID || '',
  auth_uri: process.env.GOOGLE_AUTH_URI || '',
  token_uri: process.env.GOOGLE_TOKEN_URI || '',
  auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL || '',
  client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL || '',
};

// Initialize Google Auth
const auth = new google.auth.JWT(
  credentials.client_email,
  undefined,
  credentials.private_key,
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

// ✅ Define new request body interface for processed data
interface SheetData {
  fullNames: string[];
  weight: number;
}

interface RequestBody {
  processedSheets: Record<string, SheetData>;
  sheetName: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { processedSheets, sheetName } = body as RequestBody;

    // Validate
    if (!processedSheets || !sheetName) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    console.log('ProcessedSheets:', processedSheets);

    // ✅ 1. ดึงข้อมูล Google Sheet
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) return NextResponse.json({ success: false, error: 'No spreadsheet ID' }, { status: 500 });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:N`,
    });
    const values = response.data.values || [];
    const rows = values.slice(1);

    // ✅ 2. สร้างชื่อเต็มใน Google Sheet (เหมือน Python)
    const fullNamesInSheet = rows.map(row =>
      ((row[2] || '').toString().trim() + ' ' + (row[3] || '').toString().trim()).trim()
    );

    console.log('FullNamesInSheet sample:', fullNamesInSheet.slice(0, 5));

    // ✅ 3. รวมแต้ม
    const updatedDetails: { fullName: string, oldStat: number, newStat: number }[] = [];
    const updatedStats = rows.map((row, i) => {
      let stat = parseInt(row[13] || '0', 10) || 0; // คอลัมน์ N (index 13)
      const oldStat = stat;
      const fullName = fullNamesInSheet[i];
      let updated = false;
      for (const sheet of Object.keys(processedSheets)) {
        if (processedSheets[sheet].fullNames.includes(fullName)) {
          stat += processedSheets[sheet].weight;
          updated = true;
        }
      }
      if (updated && stat !== oldStat) {
        updatedDetails.push({ fullName, oldStat, newStat: stat });
      }
      return stat;
    });
    console.log('UpdatedStats:', updatedStats);

    // ✅ 4. อัปเดตคอลัมน์ N เท่านั้น
    const updateRange = `${sheetName}!N2:N${rows.length + 1}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: 'RAW',
      requestBody: { values: updatedStats.map(val => [val.toString()]) },
    });
    console.log('Update success:', updateRange);

    return NextResponse.json({ success: true, updated: updatedStats.length, updatedDetails });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get('sheetName');
    
    if (!sheetName) {
      return NextResponse.json({ success: false, error: 'Missing sheetName' }, { status: 400 });
    }
    
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) return NextResponse.json({ success: false, error: 'No spreadsheet ID' }, { status: 500 });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:N`,
    });
    
    const values = response.data.values || [];
    const rows = values.slice(1);
    
    // ✅ ใช้ index 2,3 สำหรับชื่อ-สกุล เสมอ (เหมือน Python)
    const fullNamesInSheet = rows.map(row =>
      ((row[2] || '').toString().trim() + ' ' + (row[3] || '').toString().trim()).trim()
    ).filter(name => name.length > 0);
    
    console.log('GET - FullNamesInSheet sample:', fullNamesInSheet.slice(0, 5));
    
    return NextResponse.json({ 
      success: true, 
      fullNamesInSheet,
      totalNames: fullNamesInSheet.length
    });
  } catch (error) {
    console.error('GET API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}