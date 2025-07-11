import { NextRequest, NextResponse } from "next/server"

// In-memory state สำหรับจำ userId กับ step (mock, ไม่เหมาะกับ production จริง)
const userState: Record<string, { step: string }> = {}

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!

export async function POST(req: NextRequest) {
  const body = await req.json()
  const events = body.events

  for (const event of events) {
    const userId = event.source.userId
    if (event.type === "message" && event.message.type === "text") {
      const text = event.message.text.trim()
      if (text === "เวรรักษาการณ์") {
        // 1. ถามชื่อชีท
        userState[userId] = { step: "waiting_sheet_name" }
        await replyText(event.replyToken, "กรุณาพิมพ์ชื่อชีทที่ต้องการดู")
      } else if (userState[userId]?.step === "waiting_sheet_name") {
        // 2. ได้ชื่อชีทแล้ว
        const sheetName = text
        // 3. mock ดึงข้อมูลจาก API
        const data = await fetchSheetData(sheetName)
        // 4. mock สร้างภาพจากข้อมูล
        const imageUrl = await generateImageFromData(data)
        // 5. ส่งภาพกลับใน LINE
        await replyImage(event.replyToken, imageUrl)
        // 6. reset state
        delete userState[userId]
      }
    }
  }
  return NextResponse.json({ status: "ok" })
}

// ฟังก์ชันส่งข้อความ text
async function replyText(replyToken: string, text: string) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  })
}

// ฟังก์ชันส่งภาพ (image message)
async function replyImage(replyToken: string, imageUrl: string) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: "image",
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl,
        },
      ],
    }),
  })
}

// mock ฟังก์ชันดึงข้อมูลจาก API (คืน array object)
async function fetchSheetData(sheetName: string) {
  // ตัวอย่าง mock data
  return [
    { ชื่อ: "นาย A", ตำแหน่ง: "เวร 1", เวลา: "08:00-16:00" },
    { ชื่อ: "นาย B", ตำแหน่ง: "เวร 2", เวลา: "16:00-00:00" },
    { ชื่อ: "นาย C", ตำแหน่ง: "เวร 3", เวลา: "00:00-08:00" },
  ]
}

// mock ฟังก์ชันสร้างภาพจากข้อมูล (คืน URL รูปภาพ)
async function generateImageFromData(data: any[]) {
  // ใน production ควรใช้ puppeteer หรือ node-html-to-image สร้างภาพจริง
  // ที่นี่ mock เป็น URL รูปภาพตัวอย่าง
  return "https://placehold.co/600x400?text=Night+Duty+Sheet"
} 