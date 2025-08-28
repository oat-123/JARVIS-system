import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const time = new Date().toISOString()

    // Log to server terminal
    // Summarize important fields for readability
    const summary = {
      time,
      name: body?.name ?? null,
      position: body?.position ?? null,
      report: body?.report ?? null,
      enter433: body?.enter433 ?? null,
      adminChp: body?.adminChp ?? null,
    }
    // eslint-disable-next-line no-console
    console.log('[PROFILE LOG]', JSON.stringify(summary, null, 2))

    return NextResponse.json({ ok: true })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[PROFILE LOG][ERROR]', error)
    return NextResponse.json({ ok: false, error: 'failed to log' }, { status: 500 })
  }
}


