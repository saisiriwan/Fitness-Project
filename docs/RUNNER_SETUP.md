# 🚀 GitHub Actions Self-hosted Runner Setup (Windows)

คู่มือนี้ทำครั้งเดียว เพื่อให้ GitHub Actions control เครื่องของคุณได้

---

## ขั้นตอนที่ 1 — เปิด GitHub Repository Settings

1. ไปที่ `https://github.com/saisiriwan/Fitness-Project`
2. คลิก **Settings** (แถบบนของ repo)
3. เลือก **Actions** → **Runners**
4. คลิกปุ่ม **New self-hosted runner**
5. เลือก OS: **Windows** / Architecture: **x64**

GitHub จะแสดง commands ที่ต้องรัน → คัดลอกมาใช้ในขั้นตอนถัดไป

---

## ขั้นตอนที่ 2 — ติดตั้ง Runner บน Windows

เปิด **PowerShell ในฐานะ Administrator** แล้วรันตามลำดับ:

```powershell
# 1. สร้าง folder สำหรับ runner
mkdir C:\actions-runner; cd C:\actions-runner

# 2. ดาวน์โหลด runner (ตัวเลขเวอร์ชันอาจต่างกัน ดูจากหน้า GitHub)
Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/v2.322.0/actions-runner-win-x64-2.322.0.zip -OutFile actions-runner-win-x64.zip

# 3. แตกไฟล์
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD\actions-runner-win-x64.zip", "$PWD")

# 4. Register runner กับ repo ของคุณ
# (copy token จากหน้า GitHub Settings → Actions → Runners → New runner)
.\config.cmd --url https://github.com/saisiriwan/Fitness-Project --token <YOUR_TOKEN_HERE>
```

> [!IMPORTANT]
> `<YOUR_TOKEN_HERE>` ต้องเอามาจาก GitHub UI ทุกครั้งที่ register (token หมดอายุ 1 ชั่วโมง)

---

## ขั้นตอนที่ 3 — ติดตั้งเป็น Windows Service (รันอัตโนมัติตอน boot)

```powershell
# ติดตั้งเป็น Service
.\svc.cmd install

# Start service ทันที
.\svc.cmd start
```

ตรวจสอบว่า runner ออนไลน์:
→ ไปที่ GitHub: **Settings → Actions → Runners** → ต้องเห็น runner สถานะ 🟢 **Idle**

---

## ขั้นตอนที่ 4 — ทดสอบ Pipeline

```bash
# push commit ว่างเพื่อ trigger pipeline
git commit --allow-empty -m "test: trigger CI/CD pipeline"
git push origin main
```

ดูผลที่: `https://github.com/saisiriwan/Fitness-Project/actions`

---

## คำสั่งจัดการ Runner

```powershell
# หยุด service
.\svc.cmd stop

# เริ่มใหม่
.\svc.cmd start

# ถอนติดตั้ง
.\svc.cmd uninstall
```
