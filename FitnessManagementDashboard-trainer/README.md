# Fitness Management Dashboard (Trainer)

## 📖 ภาพรวม

**Fitness Management Dashboard** เป็น Web Application สำหรับ **Personal Trainer** ในการจัดการลูกเทรน (Clients), สร้างโปรแกรมการออกกำลังกาย, บันทึกผลการฝึก, และติดตามความก้าวหน้า

สร้างด้วย **React + TypeScript + Vite** ใช้ **shadcn/ui** สำหรับ UI Components และ **Tailwind CSS** สำหรับ Styling

---

## ✨ คุณสมบัติหลัก

### 🏠 Dashboard

- แสดงสถิติภาพรวม (จำนวนลูกเทรน, Sessions ที่กำลังจะมาถึง)
- Quick Actions (เพิ่มลูกเทรน, สร้างโปรแกรม, จัดตารางนัด)
- Recent Activities

### 👥 Client Management

- **Client List:** ดูรายชื่อลูกเทรนทั้งหมดพร้อมสถานะ (Active/Paused)
- **Client Profile:** ข้อมูลส่วนตัว, เป้าหมาย, ประวัติสุขภาพ
- **Add/Edit Client:** เพิ่มและแก้ไขข้อมูลลูกเทรน
- **Client Notes:** บันทึกและดูโน้ตเกี่ยวกับลูกเทรน
- **Progress Tracking:** ดูความคืบหน้าของแต่ละคน

### 💪 Exercise Library

- **Exercise Database:** คลังท่าออกกำลังกายมากกว่า 20+ ท่า
- **Search & Filter:** ค้นหาตามชื่อ, กล้ามเนื้อ, ประเภท
- **Add/Edit Exercises:** สร้างและแก้ไขท่าฝึกในคลัง
- **Exercise Details:** คำอธิบาย, วิธีทำ, กล้ามเนื้อที่ใช้

### 📋 Program Builder

- **Create Templates:** สร้างโปรแกรมการออกกำลังกาย (Templates)
- **Multi-Week Programs:** รองรับโปรแกรมหลายสัปดาห์
- **Daily Workouts:** แบ่งวันเป็น Upper/Lower, Push/Pull, Full Body
- **Section Types:** แบ่งเซสชันเป็น Warmup, Main, Cooldown
- **Exercise Programming:** กำหนด Sets, Reps, Weight, Rest, RPE
- **Assign Programs:** มอบหมายโปรแกรมให้ลูกเทรน

### 📅 Schedule & Calendar

- **Calendar View:** ปฏิทินแสดง Sessions กับลูกเทรนทั้งหมด
- **Create Sessions:** สร้างนัดหมายเทรนใหม่
- **Edit/Reschedule:** แก้ไขหรือเลื่อนเวลา
- **Calendar Notes:** เพิ่มโน้ตลงปฏิทิน (วันพัก, หมายเหตุ)
- **Status Management:** ติดตามสถานะ (Scheduled, Completed, Cancelled)

### 📊 Session Logging

- **Session View:** ดูรายละเอียดการฝึกแต่ละครั้ง
- **Exercise Logging:** บันทึกผลการฝึกแต่ละท่า
- **Set Tracking:** บันทึก Weight, Reps, RPE ของแต่ละ Set
- **Session Summary:** สรุปผลการฝึกและ Feedback

### 📈 Reports & Analytics

- **Progress Reports:** รายงานความก้าวหน้าของลูกเทรน
- **Body Metrics Charts:** กราฟแสดงน้ำหนัก, BMI, Body Fat
- **1RM Progress:** ติดตามความแข็งแรงเพิ่มขึ้น
- **Volume Tracking:** ปริมาณการฝึกรวม
- **Goal-Specific Reports:** รายงานแยกตามเป้าหมาย (Weight Loss, Muscle Building, Strength, General Health)

### ⚙️ Settings & Profile

- **Trainer Profile:** จัดการข้อมูลโปรไฟล์ Trainer
- **Upload Avatar:** อัปโหลดรูปโปรไฟล์
- **Authentication:** Login/Logout, Google OAuth

---

## 🛠️ Technology Stack

- **⚛️ React 18** - UI Library
- **📘 TypeScript** - Type Safety
- **⚡ Vite** - Build Tool (Fast Development)
- **🎨 Tailwind CSS** - Utility-first CSS Framework
- **🧩 shadcn/ui** - Re-usable UI Components
- **📊 Recharts** - Charting Library
- **🔄 Axios** - HTTP Client
- **🎯 React Router** - Client-side Routing
- **📅 date-fns** - Date Utilities
- **🎭 Lucide React** - Icon Library

---

## 📁 โครงสร้างโปรเจกต์

