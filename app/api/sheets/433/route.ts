import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { getSheetsService, getCombinedSheetData } from "@/lib/google-auth";

const SPREADSHEET_ID_433 = "1E0cu1J33gpRA-OHyNYL7tND30OoHBX4YpeoQ7JFUOaQ";

function safeParseDateCell(cell: string | undefined): string | null {
    if (!cell) return null;
    const trimmed = cell.toString().trim();
    const tokens = trimmed.split(/\s+/);
    const kept: string[] = [];
    for (const t of tokens) {
        if (/^[\u0E00-\u0E7F0-9.\/:-]+$/.test(t) || /[\u0E00-\u0E7F]/.test(t)) {
            kept.push(t);
        } else {
            break;
        }
    }
    return kept.length ? kept.join(' ') : trimmed;
}

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    const user = session.username;
    const role = session.role;

    if (!user || !role) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const sheets = await getSheetsService();
        let values: any[][] = [];

        if (role.toLowerCase() === 'admin' || role.toLowerCase() === 'oat') {
            console.log(`[API/433] Admin user '${user}' fetching combined data.`);
            values = await getCombinedSheetData(SPREADSHEET_ID_433);
        } else {
            // If role is not a valid sheet, fallback to 'รวม'
            const sheetName = role && typeof role === 'string' ? role : 'รวม';
            // If sheetName is 'Admin' or 'admin', fallback to 'รวม'
            const validSheetName = (sheetName.toLowerCase() === 'admin' || sheetName.toLowerCase() === 'oat') ? 'รวม' : sheetName;
            console.log(`[API/433] User '${user}' fetching data from sheet: ${validSheetName}`);
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID_433,
                range: `${validSheetName}!A:AB`,
            });
            values = response.data.values || [];
        }

        if (values.length === 0) {
            return NextResponse.json({ success: true, data: { totals: {}, topReporters: [], topByReportPerson: [], topBy433Person: [], topByAdminPerson: [], people: [] }, message: 'empty' });
        }

        const headers = values[0].map((h: any) => (h || '').toString().trim());
        const idxOf = (name: string) => headers.findIndex(h => h.includes(name));

        const idxOrder = idxOf('ลำดับ') >= 0 ? idxOf('ลำดับ') : 0;
        const idxRank = idxOf('ยศ') >= 0 ? idxOf('ยศ') : 1;
        const idxFirstName = idxOf('ชื่อ') >= 0 ? idxOf('ชื่อ') : 2;
        const idxLastName = idxOf('สกุล') >= 0 ? idxOf('สกุล') : 3;
        const idxYear = idxOf('ชั้นปีที่') >= 0 ? idxOf('ชั้นปีที่') : 4;
        const idxClass = idxOf('ตอน') >= 0 ? idxOf('ตอน') : 5;
        const idxPosition = idxOf('ตำแหน่ง') >= 0 ? idxOf('ตำแหน่ง') : 6;
        const idxUnit = idxOf('สังกัด') >= 0 ? idxOf('สังกัด') : 7;
        const idxPhone = idxOf('เบอร์โทรศัพท์') >= 0 ? idxOf('เบอร์โทรศัพท์') : 8;
        const idxReport = idxOf('ถวายรายงาน');
        const idxDutyOfficer = idxOf('น.กำกับยาม');
        const idxDate = idxOf('วันที่');
        const idxGrade = idxOf('คัดเกรด');
        const idxAdminField = idxOf('ธุรการ ฝอ.') >= 0 ? idxOf('ธุรการ ฝอ.') : idxOf('ธุรการ');
        const idxTua = idxOf('ตัวชน');
        const idxHeight = idxOf('ส่วนสูง');
        const idxSport = idxOf('นักกีฬา');
        const idxOtherMission = idxOf('ภารกิจอื่น ๆ');
        const idxOverseasWork = idxOf('ดูงานต่างประเทศ');
        const idxMedicalCert = idxOf('เจ็บ (ใบรับรองแพทย์)');
        const idxNote = idxOf('หมายเหตุ');

        const idx433Cols: number[] = [];
        headers.forEach((header, index) => {
            if (header && header.toString().trim().match(/^433\s*ครั้งที่\s*\d+$/)) {
                idx433Cols.push(index);
            }
        });

        const idxAdminCols: number[] = [];
        headers.forEach((header, index) => {
            if (header && header.toString().trim().match(/^ธุรการ\s*ครั้งที่\s*\d+$/)) {
                idxAdminCols.push(index);
            }
        });

        const people: any[] = [];
        for (let i = 1; i < values.length; i++) {
            const row = values[i];
            if (!row || row.length === 0 || !row[idxFirstName]) continue;
            const get = (j: number) => (j >= 0 && j < row.length ? row[j] : '');
            const person = {
                ลำดับ: get(idxOrder),
                ยศ: get(idxRank),
                ชื่อ: get(idxFirstName),
                สกุล: get(idxLastName),
                ชั้นปีที่: get(idxYear),
                ตอน: get(idxClass),
                ตำแหน่ง: get(idxPosition),
                สังกัด: get(idxUnit),
                เบอร์โทรศัพท์: get(idxPhone),
                คัดเกรด: get(idxGrade),
                "ธุรการ ฝอ.": get(idxAdminField),
                ตัวชน: get(idxTua),
                ส่วนสูง: get(idxHeight),
                นักกีฬา: get(idxSport),
                "ภารกิจอื่น ๆ": get(idxOtherMission),
                "ดูงานต่างประเทศ": get(idxOverseasWork),
                "เจ็บ (ใบรับรองแพทย์)": get(idxMedicalCert),
                หมายเหตุ: get(idxNote),
                ถวายรายงาน: get(idxReport),
                "น.กำกับยาม": get(idxDutyOfficer),
                "วันที่": get(idxDate),
                _433_dates: idx433Cols.map(c => safeParseDateCell(get(c))),
                _admin_dates: idxAdminCols.map(c => safeParseDateCell(get(c))),
                _433_columns: idx433Cols.map((c, index) => ({
                    column: headers[c] || `433 ครั้งที่ ${index + 1}`,
                    value: get(c)
                })),
                _admin_columns: idxAdminCols.map((c, index) => ({
                    column: headers[c] || `ธุรการ ครั้งที่ ${index + 1}`,
                    value: get(c)
                }))
            };
            people.push(person);
        }

        let countReport = 0, count433 = 0, countAdmin = 0, countNever = 0;
        const reportCounts: Record<string, number> = {};
        people.forEach(p => {
            const reportCell = (p.ถวายรายงาน || '').toString();
            const hasReport = !!(reportCell && reportCell.toString().trim());
            const has433 = p._433_columns && p._433_columns.some((col: any) => col.value && col.value.toString().trim() && col.value !== '-');
            const hasAdmin = p._admin_columns && p._admin_columns.some((col: any) => col.value && col.value.toString().trim() && col.value !== '-');
            if (hasReport) countReport++;
            if (has433) count433++;
            if (hasAdmin) countAdmin++;
            if (!hasReport && !has433 && !hasAdmin) countNever++;
            if (hasReport) {
                const tokens = reportCell.toString().split(/[\s,;\/]+/).map((t: string) => t.trim()).filter(Boolean);
                tokens.forEach((tok: string) => {
                    reportCounts[tok] = (reportCounts[tok] || 0) + 1;
                });
            }
        });

        const topReporters = Object.entries(reportCounts).map(([k, v]) => ({ name: k, count: v })).sort((a, b) => b.count - a.count);
        const personStats = people.map((p: any) => {
            const reportDates = (p.ถวายรายงาน || '').toString() ? 1 : 0;
            const num433 = p._433_columns ? p._433_columns.filter((col: any) => col.value && col.value.toString().trim() && col.value !== '-').length : 0;
            const numAdmin = p._admin_columns ? p._admin_columns.filter((col: any) => col.value && col.value.toString().trim() && col.value !== '-').length : 0;
            return {
                fullName: `${p.ยศ || ''} ${p.ชื่อ || ''} ${p.สกุล || ''}`.trim(),
                report: reportDates,
                _433: num433,
                admin: numAdmin,
            };
        });

        const topByReportPerson = [...personStats].sort((a, b) => b.report - a.report).slice(0, 5);
        const topBy433Person = [...personStats].sort((a, b) => b._433 - a._433).slice(0, 5);
        const topByAdminPerson = [...personStats].sort((a, b) => b.admin - a.admin).slice(0, 5);

        const responseData = {
            totals: { report: countReport, duty433: count433, admin: countAdmin, never: countNever },
            topReporters,
            topByReportPerson,
            topBy433Person,
            topByAdminPerson,
            people,
            metadata: {
                detected_433_columns: idx433Cols.map(c => headers[c] || `Column ${c}`),
                detected_admin_columns: idxAdminCols.map(c => headers[c] || `Column ${c}`),
                total_433_columns: idx433Cols.length,
                total_admin_columns: idxAdminCols.length,
                all_headers: headers
            }
        };

        return NextResponse.json({ success: true, data: responseData });

    } catch (error) {
        console.error('Error in 433 API:', error);
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'unknown' }, { status: 500 });
    }
}
