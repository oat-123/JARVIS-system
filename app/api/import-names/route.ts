import { NextResponse } from 'next/server'
import { getSheetsService } from '@/lib/google-auth'

// POST { date, sheetName }
export async function POST(req: Request) {
  console.log('--- IMPORT NAMES API START ---');
  try {
    const { sheetName } = await req.json();
    console.log('Request Body:', { sheetName });

    if (!sheetName) {
      console.error('Error: sheetName is required.');
      return NextResponse.json({ error: 'sheetName is required' }, { status: 400 });
    }

    const sheets = await getSheetsService();
    const spreadsheetId = '1TwqqgEhug2_oe2iIPlR9q-1pGuGIqMGswtPEnLzzcSk';

    console.log(`Fetching sheet: '${sheetName}' from spreadsheet: ${spreadsheetId}`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName, // Fetch the entire sheet by its name
    });

    const rows = response.data.values;

    // Header is on row 2, data starts from row 3. Need at least 2 rows.
    if (!rows || rows.length < 2) {
      console.log('No data or not enough rows for the new structure.');
      return NextResponse.json({ names: [] });
    }

    console.log(`Found ${rows.length} rows in sheet.`);
    
    const names: any[] = []
    const header = rows[1] || [] // Header is now on the 2nd row (index 1)
    console.log('Sheet Header (Row 2):', header);

    // Extract headers for additional columns E-M (indices 4 to 12)
    const additionalHeaders = header.slice(4, 13);

    const findIdx = (candidates: string[]) => {
      for (let i = 0; i < header.length; i++) {
        const h = (header[i] || '').toString().trim()
        for (const c of candidates) if (h === c) return i
      }
      for (let i = 0; i < header.length; i++) {
        const h = (header[i] || '').toString().trim().toLowerCase()
        for (const c of candidates) if (h.includes(c.replace(/\s+/g,'').toLowerCase())) return i
      }
      return -1
    }

    let idxTitle = findIdx(['ยศ','title'])
    let idxFirst = findIdx(['ชื่อ'])
    let idxLast = findIdx(['สกุล'])
    let idxPos = findIdx(['ตำแหน่ง ทกท.','ตำแหน่ง','position'])
    let idxPartner = findIdx(['คู่พี่นายทหาร','คู่พี่นาย','คู่พี่','partner'])
    let idxShift = findIdx(['ผลัด','ผัด','shift'])
    let idxNote = findIdx(['หมายเหตุ','note'])

    console.log('Column Indexes:', { idxTitle, idxFirst, idxLast, idxPos, idxPartner, idxShift, idxNote });

    const norm = (s:string) => s.toString().normalize('NFKD').replace(/\s+/g, '').toLowerCase()
    // Start from row 3 (index 2) to skip header
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i]
      if (!r || r.length === 0 || r.every(cell => !cell)) continue // Skip empty rows

      const title = (idxTitle >= 0 ? r[idxTitle] : '').toString().trim()
      const first = (idxFirst >= 0 ? r[idxFirst] : '').toString().trim()
      const last = (idxLast >= 0 ? r[idxLast] : '').toString().trim()

      if (!first && !last) continue;

      const position = idxPos >= 0 ? (r[idxPos] || '').toString().trim() : ''
      const partner = idxPartner >= 0 ? (r[idxPartner] || '').toString().trim() : ''
      const shift = idxShift >= 0 ? (r[idxShift] || '').toString().trim() : ''
      const note = idxNote >= 0 ? (r[idxNote] || '').toString().trim() : ''
      const full = `${title} ${first} ${last}`.trim()

      // Extract additional data from columns E-M (4-12)
      const additionalData: { [key: string]: string } = {};
      for (let j = 4; j <= 12; j++) {
        const headerName = header[j];
        if (headerName) {
          additionalData[headerName] = (r[j] || '').toString().trim();
        }
      }

      names.push({ title, first, last, full, position, partner, shift, note, additionalData, fullNorm: norm(full) })
    }

    console.log(`Successfully parsed ${names.length} names.`);
    console.log('--- IMPORT NAMES API END ---');
    return NextResponse.json({ names, additionalHeaders })

  } catch (e: any) {
    console.error('--- IMPORT NAMES API ERROR ---');
    if (e.code === 404) {
      console.error('Sheet not found. Ensure the sheetName is correct and the service account has access.');
    } else if (e.code === 403) {
      console.error('Permission denied. Ensure the service account email has been added to the Google Sheet with at least Viewer permissions.');
    }
    console.error(e);
    return NextResponse.json({ names: [], error: e.message || 'An unknown error occurred.' }, { status: 500 })
  }
}
