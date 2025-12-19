import { NextRequest, NextResponse } from 'next/server';
import { findImageFileByName, getDownloadLink, getSystemConfig } from '@/lib/google-auth';
import { getSessionAndValidate } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { errorResponse } = await getSessionAndValidate();
  if (errorResponse) return errorResponse;

  try {
    const { first, last, imageFolderId } = await req.json();

    // Fetch dynamic ID from registry if not provided in body
    const IMAGE_FOLDER_ID = imageFolderId || await getSystemConfig("GOOGLE_DRIVE_IMAGE_ID", '17h7HzW7YQqXeVH7-A-EhkJKQOmGNUC5s');

    if (!first && !last) {
      return NextResponse.json({ success: false, error: 'Missing first and last name' }, { status: 400 });
    }

    const personName = `${first || ''} ${last || ''}`.trim();

    if (!personName) {
      return NextResponse.json({ success: false, error: 'Missing personName' }, { status: 400 });
    }

    const imageFileResult = await findImageFileByName(IMAGE_FOLDER_ID, personName);

    if (!imageFileResult.best) {
      const alternativeFiles = imageFileResult.files || [];

      if (alternativeFiles.length > 0) {
        return NextResponse.json({
          success: false,
          error: `ไม่พบรูปภาพที่ตรงกันสำหรับ: ${personName}`,
          folderId: IMAGE_FOLDER_ID,
          alternativeFiles: alternativeFiles.map(f => ({ id: f.id, name: f.name }))
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `ไม่พบรูปภาพและไม่มีไฟล์อื่นในโฟลเดอร์`,
          folderId: IMAGE_FOLDER_ID
        });
      }
    }

    const imageFile = imageFileResult.best;
    const directGoogleDriveUrl = `https://drive.google.com/uc?export=view&id=${imageFile.id}`;

    return NextResponse.json({ success: true, link: directGoogleDriveUrl, thumbnailLink: imageFile.thumbnailLink, fileName: imageFile.name });
  } catch (error: any) {
    console.error('[API/image-link] ERROR:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
