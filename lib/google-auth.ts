import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";
import bcrypt from "bcryptjs";

const ADMIN_SPREADSHEET_ID = "1-NsKFnSosQUzSY3ReFjeoH2nZ2S-1UMDlT-SAWILMSw";
const CONFIG_SHEET_NAME = "config";

// Initialize Google Auth with proper private key handling
export async function getGoogleAuth() {
  try {
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || ''

    // Handle different private key formats
    if (privateKey.includes('\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n')
    }

    // Ensure the private key has proper formatting
    if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`
    }

    // Validate required environment variables
    const requiredVars = {
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
    }

    // Check if any required variable is missing
    const missingVars = Object.entries(requiredVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key)

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
    }

    const auth = new GoogleAuth({
      credentials: {
        type: "service_account",
        project_id: requiredVars.project_id,
        private_key_id: requiredVars.private_key_id,
        private_key: requiredVars.private_key,
        client_email: requiredVars.client_email,
        client_id: requiredVars.client_id,
      },
      scopes: SCOPES,
    })

    return auth
  } catch (error) {
    console.error('Error initializing Google Auth:', error)
    throw new Error(`Google Auth initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Get Google Sheets service
export const getSheetsService = async () => {
  try {
    const auth = await getGoogleAuth()
    const sheets = google.sheets({ version: 'v4', auth })
    return sheets
  } catch (error) {
    console.error('Error getting Google Sheets service:', error)
    throw error
  }
}

// Validate Google Auth configuration
export const validateGoogleAuthConfig = () => {
  const requiredEnvVars = [
    'GOOGLE_PROJECT_ID',
    'GOOGLE_PRIVATE_KEY_ID',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_SPREADSHEET_ID'
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}. Please configure these variables in your production environment.`
    console.error('Environment Variables Error:', errorMessage)
    throw new Error(errorMessage)
  }

  // Additional validation for production
  if (process.env.NODE_ENV === 'production') {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
    if (!privateKey || privateKey === 'your-private-key-here') {
      throw new Error('GOOGLE_PRIVATE_KEY is not properly configured for production')
    }

    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID
    if (!spreadsheetId || spreadsheetId === 'your-google-spreadsheet-id') {
      throw new Error('GOOGLE_SPREADSHEET_ID is not properly configured for production')
    }
  }

  return true
}

// Mock data for development/testing
export const getMockData = () => {
  return [
    {
      ลำดับ: "1",
      ยศ: "ร.ต.",
      ชื่อ: "ทดสอบ",
      สกุล: "ระบบ",
      ชั้นปีที่: "4",
      ตอน: "1",
      ตำแหน่ง: "นักเรียน",
      สังกัด: "พัน4",
      เบอร์โทรศัพท์: "0812345678",
      หน้าที่: "ทั่วไป",
      ชมรม: "คอมพิวเตอร์",
      สถิติโดนยอด: "0",
    },
    {
      ลำดับ: "2",
      ยศ: "ร.ต.",
      ชื่อ: "ตัวอย่าง",
      สกุล: "ข้อมูล",
      ชั้นปีที่: "4",
      ตอน: "2",
      ตำแหน่ง: "นักเรียน",
      สังกัด: "พัน4",
      เบอร์โทรศัพท์: "0898765432",
      หน้าที่: "ทั่วไป",
      ชมรม: "กีฬา",
      สถิติโดนยอด: "0",
    }
  ]
}

// Google Sheets + Drive API scopes (ต้องมีแค่ 1 อันในไฟล์นี้)
export const SCOPES: string[] = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
];

// Get Google Drive service
export const getDriveService = async () => {
  try {
    const auth = await getGoogleAuth()
    const drive = google.drive({ version: 'v3', auth })
    return drive
  } catch (error) {
    console.error('Error getting Google Drive service:', error)
    throw error
  }
}

// ค้นหาโฟลเดอร์ย่อยใน Google Drive ตามชื่อ (fuzzy)
export const findFolderByName = async (parentId: string, name: string) => {
  const drive = await getDriveService()
  const res = await drive.files.list({
    q: `mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 1000,
  })
  // fuzzy match: ชื่อโฟลเดอร์ที่มีชื่อใกล้เคียง name
  const folders = res.data.files || []
  // ให้คะแนนความคล้าย (simple)
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
  const target = norm(name)
  let best = null
  let bestScore = 0
  for (const f of folders) {
    const n = norm(f.name || '')
    let score = 0
    if (n === target) score = 100
    else if (n.includes(target) || target.includes(n)) score = 80
    else if (n.includes('ฉก')) score = 60
    else if (n.match(/ฉก/)) score = 50
    if (score > bestScore) {
      best = f
      bestScore = score
    }
  }
  return best
}

