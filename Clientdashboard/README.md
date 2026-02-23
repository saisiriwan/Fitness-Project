# Client Dashboard (Trainee)

## 📖 ภาพรวม

**Client Dashboard** เป็น Web Application สำหรับ **Trainee/Client** (ลูกเทรน) ที่ต้องการดูโปรแกรมการฝึกที่ Trainer มอบหมาย, ติดตามความก้าวหน้า, และบันทึกผลการออกกำลังกาย

สร้างด้วย **React + TypeScript + Vite** ใช้ **shadcn/ui** สำหรับ UI Components และ **Tailwind CSS** สำหรับ Styling

---

## ✨ คุ Properties หลัก

### 🏠 Dashboard

- แสดงภาพรวมข้อมูลส่วนตัว
- Quick Stats (น้ำหนักล่าสุด, Sessions ที่กำลังจะมาถึง)
- ความคืบหน้าในการบรรลุเป้าหมาย
- ตารางนัดหมายกับ Trainer

### 📋 My Program

- **View Assigned Program:** ดูโปรแกรมที่ Trainer มอบหมาย
- **Weekly Schedule:** ตารางการฝึกแต่ละสัปดาห์
- **Daily Workouts:** วันละกี่เซต, ท่าไหนบ้าง
- **Exercise Details:** ดูคำอธิบายและวิธีทำท่าฝึก
- **Sets & Reps:** ดูปริมาณงานที่ต้องทำ (12 reps @ 75% 1RM, etc.)

### 📆 Session History

- **Past Sessions:** ดูประวัติการฝึกย้อนหลัง
- **Session Details:** รายละเอียดแต่ละครั้ง
- **Performance Review:** ดูผลงานที่ทำได้ (Weight, Reps, RPE)
- **Trainer Feedback:** ดูคำแนะนำจาก Trainer

### 📊 Progress Tracking

- **Body Metrics:** กราฟแสดงน้ำหนัก, BMI, Body Fat, รอบวง
- **Goal Progress:** แสดงความคืบหน้าสู่เป้าหมาย
- **Strength Progress:** ดูความแข็งแรงเพิ่มขึ้น (1RM, Volume)
- **Workout Consistency:** สถิติความสม่ำเสมอในการฝึก

### 💪 Exercise Library (Read-Only)

- **Browse Exercises:** ดูท่าฝึกในคลัง
- **Exercise Info:** อ่านคำอธิบาย, วิธีทำ, กล้ามเนื้อที่ใช้
- **Search:** ค้นหาท่าฝึกที่สนใจ

### 📝 Communication

- **View Notes:** ดูโน้ตที่ Trainer เขียนถึง
- **Session Feedback:** ดูคำติชมหลังเทรน
- **Assignments:** ดูการบ้านที่ Trainer มอบหมาย

### ⚙️ Profile Settings

- **Personal Info:** ข้อมูลส่วนตัว, เป้าหมาย
- **Body Measurements:** บันทึกการวัดค่าต่างๆ (ถ้า Trainer อนุญาต)
- **Avatar:** เปลี่ยนรูปโปรไฟล์
- **Authentication:** Login/Logout

---

## 🛠️ Technology Stack

- **⚛️ React 18** - UI Library
- **📘 TypeScript** - Type Safety
- **⚡ Vite** - Build Tool (Fast Development)
- **🎨 Tailwind CSS** - Utility-first CSS Framework
- **🧩 shadcn/ui** - Re-usable UI Components
- **📊 Recharts** - Charting Library for Progress Graphs
- **🔄 Axios** - HTTP Client for API Calls
- **📅 date-fns** - Date Utilities
- **🎭 Lucide React** - Icon Library

---

## 📁 โครงสร้างโปรเจกต์

```
Clientdashboard/
├── src/
│   ├── components/          # Reusable Components
│   │   ├── ui/             # shadcn/ui Base Components
│   │   ├── Dashboard.tsx   # Main Dashboard
│   │   ├── MyProgram.tsx   # View Assigned Program
│   │   ├── SessionHistory.tsx
│   │   ├── Progress.tsx    # Progress Charts
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
cd Clientdashboard
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
// Login as Trainee
axios.post("/api/v1/auth/login", { username, password });

// Get My Profile
axios.get("/api/v1/trainees/me");

// Get My Sessions
axios.get("/api/v1/clients/:id/sessions");

// Get My Metrics
axios.get("/api/v1/clients/:id/metrics");
```

**API Endpoints ที่ใช้:**

- `GET /api/v1/trainees/me` - ดึงโปรไฟล์ตัวเอง
- `GET /api/v1/clients/:id/sessions` - ดึงประวัติการฝึก
- `GET /api/v1/clients/:id/metrics` - ดึงข้อมูล Body Metrics
- `GET /api/v1/clients/:id/notes` - ดูโน้ตจาก Trainer
- `GET /api/v1/programs/:id` - ดูรายละเอียดโปรแกรม
- `GET /api/v1/schedules` - ดูตารางนัดหมาย

