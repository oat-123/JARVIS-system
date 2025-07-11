import { NextRequest, NextResponse } from "next/server"

const CHANNEL_ID = process.env.LINE_CHANNEL_ID
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

export async function POST(req: NextRequest) {
  const body = await req.json()
  const events = body.events

  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const text = event.message.text.trim().toLowerCase()
      if (text === "jarvis") {
        // ส่งเมนู 6 ฟังก์ชัน
        await replyMenu(event.replyToken)
      }
    }
  }
  return NextResponse.json({ status: "ok" })
}

async function replyMenu(replyToken: string) {
  const menu = {
    replyToken,
    messages: [
      {
        type: "flex",
        altText: "เลือกฟังก์ชัน JARVIS",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "เลือกฟังก์ชัน JARVIS", weight: "bold", size: "lg", margin: "md" },
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