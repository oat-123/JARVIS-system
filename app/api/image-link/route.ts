import { NextRequest, NextResponse } from 'next/server';
import { findImageFileByName, getDownloadLink } from '@/lib/google-auth';

export const runtime = 'nodejs';

// The ID of the folder containing the images.
const IMAGE_FOLDER_ID = '17h7HzW7YQqXeVH7-A-EhkJKQOmGNUC5s';

export async function POST(req: NextRequest) {
  try {
    const { personName } = await req.json();

    if (!personName) {
      return NextResponse.json({ success: false, error: 'Missing personName' }, { status: 400 });
    }

    // Find the image file by name in the specified folder.
    const imageFile = await findImageFileByName(IMAGE_FOLDER_ID, personName);
    console.log('[API/image-link] Found imageFile:', imageFile);

    if (!imageFile) {
      return NextResponse.json({ success: false, error: `Image not found for: ${personName}` });
    }

    // Get the download link for the image.
    const link = getDownloadLink(imageFile);

    if (!link) {
      return NextResponse.json({ success: false, error: `Could not get download link for: ${imageFile.name}` });
    }

    return NextResponse.json({ success: true, link, thumbnailLink: imageFile.thumbnailLink });
  } catch (error: any) {
    console.error('[API/image-link] ERROR:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
