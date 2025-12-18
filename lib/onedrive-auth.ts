import 'isomorphic-fetch';

// OneDrive Sharing Link - This should be the folder containing all person folders
const ONEDRIVE_SHARING_LINK = process.env.ONEDRIVE_SHARING_LINK || 'https://1drv.ms/f/c/682b1e2a26f4c01e/IgBPMvJ4rUu2QpKUfavN8nUMAfFIMfxzC6qBReW4iVajgGU?e=TxaeJg';

// Extract sharing info from OneDrive link
function parseOneDriveLink(url: string) {
  const match = url.match(/1drv\.ms\/[fu]\/c\/([a-f0-9]+)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;

  return {
    cid: match[1],
    resId: match[2],
  };
}

// Get folder contents using OneDrive embed API (no auth required for public shares)
async function getFolder ExtContents(sharingLink: string, subPath: string = '') {
  const parsed = parseOneDriveLink(sharingLink);
  if (!parsed) {
    console.error('[OneDrive] Invalid sharing link format');
    return null;
  }

  try {
    // Use OneDrive's public embed API
    const encodedPath = encodeURIComponent(subPath);
    const embedUrl = `https://api.onedrive.com/v1.0/shares/u!${btoa(sharingLink.split('?')[0]).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}/root${subPath ? ':/' + encodedPath : ''}/children`;

    console.log(`[OneDrive] Fetching folder contents from embed API`);

    const response = await fetch(embedUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OneDrive] Embed API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data.value || [];

  } catch (error) {
    console.error('[OneDrive] Error fetching folder contents:', error);
    return null;
  }
}

// Helper to normalize Thai text for comparison
const normalize = (s: string) => {
  return (s || '')
    .replace(/^นนร\.?\s*/i, '')
    .replace(/\s+/g, '')
    .toLowerCase();
};

// Find person folder
export async function findFolderByName(parentId: string | null, name: string) {
  try {
    console.log(`[OneDrive] Searching for folder: ${name}`);

    // Get root folder contents
    const items = await getFolderContents(ONEDRIVE_SHARING_LINK, '');

    if (!items || items.length === 0) {
      console.log('[OneDrive] No items found in shared folder');
      return null;
    }

    const folders = items.filter((item: any) => item.folder);
    const targetNorm = normalize(name);

    console.log(`[OneDrive] Found ${folders.length} folders`);

    // Try exact match first
    for (const folder of folders) {
      if (normalize(folder.name) === targetNorm) {
        console.log(`[OneDrive] Found exact match: ${folder.name}`);
        return folder;
      }
    }

    // Try fuzzy match
    let bestMatch = null;
    let bestScore = 0;

    for (const folder of folders) {
      const folderNorm = normalize(folder.name);
      let score = 0;

      const nameParts = name.split(/\s+/).filter(Boolean);
      for (const part of nameParts) {
        const partNorm = normalize(part);
        if (partNorm && folderNorm.includes(partNorm)) {
          score += 20;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = folder;
      }
    }

    if (bestMatch && bestScore >= 20) {
      console.log(`[OneDrive] Found fuzzy match: ${bestMatch.name} (score: ${bestScore})`);
      return bestMatch;
    }

    console.log('[OneDrive] No matching folder found');
    return null;

  } catch (error) {
    console.error('[OneDrive] Error finding folder:', error);
    return null;
  }
}

// Find PDF file in a person's folder
export async function findFileByName(folderId: string, name: string, mimeTypes: string[]) {
  try {
    console.log(`[OneDrive] This implementation uses direct folder access`);

    // Since we can't easily navigate by ID without auth, we'll need to list all folders
    // and find the matching person folder, then list its contents
    // This is a limitation of the no-auth approach

    // For now, return empty - we need to rethink this approach
    return { best: null, bestScore: 0, files: [] };

  } catch (error) {
    console.error('[OneDrive] Error finding file:', error);
    return { best: null, bestScore: 0, files: [] };
  }
}

// Find image file
export async function findImageFileByName(folderId: string, name: string) {
  return { best: null, files: [] };
}

// Convert OneDrive file to download link
export function getDownloadLink(file: any) {
  if (!file) return null;

  // OneDrive files have @content.downloadUrl or @microsoft.graph.downloadUrl
  if (file['@content.downloadUrl']) {
    return file['@content.downloadUrl'];
  }

  if (file['@microsoft.graph.downloadUrl']) {
    return file['@microsoft.graph.downloadUrl'];
  }

  // Fallback to webUrl
  return file.webUrl || null;
}
