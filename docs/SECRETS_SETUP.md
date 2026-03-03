# 🔐 GitHub Secrets Setup

ตั้งค่า Secrets ที่: `https://github.com/saisiriwan/Fitness-Project/settings/secrets/actions`

คลิก **New repository secret** แล้วเพิ่มทีละตัว:

## Backend (.env ของ userservice)

| Secret Name         | ค่า                   | ตัวอย่าง          |
| ------------------- | --------------------- | ----------------- |
| `POSTGRES_DB`       | ชื่อ database         | `fitness_db`      |
| `POSTGRES_USER`     | username ของ postgres | `postgres`        |
| `POSTGRES_PASSWORD` | password ของ postgres | `your_password`   |
| `POSTGRES_PORT`     | port ที่ expose       | `5432`            |
| `JWT_SECRET`        | secret key สำหรับ JWT | `your_jwt_secret` |

> [!CAUTION]
> **ห้าม** commit `.env` ขึ้น GitHub โดยตรง — ใช้ Secrets เท่านั้น
> ไฟล์ `.env` อยู่ใน `.gitignore` อยู่แล้ว ✅

## วิธีใช้ Secrets ใน script (ถ้าต้องการ)

ถ้าต้องการให้ Runner สร้าง `.env` file อัตโนมัติ สามารถเพิ่มในขั้นตอน workflow ได้:

```yaml
- name: Create .env file
  shell: pwsh
  run: |
    @"
    POSTGRES_DB=${{ secrets.POSTGRES_DB }}
    POSTGRES_USER=${{ secrets.POSTGRES_USER }}
    POSTGRES_PASSWORD=${{ secrets.POSTGRES_PASSWORD }}
    JWT_SECRET=${{ secrets.JWT_SECRET }}
    "@ | Set-Content "${{ github.workspace }}\backend\userservice\.env"
```
