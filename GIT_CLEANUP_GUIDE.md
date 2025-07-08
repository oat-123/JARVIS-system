# Git Cleanup Guide

## การแก้ไขปัญหา "Cannot rewrite branches: You have unstaged changes"

### 🔍 สาเหตุของปัญหา

เมื่อคุณมี unstaged changes ใน git repository (ไฟล์ที่แก้ไขแต่ยังไม่ได้ commit) git จะไม่อนุญาตให้ทำ filter-branch เพราะอาจทำให้ข้อมูลหายไป

### 🛠️ วิธีแก้ไข

#### 1. ใช้สคริปต์เตรียมการ (แนะนำ)

```bash
# ตรวจสอบและจัดการ unstaged changes
npm run prepare-cleanup
```

สคริปต์นี้จะ:
- ตรวจสอบ unstaged changes
- ให้ตัวเลือกในการจัดการ:
  1. Commit all changes
  2. Stash changes
  3. Show git status
  4. Exit

#### 2. จัดการด้วยตนเอง

**ตรวจสอบสถานะ:**
```bash
git status
```

**ตัวเลือกที่ 1: Commit changes**
```bash
git add .
git commit -m "Your commit message"
```

**ตัวเลือกที่ 2: Stash changes**
```bash
git stash push -m "Stash before cleanup"
```

**ตัวเลือกที่ 3: Discard changes (ระวัง!)**
```bash
git checkout -- .
```

#### 3. ใช้สคริปต์ทำความสะอาดที่อัปเดตแล้ว

```bash
npm run clean-history
```

สคริปต์ใหม่จะ:
- ตรวจสอบ unstaged changes อัตโนมัติ
- ถามว่าต้องการ commit changes หรือไม่
- ดำเนินการต่อหลังจากจัดการ changes แล้ว

### 📋 ขั้นตอนการทำงาน

#### ขั้นตอนที่ 1: ตรวจสอบความปลอดภัย
```bash
npm run security-check
```

#### ขั้นตอนที่ 2: เตรียมการ
```bash
npm run prepare-cleanup
```

#### ขั้นตอนที่ 3: ทำความสะอาด
```bash
npm run clean-history
```

#### ขั้นตอนที่ 4: Push changes
```bash
git push --force-with-lease origin main
```

### ⚠️ ข้อควรระวัง

1. **Backup ก่อนทำ:**
   ```bash
   git branch backup-before-cleanup-$(date +%Y%m%d_%H%M%S)
   ```

2. **ตรวจสอบ changes ก่อน commit:**
   ```bash
   git diff
   ```

3. **หากใช้ stash:**
   ```bash
   # ดู stash list
   git stash list
   
   # เรียก stash กลับมา
   git stash pop
   ```

### 🔧 การแก้ไขปัญหาที่พบบ่อย

#### ปัญหา: "Permission denied"
```bash
# ตรวจสอบสิทธิ์ไฟล์
ls -la scripts/clean-history.js

# ให้สิทธิ์ execute
chmod +x scripts/clean-history.js
```

#### ปัญหา: "Command not found"
```bash
# ตรวจสอบ Node.js
node --version

# ตรวจสอบ npm
npm --version
```

#### ปัญหา: "Git not found"
```bash
# ตรวจสอบ git
git --version

# ติดตั้ง git ถ้าจำเป็น
# Windows: https://git-scm.com/download/win
# macOS: brew install git
# Linux: sudo apt-get install git
```

### 📊 การตรวจสอบผลลัพธ์

#### ตรวจสอบ git history
```bash
git log --oneline
```

#### ตรวจสอบ backup branch
```bash
git branch
```

#### ตรวจสอบว่าไม่มีข้อมูลที่สำคัญ
```bash
npm run security-check
```

### 🚨 กรณีฉุกเฉิน

หากเกิดปัญหาขึ้น:

1. **ยกเลิกการทำงาน:**
   ```bash
   # กด Ctrl+C ในระหว่างการทำงาน
   ```

2. **กู้คืนจาก backup:**
   ```bash
   git checkout backup-before-cleanup-YYYYMMDD_HHMMSS
   ```

3. **ลบ temporary files:**
   ```bash
   # Windows
   del %TEMP%\filter-branch-script.sh
   
   # macOS/Linux
   rm /tmp/filter-branch-script.sh
   ```

### 📞 การขอความช่วยเหลือ

หากยังมีปัญหา:

1. **ตรวจสอบ logs:**
   ```bash
   npm run security-check
   npm run check-env
   ```

2. **ดูคู่มือเพิ่มเติม:**
   - `SECURITY.md`
   - `TROUBLESHOOTING.md`
   - `scripts/README.md`

3. **ตรวจสอบ git status:**
   ```bash
   git status
   git log --oneline -10
   ```

### 🎯 สรุป

1. ใช้ `npm run prepare-cleanup` เพื่อจัดการ unstaged changes
2. ใช้ `npm run clean-history` เพื่อทำความสะอาด git history
3. ตรวจสอบผลลัพธ์ด้วย `npm run security-check`
4. Push changes ไปยัง remote repository 