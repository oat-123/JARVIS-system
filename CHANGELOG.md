# Changelog

## [1.0.0] - 2024-01-XX

### Added
- ระบบ Authentication สำหรับผู้ใช้ 3 คน
- การจัดการฐานข้อมูลตามผู้ใช้ที่ login
- ไฟล์ config สำหรับการตั้งค่าผู้ใช้ (`config/auth.ts`)
- การรองรับ sheetname ในทุกโมดูล

### Changed
- อัปเดต interface ของโมดูลต่างๆ เพื่อรองรับ sheetName
- ปรับปรุงระบบ Dashboard เพื่อส่ง sheetname ไปยังโมดูล
- อัปเดต README.md พร้อมคำแนะนำการใช้งาน

### Technical Details

#### ผู้ใช้ที่รองรับ
| Username | Password | Sheet Name | กลุ่ม |
|----------|----------|------------|-------|
| oat | crma74 | ชั้น4_พัน4 | ชั้น4_พัน4 |
| time | crma74 | ชั้น4_พัน1 | ชั้น4_พัน1 |
| chai | crma74 | ชั้น4_พัน3 | ชั้น4_พัน3 |

#### ไฟล์ที่เปลี่ยนแปลง
- `app/page.tsx` - อัปเดตระบบ authentication
- `components/dashboard.tsx` - เพิ่ม sheetname ใน interface
- `components/modules/*.tsx` - อัปเดต interface เพื่อรองรับ sheetName
- `config/auth.ts` - ไฟล์ config ใหม่
- `README.md` - อัปเดตเอกสาร
- `test-auth.md` - คู่มือการทดสอบ

#### การทำงานของระบบ
1. ผู้ใช้ login ด้วย username และ password
2. ระบบตรวจสอบข้อมูลใน config/auth.ts
3. หาก login สำเร็จ ระบบจะเลือก sheetname ตามผู้ใช้
4. ทุกโมดูลจะใช้ฐานข้อมูลที่ตรงกับผู้ใช้ที่ login
5. การอัปเดตข้อมูลจะบันทึกลงใน Google Sheets ตาม sheetname

### Environment Variables Required
```env
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
```

### Testing
- ใช้ไฟล์ `test-auth.md` สำหรับการทดสอบระบบ
- ทดสอบ login/logout ของผู้ใช้ทั้ง 3 คน
- ทดสอบการเปลี่ยนฐานข้อมูลตามผู้ใช้
- ทดสอบการทำงานของโมดูลต่างๆ 