// ค้นหาไฟล์ Word ในโฟลเดอร์ (ชื่อใกล้เคียง targetName)
export const findFileByName = async (parentId: string, targetName: string, mimeTypes: string[]) => {
  const drive = await getDriveService();
  const mimeTypeQuery = mimeTypes.map(m => `mimeType = '${m}'`).join(' or ');
  const q = `('${parentId}' in parents) and trashed = false and (${mimeTypeQuery})`;

  const res = await drive.files.list({
    q: q,
    fields: 'files(id, name, webViewLink, webContentLink)',
    pageSize: 100,
  });

  const files = res.data.files || [];
  if (!files.length) {
    return { best: null, bestScore: 0, files: [] };
  }

  const normalizeAndTokenize = (str: string): string[] => {
    return (str || '')
      .replace(/^(นนร\.?|ประวัติฉก\.?)/i, '') // Remove common prefixes
      .replace(/\.(docx?|pdf)$/i, '') // Remove file extensions
      .replace(/[\s\._-]+/g, ' ') // Replace separators with space
      .trim()
      .toLowerCase()
      .split(' ')
      .filter(Boolean); // Remove empty tokens
  };

  const targetTokens = normalizeAndTokenize(targetName);
  const lastName = targetTokens.length > 1 ? targetTokens[targetTokens.length - 1] : null;

  let bestFile: any | null = null;
  let bestScore = 0;

  for (const file of files) {
    if (!file.name) continue;

    const fileTokens = normalizeAndTokenize(file.name);
    let currentScore = 0;

    // Direct comparison of normalized strings first
    if (fileTokens.join(' ') === targetTokens.join(' ')) {
      currentScore = 100;
    } else {
      let matchedTokens = 0;
      const tempFileTokens = [...fileTokens];

      targetTokens.forEach(token => {
        const foundIndex = tempFileTokens.findIndex(fileToken => fileToken.includes(token) || token.includes(fileToken));
        if (foundIndex !== -1) {
          const isLastName = lastName && (token === lastName);
          currentScore += isLastName ? 40 : 20; // Higher score for last name
          matchedTokens++;
          tempFileTokens.splice(foundIndex, 1); // Remove to avoid re-matching
        }
      });

      // Bonus for matching all tokens
      if (matchedTokens === targetTokens.length) {
        currentScore += 15;
      }

      // Adjust score based on token count difference
      const tokenDiff = Math.abs(targetTokens.length - fileTokens.length);
      currentScore -= tokenDiff * 5;
    }

    if (currentScore > bestScore) {
      bestScore = currentScore;
      bestFile = file;
    }
  }

  // Clamp score to be between 0 and 100
  bestScore = Math.max(0, Math.min(bestScore, 100));

  return { best: bestFile, bestScore, files };
};

// สร้างลิงก์ดาวน์โหลด (webViewLink/webContentLink)
export const getDownloadLink = (file: any) => {
  // ถ้ามี webContentLink ให้ใช้เลย (direct download)
  if (file.webContentLink) return file.webContentLink
  // ถ้าไม่มี ให้ใช้ webViewLink (view in browser)
  if (file.webViewLink) return file.webViewLink
  // ถ้าไม่มีเลย คืน null
  return null
}

