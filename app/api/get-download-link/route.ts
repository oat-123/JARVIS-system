import { NextRequest, NextResponse } from 'next/server';
import { getDriveService } from '@/lib/google-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json({ success: false, error: 'Missing fileId' }, { status: 400 });
  }

  try {
    const drive = await getDriveService();
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, webViewLink, webContentLink',
    });

    if (!file.data) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    // Prefer direct download link, fallback to view link
    const link = file.data.webContentLink || file.data.webViewLink;

    if (!link) {
      return NextResponse.json({ success: false, error: 'No downloadable link found for this file' }, { status: 404 });
    }

    return NextResponse.json({ success: true, link, fileName: file.data.name });
  } catch (error: any) {
    console.error(`[API/get-download-link] ERROR for fileId ${fileId}:`, error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
