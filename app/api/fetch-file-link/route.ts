
import { NextRequest, NextResponse } from 'next/server';
import { findFileByName, getDownloadLink } from '@/lib/google-auth';

export const runtime = 'nodejs';

const DRIVE_FOLDER_ID = '1DsLfQC3x4G2swC8L92IuipH1XqCsKwtb';

export async function POST(req: NextRequest) {
  try {
    const { personName, fileType } = await req.json();

    if (!personName || !fileType) {
      return NextResponse.json({ success: false, error: 'Missing personName or fileType' }, { status: 400 });
    }

    let mimeTypes: string[] = [];
    if (fileType === 'word') {
      mimeTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    } else if (fileType === 'pdf') {
      mimeTypes = ['application/pdf'];
    } else {
      return NextResponse.json({ success: false, error: 'Invalid fileType' }, { status: 400 });
    }

    console.log(`[API/fetch-file-link] Searching for ${fileType} file for: ${personName} in folder ${DRIVE_FOLDER_ID}`);

    const { best: foundFile, bestScore, files } = await findFileByName(DRIVE_FOLDER_ID, personName, mimeTypes);

    if (!foundFile) {
      console.log(`[API/fetch-file-link] ${fileType} file not found for: ${personName}`);
      return NextResponse.json({ success: false, error: `File not found for ${personName}`, score: bestScore, files });
    }

    console.log(`[API/fetch-file-link] Found file: ${foundFile.name} with score ${bestScore}`);

    const link = getDownloadLink(foundFile);

    if (!link) {
      console.log(`[API/fetch-file-link] Could not get download link for: ${foundFile.name}`);
      return NextResponse.json({ success: false, error: 'Could not get download link' });
    }

    return NextResponse.json({ success: true, link, fileName: foundFile.name, score: bestScore });

  } catch (error: any) {
    console.error('[API/fetch-file-link] ERROR:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
  }
}
