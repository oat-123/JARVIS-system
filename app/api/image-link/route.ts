import { NextRequest, NextResponse } from 'next/server'
import { getDriveService, getDownloadLink } from '@/lib/google-auth'

export const runtime = 'nodejs'

// Fixed folder from user requirement (Google Drive folder containing images)
const IMAGE_DRIVE_FOLDER_ID = '17h7HzW7YQqXeVH7-A-EhkJKQOmGNUC5s'

function normalizeName(name: string): string {
  return (name || '')
    .replace(/\.[^.]+$/i, '') // drop extension
    .replace(/^image/i, '') // drop leading Image/image
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

export async function POST(req: NextRequest) {
  try {
    const { first, last, folderId } = await req.json()
    if (!first || !last) {
      return NextResponse.json({ success: false, error: 'Missing first or last' }, { status: 400 })
    }

    const targetFolderId = folderId || IMAGE_DRIVE_FOLDER_ID
    const firstRaw = (first as string).trim()
    const lastInitial = (last as string).trim().charAt(0)
    const patternWithSpace = `${firstRaw} ${lastInitial}`
    const patternNoSpace = `${firstRaw}${lastInitial}`
    const targetA = normalizeName(patternWithSpace)
    const targetB = normalizeName(patternNoSpace)
    const firstOnly = normalizeName(firstRaw)

    const drive = await getDriveService()
    const q = `('${targetFolderId}' in parents) and trashed = false and (
      mimeType contains 'image/' or mimeType = 'image/png' or mimeType = 'image/jpeg' or mimeType = 'image/jpg'
    )`
    const resp = await drive.files.list({
      q,
      fields: 'files(id,name,mimeType,webViewLink,webContentLink)',
      pageSize: 1000,
    })
    const files = resp.data.files || []

    // Score candidates: prefer exact match after normalization; allow contains match as fallback
    type Scored = { id: string; name: string; score: number; file: any }
    const candidates: Scored[] = files.map(f => {
      const norm = normalizeName(f.name || '')
      let score = 0
      // 1) Exact normalized match to patterns
      if (norm === targetA || norm === targetB) score = 100
      // 2) Contains pattern
      else if (norm.includes(targetA) || norm.includes(targetB)) score = 85
      else {
        // 3) First-name only exact/contains
        if (norm === firstOnly) score = 70
        else if (norm.includes(firstOnly)) score = 60
        // 4) Loose: tokens in order (first then initial)
        const firstNorm = firstOnly
        const initialNorm = lastInitial.toLowerCase()
        const posFirst = norm.indexOf(firstNorm)
        const posInitial = norm.indexOf(initialNorm)
        const inOrder = posFirst >= 0 && posInitial > posFirst
        if (inOrder) score = Math.max(score, 55)
        // 5) Fuzzy similarity vs patterns and first-only
        const distances: number[] = []
        ;[targetA, targetB, firstOnly].forEach(t => {
          if (t && norm) distances.push(levenshtein(norm, t))
        })
        if (distances.length) {
          const minDist = Math.min(...distances)
          const maxLen = Math.max(norm.length, targetA.length, targetB.length, firstOnly.length, 1)
          const sim = 1 - minDist / maxLen // 0..1
          const fuzzyScore = Math.round(sim * 60) // up to 60 for fuzzy
          score = Math.max(score, fuzzyScore)
        }
      }
      return { id: f.id!, name: f.name || '', score, file: f }
    }).filter(c => c.score > 0)

    candidates.sort((a, b) => b.score - a.score)

    if (candidates.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบรูปภาพที่ตรงกับชื่อ', folderId: targetFolderId })
    }

    const picked = candidates[0]
    let link = getDownloadLink(picked.file)
    if (!link && picked.id) {
      // fallback direct download by id
      link = `https://drive.google.com/uc?export=download&id=${picked.id}`
    }
    if (!link) {
      return NextResponse.json({ success: false, error: 'ไม่สามารถสร้างลิงก์ดาวน์โหลดรูปภาพได้', folderId: targetFolderId })
    }
    return NextResponse.json({ success: true, link, fileName: picked.name })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