---

## 🎨 UI Components

ใช้ **shadcn/ui** สำหรับ Base Components:

- `Card`, `Button`, `Input`, `Avatar`
- `Table`, `Tabs`, `Badge`
- `Chart` (from Recharts)
- `Calendar`, `Popover`

**ติดตั้ง Component ใหม่:**

```bash
npx shadcn-ui@latest add card
```

---

## 🧭 Routing

| Route         | Page             | Description                |
| ------------- | ---------------- | -------------------------- |
| `/`           | Dashboard        | หน้าหลักของ Trainee        |
| `/my-program` | My Program       | โปรแกรมที่ Trainer มอบหมาย |
| `/sessions`   | Session History  | ประวัติการฝึก              |
| `/progress`   | Progress         | กราฟความก้าวหน้า           |
| `/exercises`  | Exercise Library | คลังท่าฝึก (ดูอย่างเดียว)  |
| `/profile`    | Profile Settings | ตั้งค่าโปรไฟล์             |
| `/login`      | Login            | เข้าสู่ระบบ                |

---

## 🔐 User Roles

**Trainee Account:**

- สร้างโดย Trainer ผ่าน Trainer Dashboard
- Trainer สามารถตั้ง Username/Password ให้
- หรือ Trainee สมัครด้วยตัวเอง (ถ้าเปิดให้)

**Permissions:**

- ✅ ดูโปรแกรมที่ถูก Assign
- ✅ ดูประวัติการฝึก
- ✅ ดูความก้าวหน้า
- ✅ ดูโน้ตจาก Trainer
- ❌ สร้าง/แก้ไขโปรแกรม
- ❌ จัดการลูกเทรนคนอื่น

---

## 📱 Responsive Design

Dashboard ออกแบบให้ใช้งานได้ทุกอุปกรณ์:

- **Desktop:** แสดงข้อมูลครบถ้วน, Multi-column Layout
- **Tablet:** Responsive Grid, Collapsible Sidebar
- **Mobile:** Single-column, Bottom Navigation

---

## 🎯 ความแตกต่างจาก Trainer Dashboard

| Feature                | Trainer Dashboard | Client Dashboard |
| ---------------------- | ----------------- | ---------------- |
| **ดูลูกเทรนทั้งหมด**   | ✅                | ❌               |
| **สร้างโปรแกรม**       | ✅                | ❌               |
| **มอบหมายโปรแกรม**     | ✅                | ❌               |
| **สร้าง Session**      | ✅                | ❌               |
| **ดูโปรแกรมของตัวเอง** | ❌                | ✅               |
| **ดูประวัติการฝึก**    | ✅ (ทุกคน)        | ✅ (เฉพาะตัวเอง) |
| **ดูความก้าวหน้า**     | ✅ (ทุกคน)        | ✅ (เฉพาะตัวเอง) |
| **แก้ไขท่าฝึกในคลัง**  | ✅                | ❌               |

---

## 🔗 Related Services

- **Backend API:** `../../backend/userservice` - Go REST API
- **Database:** `../../backend/userdatabase` - PostgreSQL
- **Trainer Dashboard:** `../../FitnessManagementDashboard-trainer` - สำหรับ Trainer

---

## 📝 หมายเหตุ

- Dashboard รันบนพอร์ต `5173` (Vite default) หรือพอร์ตอื่นหาก `5173` ถูกใช้งาน
- ต้องรัน Backend API ก่อนถึงจะใช้งานได้
- รองรับ Dark Mode (ถ้ามีการตั้งค่า)
- Trainee ต้องมีบัญชีที่ถูกสร้างโดย Trainer ก่อน

---

## 🐛 การแก้ไขปัญหา

**ปัญหา: Login ไม่ได้**

- ตรวจสอบว่า Trainer สร้าง Account ให้แล้วหรือยัง
- ตรวจสอบ Username/Password ที่ถูกต้อง
- ตรวจสอบว่า Backend API รันอยู่

**ปัญหา: ไม่มีโปรแกรมแสดง**

- ตรวจสอบว่า Trainer มอบหมายโปรแกรมให้แล้วหรือยัง
- ตรวจสอบความเชื่อมต่อกับ API

**ปัญหา: กราฟไม่แสดงผล**

- ตรวจสอบว่ามีข้อมูล Metrics หรือยัง
- ต้องมีการบันทึกข้อมูลอย่างน้อย 2 ครั้งขึ้นไป

---

## 🎯 การพัฒนาต่อ

แนวทางการพัฒนาเพิ่มเติม:

- เพิ่ม Self-logging (ให้ Trainee บันทึกผลการฝึกเอง)
- เพิ่ม Chat/Messaging กับ Trainer
- เพิ่ม Nutrition Tracking
- เพิ่ม Photo Progress (อัปโหลดรูปความก้าวหน้า)
- เพิ่ม Workout Reminders (Notification)
- เพิ่ม Achievement Badges
- เพิ่ม Community Features
