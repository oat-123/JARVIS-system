import { NextRequest, NextResponse } from "next/server"

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

type UserKey = 'oat' | 'time' | 'chai'
// Mock user database
const users: Record<UserKey, { sheet_name: string }> = {
  oat: { sheet_name: "ชั้น4_พัน4" },
  time: { sheet_name: "ชั้น4_พัน1" },
  chai: { sheet_name: "ชั้น4_พัน3" }
}

// In-memory state (mock, ไม่เหมาะกับ production)
const userState: Record<string, { name?: UserKey }> = {}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const events = body.events

  for (const event of events) {
    const userId = event.source.userId
    if (event.type === "message" && event.message.type === "text") {
      const text = event.message.text.trim().toLowerCase()
      // 1. ถ้ายังไม่มีชื่อใน state ให้ถามชื่อ
      if (!userState[userId]?.name) {
        // ถ้า user พิมพ์ชื่อมาเลย ให้ validate ทันที
        if (["oat", "time", "chai"].includes(text)) {
          const name = text as UserKey
          userState[userId] = { name }
          await replyMenu(event.replyToken, name)
        } else {
          await replyText(event.replyToken, "กรุณาพิมพ์ชื่อของคุณ เช่น oat, time, chai")
        }
      } else {
        // 2. ถ้ามีชื่อแล้ว
        if (text === "เปลี่ยนชื่อ") {
          delete userState[userId]
          await replyText(event.replyToken, "กรุณาพิมพ์ชื่อของคุณใหม่ เช่น oat, time, chai")
        } else if (["เวรรักษาการณ์", "เวรเตรียมการ", "จัดยอดพิธี", "ยอดปล่อย", "สถิติโดนยอด"].includes(text)) {
          const name = userState[userId].name
          if (name && users[name]) {
            await replyText(event.replyToken, `คุณ (${name}) เลือกฟังก์ชัน: ${text}\n(ดำเนินการต่อได้ที่นี่...)`)
          } else {
            delete userState[userId]
            await replyText(event.replyToken, "ไม่พบผู้ใช้ในระบบ กรุณาพิมพ์ชื่อใหม่อีกครั้ง เช่น oat, time, chai")
          }
        } else {
          // ถ้าไม่ใช่ฟังก์ชันหรือเปลี่ยนชื่อ ให้แสดงเมนูอีกครั้ง
          const name = userState[userId].name
          await replyMenu(event.replyToken, name || "")
        }
      }
    }
  }
  return NextResponse.json({ status: "ok" })
}

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
                  { type: "button", style: "secondary", action: { type: "message", label: "เปลี่ยนชื่อ", text: "เปลี่ยนชื่อ" } },
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