import { NextRequest, NextResponse } from 'next/server';
import { findImageFileByName, getDownloadLink } from '@/lib/google-auth';

export const runtime = 'nodejs';

// The ID of the folder containing the images.
const IMAGE_FOLDER_ID = '17h7HzW7YQqXeVH7-A-EhkJKQOmGNUC5s';

export async function POST(req: NextRequest) {
  try {
    const { first, last } = await req.json();

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
      console.log(`[API/image-link] No matching image found for: ${personName}.`);
      
      if (alternativeFiles.length > 0) {
        console.log(`[API/image-link] Found ${alternativeFiles.length} other files in the image folder:`);
        alternativeFiles.forEach(f => console.log(`  - ${f.name} (ID: ${f.id})`));
        
        return NextResponse.json({
          success: false,
          error: `ไม่พบรูปภาพที่ตรงกันสำหรับ: ${personName}`,
          folderId: IMAGE_FOLDER_ID,
          alternativeFiles: alternativeFiles.map(f => ({ id: f.id, name: f.name }))
        });
      } else {
        console.log(`[API/image-link] No other files found in the image folder.`);
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
