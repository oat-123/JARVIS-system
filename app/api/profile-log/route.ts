import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const time = new Date().toISOString()

    // Log to server terminal with complete data
    const summary = {
      time,
      name: body?.name ?? null,
      position: body?.position ?? null,
      report: body?.report ?? null,
      enter433Dates: body?.enter433Dates ?? null,
      adminChpDates: body?.adminChpDates ?? null,
      // เพิ่มข้อมูลใหม่ทั้งหมด
      allPersonData: body?.allPersonData ?? null,
      detected433Columns: body?.detected433Columns ?? null,
      detectedAdminColumns: body?.detectedAdminColumns ?? null,
      metadata: body?.metadata ?? null,
    }

    // แสดงข้อมูลแบบละเอียด
    console.log('🔍 [PROFILE LOG] ข้อมูลที่ได้รับ:', JSON.stringify(summary, null, 2))

    // แสดงข้อมูลแบบสรุป
    if (body?.allPersonData) {
      const person = body.allPersonData
      console.log('📋 [PROFILE LOG] สรุปข้อมูล:', {
        time,
        name: `${person.ยศ || ''} ${person.ชื่อ || ''} ${person.สกุล || ''}`.trim(),
        position: person['ตำแหน่ง'] || person.ตำแหน่ง || '-',
        basicInfo: {
          ลำดับ: person.ลำดับ,
          ชั้นปีที่: person.ชั้นปีที่,
          ตอน: person.ตอน,
          สังกัด: person.สังกัด,
          เบอร์โทรศัพท์: person.เบอร์โทรศัพท์,
          คัดเกรด: person.คัดเกรด,
        },
        additionalInfo: {
          'ธุรการ ฝอ.': person['ธุรการ ฝอ.'],
          ตัวชน: person.ตัวชน,
          ส่วนสูง: person.ส่วนสูง,
          นักกีฬา: person.นักกีฬา,
          'ภารกิจอื่น ๆ': person['ภารกิจอื่น ๆ'],
          'ดูงานต่างประเทศ': person['ดูงานต่างประเทศ'],
          'เจ็บ (ใบรับรองแพทย์)': person['เจ็บ (ใบรับรองแพทย์)'],
          หมายเหตุ: person.หมายเหตุ,
        },
        reportInfo: person.reportInfo || { ถวายรายงาน: person.ถวายรายงาน, 'น.กำกับยาม': person['น.กำกับยาม'], วันที่: person.วันที่, reportHistory: person.reportHistory || [] },
        dynamicColumns: {
          '433_columns_count': person._433_columns?.length || 0,
          'admin_columns_count': person._admin_columns?.length || 0,
          '433_columns': person._433_columns?.map((col: any) => `${col.column}: ${col.value}`) || [],
          'admin_columns': person._admin_columns?.map((col: any) => `${col.column}: ${col.value}`) || [],
        },
        statistics: {
          '433_dates_count': person._433_dates?.filter((d: any) => d && d.toString().trim()).length || 0,
          'admin_dates_count': person._admin_dates?.filter((d: any) => d && d.toString().trim()).length || 0,
        }
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[PROFILE LOG][ERROR]', error)
    return NextResponse.json({ ok: false, error: 'failed to log' }, { status: 500 })
  }
}


