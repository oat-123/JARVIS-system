import { NextRequest, NextResponse } from 'next/server';
import { findFolderByName, findFileByName, getDownloadLink, getDriveService, getSystemConfig } from '@/lib/google-auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { personName, folderName, rootFolderId } = await req.json();

    // Fetch dynamic IDs from registry
    const DRIVE_ROOT_ID = await getSystemConfig("GOOGLE_DRIVE_ROOT_ID", '1yNdCSMtz0vE4b4Kugap5JPHH86r7zyp_');
    const PRIORITY_FOLDER_ID = await getSystemConfig("GOOGLE_DRIVE_PRIORITY_ID", '1AvPt_VAEt1FNbDLgUwykfhMljBXoTdcY');
    const WORD_MIME_TYPES = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];

    console.log('--- [API/drive-link] เริ่มค้นหา ---');
    console.log('รับข้อมูล:', { personName, folderName, rootFolderId });

    if (!personName || !folderName) {
      console.log('❌ ขาดข้อมูล personName หรือ folderName');
      return NextResponse.json({ success: false, error: 'Missing personName or folderName' }, { status: 400 });
    }

    // 1. First, search in the priority folder
    console.log(`[drive-link] วิธีที่ 1: ค้นหาในโฟลเดอร์ Priority: ${PRIORITY_FOLDER_ID}`);
    const { best: priorityWordFile } = await findFileByName(PRIORITY_FOLDER_ID, personName, WORD_MIME_TYPES);

    if (priorityWordFile) {
      console.log('✅ พบไฟล์ในโฟลเดอร์ Priority:', priorityWordFile.name);
      const link = getDownloadLink(priorityWordFile);
      if (link) {
        console.log('✅ สร้างลิงก์ดาวน์โหลดจากโฟลเดอร์ Priority สำเร็จ');
        return NextResponse.json({ success: true, link, fileName: priorityWordFile.name });
      }
    }

    // 2. Find folder by name
    const ROOT_ID = rootFolderId || DRIVE_ROOT_ID;
    console.log('[drive-link] ค้นหาโฟลเดอร์บุคคล:', folderName);
    let personFolder = await findFolderByName(ROOT_ID, folderName);

    if (!personFolder) {
      console.log('❌ ไม่พบโฟลเดอร์บุคคล');
      return NextResponse.json({ success: false, error: `ไม่พบโฟลเดอร์บุคคล: ${folderName}` });
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
    const normalize = (s: string) => (s || '').replace(/\s+/g, '').toLowerCase();
    const subFolder = subfolders.find(f => normalize(f.name || '').includes('ฉก'));

    if (!subFolder) {
      console.log('❌ ไม่พบโฟลเดอร์ย่อยที่มีคำว่า "ฉก."');
      return NextResponse.json({ success: false, error: `ไม่พบโฟลเดอร์ "ฉก." ใน: ${personFolder.name}` });
    }
    console.log('✅ เจอโฟลเดอร์ย่อย "ฉก.":', subFolder);

    // 4. Find Word file
    const { best: wordFile, bestScore, files } = await findFileByName(subFolder.id as string, personName, WORD_MIME_TYPES);

    if (!wordFile || bestScore < 60) {
      return NextResponse.json({
        success: false,
        error: `ไม่พบไฟล์ Word ที่ตรงกันสำหรับ: ${personName}`,
        folderId: subFolder.id,
        alternativeFiles: files.map(f => ({ id: f.id, name: f.name }))
      });
    }

    const link = getDownloadLink(wordFile);
    return NextResponse.json({ success: true, link, fileName: wordFile.name });

  } catch (error: any) {
    console.error('❌ [API/drive-link] ERROR:', error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