```
FitnessManagementDashboard-trainer/
├── src/
│   ├── components/          # Reusable Components
│   │   ├── ui/             # shadcn/ui Base Components
│   │   ├── Dashboard.tsx   # Dashboard Page
│   │   ├── Clients.tsx     # Client Management
│   │   ├── ExerciseLibrary.tsx
│   │   ├── ProgramBuilder.tsx
│   │   ├── Calendar.tsx
│   │   ├── SessionLog.tsx
│   │   ├── Reports.tsx
│   │   └── ...
│   ├── lib/                # Utility Functions
│   │   └── utils.ts
│   ├── App.tsx             # Main App Component
│   ├── main.tsx            # Entry Point
│   └── index.css           # Global Styles
├── public/                 # Static Assets
├── package.json
├── vite.config.ts          # Vite Configuration
├── tailwind.config.js      # Tailwind Configuration
└── README.md              # เอกสารนี้
```

---

## 🚀 การติดตั้งและใช้งาน

### 1. ติดตั้ง Dependencies

```bash
cd FitnessManagementDashboard-trainer
npm install
```

### 2. ตั้งค่า Environment (ถ้าจำเป็น)

สร้างไฟล์ `.env.local`:

```env
VITE_API_URL=http://localhost:8080/api/v1
```

### 3. รัน Development Server

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ `http://localhost:5173`

### 4. Build สำหรับ Production

```bash
npm run build
```

Output จะอยู่ในโฟลเดอร์ `dist/`

### 5. Preview Production Build

```bash
npm run preview
```

---

## 🔌 API Integration

Dashboard เชื่อมต่อกับ **Backend API** ที่รันบน `http://localhost:8080`

**การ Authentication:**

- ใช้ JWT Token ที่เก็บใน HTTP-only Cookie
- Axios ส่ง Cookie ไปกับทุก Request อัตโนมัติ (`withCredentials: true`)

**ตัวอย่าง API Calls:**

```typescript
// Login
axios.post("/api/v1/auth/login", { username, password });

// Get Clients
axios.get("/api/v1/clients");

// Create Program
axios.post("/api/v1/programs", programData);
```

---

## 🎨 UI Components

ใช้ **shadcn/ui** สำหรับ Base Components:

- `Button`, `Input`, `Select`, `Dialog`
- `Table`, `Card`, `Tabs`, `Avatar`
- `Calendar`, `Popover`, `Command`

**ติดตั้ง Component ใหม่:**

```bash
npx shadcn-ui@latest add button
```

---

## 🧭 Routing

| Route          | Page             | Description       |
| -------------- | ---------------- | ----------------- |
| `/`            | Dashboard        | หน้าหลัก          |
| `/clients`     | Clients          | จัดการลูกเทรน     |
| `/clients/:id` | Client Detail    | รายละเอียดลูกเทรน |
| `/exercises`   | Exercise Library | คลังท่าฝึก        |
| `/programs`    | Program Builder  | สร้างโปรแกรม      |
| `/calendar`    | Calendar         | ปฏิทินนัดหมาย     |
| `/session-log` | Session Log      | บันทึกการฝึก      |
| `/reports`     | Reports          | รายงานและกราฟ     |
| `/settings`    | Settings         | ตั้งค่าโปรไฟล์    |
| `/login`       | Login            | เข้าสู่ระบบ       |

---

## 🔗 Related Services

- **Backend API:** `../../backend/userservice` - Go REST API
- **Database:** `../../backend/userdatabase` - PostgreSQL
- **Trainee Dashboard:** `../../Clientdashboard` - สำหรับลูกเทรน

---

## 📝 หมายเหตุ

- Dashboard รันบนพอร์ต `5173` (Vite default)
- ต้องรัน Backend API ก่อนถึงจะใช้งานได้
- รองรับ Dark Mode (ปรับได้ใน Settings)
- Responsive Design - ใช้งานได้บนมือถือและแท็บเล็ต
- ใช้ Google OAuth สำหรับ Login (ต้องตั้งค่า Google Cloud Console)

---

## 🐛 การแก้ไขปัญหา

**ปัญหา: ไม่สามารถเข้าถึง API ได้**

- ตรวจสอบว่า Backend รันอยู่ที่ `http://localhost:8080`
- ตรวจสอบ CORS settings ใน Backend

**ปัญหา: Login ไม่ได้**

- ตรวจสอบ Database มีข้อมูล User หรือไม่
- ตรวจสอบ JWT Secret ใน Backend `.env`

**ปัญหา: Components ไม่แสดงผล**

- ลองรัน `npm install` ใหม่
- ลบโฟลเดอร์ `node_modules` และ `npm install` อีกครั้ง

---

## 🎯 การพัฒนาต่อ

แนวทางการพัฒนาเพิ่มเติม:

- เพิ่ม Unit Tests (Vitest + React Testing Library)
- เพิ่ม E2E Tests (Playwright/Cypress)
- เพิ่ม State Management (Zustand/Redux)
- เพิ่ม Real-time Updates (WebSocket)
- เพิ่ม PWA Support
- เพิ่ม Offline Mode