// ค้นหาไฟล์รูปภาพในโฟลเดอร์ (ชื่อใกล้เคียง targetName)
export const findImageFileByName = async (parentId: string, targetName: string) => {
  const drive = await getDriveService();
  const res = await drive.files.list({
    q: `('${parentId}' in parents) and trashed = false and (mimeType = 'image/jpeg' or mimeType = 'image/png')`,
    fields: 'files(id, name, webViewLink, webContentLink, thumbnailLink, size)',
    pageSize: 1000,
  });
  const files = res.data.files || [];
  if (!files.length) {
    return { best: null, files: [] };
  }

  const normalizeAndTokenize = (str: string): string[] => {
    return (str || '')
      .replace(/\.(jpg|jpeg|png)$/i, '') // Remove image file extensions
      .replace(/[\s\._-]+/g, ' ') // Replace separators with space
      .trim()
      .toLowerCase()
      .split(' ')
      .filter(Boolean);
  };

  const targetTokens = normalizeAndTokenize(targetName);
  if (targetTokens.length === 0) {
    return { best: null, files };
  }

  let bestFile: any | null = null;
  let bestScore = 0;

  for (const file of files) {
    if (!file.name) continue;

    const fileTokens = normalizeAndTokenize(file.name);
    if (fileTokens.length === 0) continue;

    let currentScore = 0;
    const targetFullName = targetTokens.join(' ');
    const fileFullName = fileTokens.join(' ');

    // Highest score for exact match
    if (fileFullName === targetFullName) {
      currentScore = 100;
    } else {
      // Score based on token matching
      const [targetFirst, ...targetRest] = targetTokens;
      const targetLast = targetRest.pop() || '';

      const [fileFirst, ...fileRest] = fileTokens;
      const fileLast = fileRest.pop() || '';

      // Strong match for first name
      if (targetFirst === fileFirst) {
        currentScore += 50;
      } else if (fileFirst.startsWith(targetFirst)) {
        currentScore += 30;
      }

      // Strong match for last name
      if (targetTokens.length > 1 && fileTokens.length > 1) {
        if (targetLast === fileLast) {
          currentScore += 50;
        } else if (fileLast.startsWith(targetLast)) {
          currentScore += 20;
        }
      }

      // Penalize for different lengths
      if (targetTokens.length !== fileTokens.length) {
        currentScore -= 10;
      }
    }

    if (currentScore > bestScore) {
      bestScore = currentScore;
      bestFile = file;
    }
  }

  // Only return a match if the score is reasonably high
  if (bestScore < 50) {
    return { best: null, files };
  }

  return { best: bestFile, files };
};

// New function for user authentication from Google Sheet
export async function authenticateUserFromSheet(username: string, password_provided: string): Promise<{ username: string, role: string, db: string } | null> {
  const USER_SPREADSHEET_ID = "1-NsKFnSosQUzSY3ReFjeoH2nZ2S-1UMDlT-SAWILMSw";
  const USER_SHEET_NAME = "user";

  try {
    const sheets = await getSheetsService();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: USER_SPREADSHEET_ID,
      range: `${USER_SHEET_NAME}!A:D`, // Columns: A:user, B:pass, C:db, D:role
    });

    const rows = response.data.values;
    if (!rows) {
      console.error("[auth] No data found in user sheet.");
      return null;
    }

    // Find the user row (skip header)
    for (let i = 1; i < rows.length; i++) {
      const [user, pass, db, role] = rows[i];
      if (user && user.toLowerCase() === username.toLowerCase()) {
        // Try hashed password first
        let isMatch = false;
        try {
          if (pass.startsWith('$2a$') || pass.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password_provided, pass);
          } else {
            // Fallback for plain text (for transition)
            isMatch = (pass === password_provided);
            if (isMatch) {
              console.warn(`[SECURITY] User '${username}' is using a plain text password. Please hash it for maximum security.`);
            }
          }
        } catch (e) {
          isMatch = (pass === password_provided);
        }

        if (isMatch) {
          console.log(`[auth] User '${username}' authenticated successfully with role '${role}' and db '${db}'.`);
          return { username: user, role: role ?? "", db: db ?? "" };
        }
      }
    }

    console.log(`[auth] Authentication failed for user '${username}'.`);
    return null;
  } catch (error) {
    console.error("[auth] Error authenticating user from Google Sheet:", error);
    throw new Error("Authentication service encountered an error.");
  }
}

