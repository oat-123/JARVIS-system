import { NextRequest, NextResponse } from "next/server"

// In-memory state สำหรับจำ userId กับ step (mock, ไม่เหมาะกับ production จริง)
const userState: Record<string, { step: string, name?: string }> = {}

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!

export async function POST(req: NextRequest) {
  const body = await req.json()
  const events = body.events

  for (const event of events) {
    const userId = event.source.userId
    if (event.type === "message" && event.message.type === "text") {
      const text = event.message.text.trim()
      // 1. ถ้ายังไม่มี state ให้ถามชื่อก่อน
      if (!userState[userId]) {
        userState[userId] = { step: "waiting_name" }
        await replyText(event.replyToken, "คุณคือใคร? กรุณาพิมพ์ชื่อของคุณ")
      } else if (userState[userId].step === "waiting_name") {
        // 2. ได้ชื่อแล้ว บันทึกชื่อและแสดงเมนูฟังก์ชัน
        userState[userId].name = text
        userState[userId].step = "menu"
        await replyMenu(event.replyToken, text)
      } else if (userState[userId].step === "menu") {
        // 3. เลือกฟังก์ชัน
        if (text === "เวรรักษาการณ์") {
          userState[userId].step = "waiting_sheet_name"
          await replyText(event.replyToken, "กรุณาพิมพ์ชื่อชีทที่ต้องการดู")
        } else if (text === "เวรเตรียมการ" || text === "จัดยอดพิธี" || text === "ยอดปล่อย" || text === "สถิติโดนยอด") {
          await replyText(event.replyToken, `คุณเลือกฟังก์ชัน: ${text}\n(ฟังก์ชันนี้ยังไม่เปิดใช้งานในเดโม)`)
        } else {
          await replyMenu(event.replyToken, userState[userId].name || "")
        }
      } else if (userState[userId].step === "waiting_sheet_name") {
        // 4. ได้ชื่อชีทแล้ว
        const sheetName = text
        const data = await fetchSheetData(sheetName)
        const imageUrl = await generateImageFromData(data)
        await replyImage(event.replyToken, imageUrl)
        // reset state กลับไปที่เมนู
        userState[userId].step = "menu"
        await replyMenu(event.replyToken, userState[userId].name || "")
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

// ฟังก์ชันส่งเมนูฟังก์ชัน (Flex Message)
async function replyMenu(replyToken: string, name: string) {
  const menu = {
    replyToken,
    messages: [
      {
        type: "flex",
        altText: `สวัสดีคุณ ${name}! เลือกฟังก์ชัน JARVIS`,
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: `สวัสดีคุณ ${name}!`, weight: "bold", size: "lg", margin: "md" },
              { type: "text", text: "เลือกฟังก์ชัน JARVIS", size: "md", margin: "sm" },
              {
                type: "box",
                layout: "vertical",
                margin: "lg",
                spacing: "sm",
                contents: [
                  { type: "button", style: "primary", action: { type: "message", label: "เวรรักษาการณ์", text: "เวรรักษาการณ์" } },
                  { type: "button", style: "primary", action: { type: "message", label: "เวรเตรียมการ", text: "เวรเตรียมการ" } },
                  { type: "button", style: "primary", action: { type: "message", label: "จัดยอดพิธี", text: "จัดยอดพิธี" } },
                  { type: "button", style: "primary", action: { type: "message", label: "ยอดปล่อย", text: "ยอดปล่อย" } },
                  { type: "button", style: "primary", action: { type: "message", label: "สถิติโดนยอด", text: "สถิติโดนยอด" } },
                  { type: "button", style: "secondary", action: { type: "uri", label: "เข้าชมเว็บไซต์", uri: "https://jarvis-6374.vercel.app/" } },
                ],
              },
            ],
          },
        },
      },
    ],
  }
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(menu),
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