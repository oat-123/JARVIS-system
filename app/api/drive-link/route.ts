import { NextRequest, NextResponse } from 'next/server';
import { findFolderByName, findFileByName, getDownloadLink, getDriveService } from '@/lib/google-auth';

export const runtime = 'nodejs';

// โฟลเดอร์ root ของ Drive (ค่าเริ่มต้น)
const DRIVE_ROOT_ID = '1yNdCSMtz0vE4b4Kugap5JPHH86r7zyp_';
const PRIORITY_FOLDER_ID = '1AvPt_VAEt1FNbDLgUwykfhMljBXoTdcY'; // New priority folder
const WORD_MIME_TYPES = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];

export async function POST(req: NextRequest) {
  try {
    const { personName, folderName, rootFolderId } = await req.json();
    console.log('--- [API/drive-link] เริ่มค้นหา ---');
    console.log('รับข้อมูล:', { personName, folderName, rootFolderId });

    if (!personName || !folderName) {
      console.log('❌ ขาดข้อมูล personName หรือ folderName');
      return NextResponse.json({ success: false, error: 'Missing personName or folderName' }, { status: 400 });
    }

    // 1. (NEW) First, search in the priority folder
    console.log(`[drive-link] วิธีที่ 1: ค้นหาในโฟลเดอร์ Priority: ${PRIORITY_FOLDER_ID}`);
    const { best: priorityWordFile } = await findFileByName(PRIORITY_FOLDER_ID, personName, WORD_MIME_TYPES);

    if (priorityWordFile) {
      console.log('✅ พบไฟล์ในโฟลเดอร์ Priority:', priorityWordFile.name);
      const link = getDownloadLink(priorityWordFile);
      if (link) {
        console.log('✅ สร้างลิงก์ดาวน์โหลดจากโฟลเดอร์ Priority สำเร็จ');
        return NextResponse.json({ success: true, link, fileName: priorityWordFile.name });
      }
      console.log('⚠️ ไม่สามารถสร้างลิงก์ดาวน์โหลดจากไฟล์ในโฟลเดอร์ Priority ได้');
    }
    console.log('ℹ️ ไม่พบไฟล์ในโฟลเดอร์ Priority, ดำเนินการค้นหาวิธีเดิม...');

    // 2. (Original Logic) Find folder by name from sheet import
    const ROOT_ID = rootFolderId || DRIVE_ROOT_ID;
    console.log('[drive-link] วิธีที่ 2: ROOT_ID =', ROOT_ID);
    console.log('[drive-link] ค้นหาโฟลเดอร์บุคคล:', folderName);
    let personFolder = await findFolderByName(ROOT_ID, folderName);
    if (!personFolder) {
      console.log('❌ ไม่พบโฟลเดอร์บุคคล (exact):', folderName);
      // Fallback: fuzzy search all first-level folders under ROOT by last name token
      try {
        const drive = await getDriveService();
        const listPersons = await drive.files.list({
          q: `mimeType = 'application/vnd.google-apps.folder' and '${ROOT_ID}' in parents and trashed = false`,
          fields: 'files(id, name)',
          pageSize: 1000,
        });
        const candidates = listPersons.data.files || [];
        const norm = (s: string) => (s || '').replace(/\s+/g, '').toLowerCase();
        const tokens = (personName || folderName || '').split(/\s+/).filter(Boolean);
        const lastToken = tokens.length ? tokens[tokens.length - 1] : '';
        const score = (name: string) => {
          const n = norm(name);
          let sc = 0;
          if (lastToken && n.includes(norm(lastToken))) sc += 80; // must match last name strongly
          // small bonuses for other tokens
          tokens.forEach(t => { if (t !== lastToken && t.length >= 2 && n.includes(norm(t))) sc += 10; });
          if (/^นนร\./.test(name)) sc += 5;
          return sc;
        };
        const ranked = candidates.map(f => ({ f, sc: score(f.name || '') })).sort((a,b)=> b.sc - a.sc);
        console.log('[drive-link] Fallback ranked folders (top 10):');
        ranked.slice(0,10).forEach((r,i)=> console.log(` ${i+1}. [${r.sc}]`, r.f.name, r.f.id));
        if (ranked.length && ranked[0].sc >= 60) {
          personFolder = ranked[0].f as any;
          console.log('✅ เลือกโฟลเดอร์แบบ Fallback:', personFolder);
        } else {
          console.log('❌ Fallback ไม่พบโฟลเดอร์ที่เหมาะสม สำหรับ:', folderName);
          return NextResponse.json({ success: false, error: `ไม่พบโฟลเดอร์บุคคล: ${folderName}` });
        }
      } catch (e) {
        console.log('❌ Fallback ค้นหาโฟลเดอร์ล้มเหลว:', e instanceof Error ? e.message : e);
        return NextResponse.json({ success: false, error: `ไม่พบโฟลเดอร์บุคคล: ${folderName}` });
      }
    }
    console.log('✅ เจอโฟลเดอร์บุคคล:', personFolder);

    // 3. Find subfolder with "ฉก."
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

    // 4. Find Word file similar to personName
    console.log('[drive-link] ค้นหาไฟล์ Word ตามชื่อ:', personName);
    const { best: wordFile, bestScore, files } = await findFileByName(subFolder.id, personName, WORD_MIME_TYPES);
    console.log(`[drive-link] คะแนนความตรงกันของไฟล์: ${bestScore}`);

    // log all word files found for transparency
    try {
      const listWord = await (await getDriveService()).files.list({
        q: `('${subFolder.id}' in parents) and trashed = false and (mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType = 'application/msword')`,
        fields: 'files(id, name)',
        pageSize: 200,
      });
      const filesList = listWord.data.files || []
      console.log(`[drive-link] ไฟล์ Word ทั้งหมดใน "${subFolder.name}" (${filesList.length})`)
      filesList.forEach((f, i) => console.log(`  - ${i+1}.`, f.name, f.id))
    } catch (e) {
      console.log('[drive-link] ไม่สามารถดึงรายการไฟล์เพื่อ log ได้:', e instanceof Error ? e.message : e)
    }

    if (!wordFile || bestScore < 60) {
      console.log(`[API/drive-link] Word file not found for: ${personName} (Score: ${bestScore}).`);
      
      try {
        const drive = await getDriveService();
        const allFilesInFolder = await drive.files.list({
          q: `'${subFolder.id}' in parents and trashed = false`,
          fields: 'files(id, name, mimeType)',
          pageSize: 100,
        });
        const filesInFolder = allFilesInFolder.data.files || [];

        if (filesInFolder.length > 0) {
          console.log(`[API/drive-link] No matching Word file. Found ${filesInFolder.length} other files in folder "${subFolder.name}":`);
          filesInFolder.forEach(f => console.log(`  - ${f.name} (${f.mimeType})`));
          
          return NextResponse.json({
            success: false,
            error: `ไม่พบไฟล์ Word ที่ตรงกันสำหรับ: ${personName}`,
            folderId: subFolder.id,
            alternativeFiles: filesInFolder.map(f => ({ id: f.id, name: f.name }))
          });
        } else {
          console.log(`[API/drive-link] No other files found in folder: ${subFolder.name}`);
          return NextResponse.json({ success: false, error: `ไม่พบไฟล์ Word และไฟล์อื่นๆ ในโฟลเดอร์: ${subFolder.name}`, folderId: subFolder.id });
        }
      } catch (e) {
        console.error('[API/drive-link] Error fetching alternative files:', e);
        return NextResponse.json({ success: false, error: `ไม่พบไฟล์ Word และเกิดข้อผิดพลาดในการค้นหาไฟล์อื่น`, folderId: subFolder.id });
      }
    }
    console.log('✅ เจอไฟล์ Word:', wordFile);

    // 5. Create download link
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