export async function getCombinedSheetData(spreadsheetId: string): Promise<any[][]> {
  const sheets = await getSheetsService();
  const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
  const allSheets = sheetInfo.data.sheets || [];

  let combinedData: any[][] = [];
  let isFirstSheet = true;

  for (const sheet of allSheets) {
    const title = sheet.properties?.title;
    if (title) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: title,
      });
      const values = response.data.values;
      if (values) {
        if (isFirstSheet) {
          combinedData.push(...values); // Include header from the first sheet
          isFirstSheet = false;
        } else {
          combinedData.push(...values.slice(1)); // Exclude header from subsequent sheets
        }
      }
    }
  }
  return combinedData;
}

// Cache system configs for 5 minutes to avoid quota limits
let systemConfigCache: Record<string, string> | null = null;
let systemConfigTimestamp: number = 0;
const CACHE_TTL = 300000; // 5 minutes

export async function getSystemConfigs(): Promise<Record<string, string>> {
  const now = Date.now();
  if (systemConfigCache && (now - systemConfigTimestamp < CACHE_TTL)) {
    return systemConfigCache;
  }

  try {
    const sheets = await getSheetsService();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ADMIN_SPREADSHEET_ID,
      range: `${CONFIG_SHEET_NAME}!A:B`,
    });

    const rows = response.data.values;
    const configs: Record<string, string> = {};
    if (rows) {
      for (let i = 1; i < rows.length; i++) {
        const [key, value] = rows[i];
        if (key) configs[key] = value || "";
      }
    }

    // Update cache
    systemConfigCache = configs;
    systemConfigTimestamp = now;

    return configs;
  } catch (error) {
    console.error("[config] Error fetching configs:", error);
    // Return stale cache if available, otherwise empty
    return systemConfigCache || {};
  }
}

export async function getSystemConfig(key: string, defaultValue: string = ""): Promise<string> {
  const configs = await getSystemConfigs();
  return configs[key] || defaultValue;
}

export async function updateSystemConfig(key: string, value: string): Promise<boolean> {
  try {
    const sheets = await getSheetsService();
    const currentConfigs = await sheets.spreadsheets.values.get({
      spreadsheetId: ADMIN_SPREADSHEET_ID,
      range: `${CONFIG_SHEET_NAME}!A:A`,
    });

    const rows = currentConfigs.data.values || [];
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === key) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      // Append new config
      await sheets.spreadsheets.values.append({
        spreadsheetId: ADMIN_SPREADSHEET_ID,
        range: `${CONFIG_SHEET_NAME}!A:B`,
        valueInputOption: "RAW",
        requestBody: { values: [[key, value]] },
      });
    } else {
      // Update existing config
      await sheets.spreadsheets.values.update({
        spreadsheetId: ADMIN_SPREADSHEET_ID,
        range: `${CONFIG_SHEET_NAME}!B${rowIndex + 1}`,
        valueInputOption: "RAW",
        requestBody: { values: [[value]] },
      });
    }
    return true;
  } catch (error) {
    console.error("[config] Error updating config:", error);
    return false;
  }
}

export async function logToSheet(action: string, username: string, details: string = "") {
  try {
    const LOG_SPREADSHEET_ID = await getSystemConfig("LOG_LOGIN_SPREADSHEET_ID", "1-NsKFnSosQUzSY3ReFjeoH2nZ2S-1UMDlT-SAWILMSw");
    const sheets = await getSheetsService();
    const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

    // Look up the correct sheet name (use the first sheet found)
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: LOG_SPREADSHEET_ID,
      fields: "sheets.properties.title",
    });

    const sheetName = meta.data.sheets?.[0]?.properties?.title || 'Sheet1';

    await sheets.spreadsheets.values.append({
      spreadsheetId: LOG_SPREADSHEET_ID,
      range: `'${sheetName}'!A:D`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[timestamp, username, action, details]]
      },
    });
  } catch (error) {
    console.error("[log] Failed to log to sheet:", error);
  }
}

