import { NextRequest, NextResponse } from 'next/server';
import { findFolderByName, findWordFileByName, getDownloadLink, getDriveService } from '@/lib/google-auth';

export const runtime = 'nodejs';

// โฟลเดอร์ root ของ Drive (ค่าเริ่มต้น)
const DRIVE_ROOT_ID = '1yNdCSMtz0vE4b4Kugap5JPHH86r7zyp_';

export async function POST(req: NextRequest) {
  try {
    const { personName, folderName, rootFolderId } = await req.json();
    console.log('--- [API/drive-link] เริ่มค้นหา ---');
    console.log('รับข้อมูล:', { personName, folderName, rootFolderId });

    if (!personName || !folderName) {
      console.log('❌ ขาดข้อมูล personName หรือ folderName');
      return NextResponse.json({ success: false, error: 'Missing personName or folderName' }, { status: 400 });
    }

    // 1. หาโฟลเดอร์ตามชื่อที่ import มาจากชีท (เช่น "นนร.หน.พัน.2 กรม นนร.รอ. สุวิช รุ่มรวย")
    const ROOT_ID = rootFolderId || DRIVE_ROOT_ID;
    console.log('[drive-link] ROOT_ID =', ROOT_ID);
    console.log('[drive-link] ค้นหาโฟลเดอร์บุคคล:', folderName);
    const personFolder = await findFolderByName(ROOT_ID, folderName);
    if (!personFolder) {
      console.log('❌ ไม่พบโฟลเดอร์บุคคล:', folderName);
      return NextResponse.json({ success: false, error: `ไม่พบโฟลเดอร์บุคคล: ${folderName}` });
    }
    console.log('✅ เจอโฟลเดอร์บุคคล:', personFolder);

    // 2. หาโฟลเดอร์ย่อยที่มีคำว่า "ฉก." แบบ fuzzy (เช่น "1.ประวัติ ฉก. 2 หน้า")
    const drive = await getDriveService();
    const list = await drive.files.list({
      q: `mimeType = 'application/vnd.google-apps.folder' and '${personFolder.id}' in parents and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1000,
    });
    const subfolders = list.data.files || [];
    console.log(`[drive-link] พบโฟลเดอร์ย่อยทั้งหมด ${subfolders.length} รายการ ใน "${personFolder.name}"`);
    subfolders.forEach((sf) => console.log(' - subfolder:', sf.name, sf.id));
    const normalize = (s: string) => (s || '').replace(/\s+/g, '').toLowerCase();
    const scoreSub = (name: string) => {
      const n = normalize(name);
      let score = 0;
      if (n.includes('ฉก')) score += 80; // ต้องมีคำว่า ฉก เป็นหลัก
      if (n.includes('ประวัติ')) score += 15;
      if (n.includes('2') && n.includes('หน้า')) score += 5;
      return score;
    };
    const ranked = subfolders
      .map(f => ({ f, score: scoreSub(f.name || '') }))
      .sort((a, b) => b.score - a.score);
    console.log('[drive-link] จัดอันดับโฟลเดอร์ย่อย (top 10):')
    ranked.slice(0, 10).forEach((r, idx) => console.log(` ${idx+1}. [${r.score}]`, r.f.name, r.f.id))
    const picked = ranked.length && ranked[0].score >= 50 ? ranked[0].f : null;
    const subFolder = picked;
    if (!subFolder) {
      console.log('❌ ไม่พบโฟลเดอร์ย่อยที่มีคำว่า "ฉก." ใน', personFolder.name);
      return NextResponse.json({ success: false, error: `ไม่พบโฟลเดอร์ย่อยที่มีคำว่า "ฉก." ใน: ${personFolder.name}` });
    }
    console.log('✅ เจอโฟลเดอร์ย่อย "ฉก.":', subFolder);

    // 3. หาไฟล์ Word ที่ชื่อใกล้เคียงกับ personName
    console.log('[drive-link] ค้นหาไฟล์ Word ตามชื่อ:', personName);
    const wordFile = await findWordFileByName(subFolder.id, personName);
    // log all word files found for transparency
    try {
      const listWord = await (await getDriveService()).files.list({
        q: `('${subFolder.id}' in parents) and trashed = false and (mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType = 'application/msword')`,
        fields: 'files(id, name)',
        pageSize: 200,
      });
      const files = listWord.data.files || []
      console.log(`[drive-link] ไฟล์ Word ทั้งหมดใน "${subFolder.name}" (${files.length})`)
      files.forEach((f, i) => console.log(`  - ${i+1}.`, f.name, f.id))
    } catch (e) {
      console.log('[drive-link] ไม่สามารถดึงรายการไฟล์เพื่อ log ได้:', e instanceof Error ? e.message : e)
    }
    if (!wordFile) {
      // ดึงรายการไฟล์ทั้งหมดเพื่อ log ช่วยดีบัก
      const fileList = await (await getDriveService()).files.list({
        q: `('${subFolder.id}' in parents) and trashed = false and (mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType = 'application/msword')`,
        fields: 'files(id, name)',
        pageSize: 100,
      });
      const names = (fileList.data.files || []).map(f => f.name).join(', ');
      console.log('❌ ไม่พบไฟล์ Word ที่ตรงกับชื่อ:', personName, 'ใน', subFolder.name);
      console.log('[drive-link] ไฟล์ที่พบในโฟลเดอร์นี้:', names || '(ไม่มีไฟล์ word)');
      return NextResponse.json({ success: false, error: `ไม่พบไฟล์: ${personName}` });
    }
    console.log('✅ เจอไฟล์ Word:', wordFile);

    // 4. สร้างลิงก์ดาวน์โหลด
    const link = getDownloadLink(wordFile);
    if (!link) {
      console.log('❌ ไม่สามารถสร้างลิงก์ดาวน์โหลดได้:', wordFile);
      return NextResponse.json({ success: false, error: `ไม่สามารถสร้างลิงก์ดาวน์โหลดได้สำหรับไฟล์: ${wordFile?.name || ''}` });
    }
    console.log('✅ ลิงก์ดาวน์โหลด:', link);
    console.log('--- [API/drive-link] เสร็จสิ้น ---');

    return NextResponse.json({ success: true, link, fileName: wordFile.name });
  } catch (error: any) {
    console.log('❌ [API/drive-link] ERROR:', error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
