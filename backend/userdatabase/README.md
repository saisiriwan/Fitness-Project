# User Database (PostgreSQL)

## 📖 ภาพรวม

นี่คือ **Database Layer** ของระบบ Fitness Management Platform โดยใช้ **PostgreSQL** เป็นฐานข้อมูลหลัก ทำหน้าที่เก็บข้อมูลผู้ใช้งาน (Users, Trainers, Clients), โปรแกรมการออกกำลังกาย (Programs), ท่าออกกำลังกาย (Exercises), ตารางนัดหมาย (Schedules), บันทึกการเทรน (Session Logs) และข้อมูลสุขภาพของลูกค้า (Client Metrics)

---

## 📁 โครงสร้างไฟล์

```
userdatabase/
├── docker-compose.yml       # พิมพ์เขียวสำหรับรัน PostgreSQL + PgAdmin
├── docker/
│   ├── Dockerfile          # Image สำหรับสร้าง PostgreSQL Container
│   └── init.sql            # สคริปต์สร้างตารางและข้อมูลตัวอย่าง
├── backup/                 # Service สำหรับ Backup ฐานข้อมูล
└── README.md              # เอกสารนี้
```

---

## 🗄️ โครงสร้างฐานข้อมูล

### 1️⃣ **Users & Authentication**

#### `users` - ตารางผู้ใช้งานหลัก (Authentication)

เก็บข้อมูลสำหรับการ Login และบทบาทของผู้ใช้

- `id` (SERIAL PRIMARY KEY)
- `name`, `username`, `email` (ข้อมูลพื้นฐาน)
- `password_hash` (รหัสผ่านที่เข้ารหัสแล้ว)
- `role` ('trainer' หรือ 'trainee')

#### `trainers` - โปรไฟล์ Trainer

เก็บข้อมูลเพิ่มเติมเฉพาะ Trainer

- `user_id` (FK → users.id)
- `phone_number`, `avatar_url`, `bio`
- `specialization`, `certification`, `experience_years`

#### `clients` - โปรไฟล์ Client/Trainee

เก็บข้อมูลลูกค้าและสุขภาพ

- `user_id` (FK → users.id) - สำหรับ Client ที่มี Account
- `trainer_id` (FK → users.id) - Trainer ที่ดูแล
- `name`, `email`, `phone_number`, `avatar_url`
- `birth_date`, `gender`, `height_cm`, `weight_kg`
- `goal`, `injuries`, `activity_level`, `medical_conditions`
- `target_weight`, `target_date`, `status`

---

### 2️⃣ **Exercise Library**

#### `exercises` - คลังท่าออกกำลังกาย

เก็บท่าออกกำลังกายทั้งหมดในระบบ

- `id` (SERIAL PRIMARY KEY)
- `name`, `category`, `modality`
- `muscle_groups` (TEXT[] - กล้ามเนื้อที่ใช้)
- `movement_pattern` (แบบการเคลื่อนไหว)
- `instructions`, `description`
- `tracking_type` (วิธีการวัดผล: 'strength', 'cardio', 'time', 'distance_long', etc.)
- `tracking_fields` (TEXT[] - ฟิลด์ที่ใช้บันทึก เช่น ['Weight', 'Reps'])
- `calories_estimate` (ประมาณการแคลอรี่)

**ประเภทท่าที่รองรับ:**

- Compound Strength (Squat, Bench Press, Deadlift)
- Cardio (Running, Cycling, Swimming)
- Flexibility (Stretching, Mobility)
- Plyometrics (Jump Training)
- Balance & Agility

---

### 3️⃣ **Program Management**

#### `programs` - โปรแกรมการเทรน

Template หรือ Assigned Program

- `id`, `name`, `description`
- `duration_weeks`, `days_per_week`
- `trainer_id` (FK → users.id)
- `client_id` (FK → clients.id) - NULL ถ้าเป็น Template
- `parent_program_id` (FK → programs.id) - อ้างอิง Template
- `is_template` (BOOLEAN)

#### `program_days` - วันในโปรแกรม

แต่ละวันใน Program

- `program_id` (FK → programs.id)
- `week_number`, `day_number`
- `name` (เช่น 'Upper Body', 'Push Day')
- `is_rest_day`

#### `program_sections` - ส่วนของแต่ละวัน

แบ่งวันเป็นส่วนๆ (Warmup, Main, Cooldown)

- `program_day_id` (FK → program_days.id)
- `type` ('warmup', 'main', 'cooldown', 'skill')
- `format` ('straight-sets', 'circuit')
- `name`, `duration_seconds`, `rounds`, `order`, `notes`

#### `program_exercises` - ท่าออกกำลังกายในแต่ละส่วน

- `program_section_id` (FK → program_sections.id)
- `exercise_id` (FK → exercises.id)
- `sets`, `reps`, `weight`, `rest_seconds`, `rpe`
- `notes`, `order`

---

### 4️⃣ **Scheduling & Sessions**

#### `schedules` - ตารางนัดหมาย

Sessions ระหว่าง Trainer และ Client

- `id`, `title`
- `trainer_id` (FK → users.id)
- `client_id` (FK → clients.id)
- `start_time`, `end_time`, `location`
- `status` ('scheduled', 'completed', 'cancelled')
- `rating`, `feedback`, `summary`

#### `session_logs` - บันทึกการเทรนในแต่ละ Session

เก็บท่าออกกำลังกายที่ทำในแต่ละ Session

- `schedule_id` (FK → schedules.id)
- `exercise_id` (FK → exercises.id)
- `notes`, `status`, `order`

#### `session_log_sets` - บันทึกแต่ละเซ็ต

เก็บผลการเทรนแยกเป็นเซ็ต

- `session_log_id` (FK → session_logs.id)
- `set_number`
- `planned_weight_kg`, `planned_reps`
- `actual_weight_kg`, `actual_reps`, `actual_rpe`
- `completed` (BOOLEAN)

---

### 5️⃣ **Client Data & Metrics**

#### `client_metrics` - ข้อมูลสุขภาพ

ประวัติการวัดค่าต่างๆ สำหรับกราฟและรายงาน

- `client_id` (FK → clients.id)
- `date`, `type`, `value`

**ประเภทการวัด (type):**

- `weight` - น้ำหนักตัว
- `height` - ส่วนสูง
- `bmi` - ดัชนีมวลกาย
- `body_fat` - เปอร์เซ็นต์ไขมัน
- `muscle` - มวลกล้ามเนื้อ
- `waist`, `hip`, `chest` - รอบวง

#### `client_notes` - บันทึกเกี่ยวกับลูกค้า

- `client_id` (FK → clients.id)
- `content`, `type`, `created_by`

#### `assignments` - งานที่มอบหมาย

งานเสริมที่ Trainer มอบให้ Client

- `client_id`, `trainer_id`
- `title`, `description`, `due_date`, `status`

#### `calendar_notes` - บันทึกในปฏิทิน Trainer

- `trainer_id` (FK → users.id)
- `date`, `type`, `title`, `content`

---

## 🚀 วิธีการใช้งาน

### 1. Start Database

```bash
cd backend/userdatabase
docker-compose up -d
```

### 2. Access PgAdmin

- URL: `http://localhost:5050`
- Email: `admin@admin.com`
- Password: `admin`

### 3. Connect to Database

- Host: `db` (or `localhost` จากเครื่องที่รัน Docker)
- Port: `5432`
- Database: `fitness_db`
- Username: `fitness_user`
- Password: `fitness_password`

### 4. Stop Database

```bash
docker-compose down
```

---

## 🔧 Features

✅ **Auto-generated IDs** - ใช้ SERIAL (auto-increment)  
✅ **Timestamps** - `created_at` และ `updated_at` อัตโนมัติ  
✅ **Foreign Keys** - รองรับ CASCADE DELETE  
✅ **Mock Data** - มีข้อมูลตัวอย่างพร้อมใช้  
✅ **Triggers** - อัพเดต `updated_at` อัตโนมัติ  
✅ **Array Fields** - ใช้ PostgreSQL Array สำหรับ muscle_groups, tracking_fields

---

## 📊 ข้อมูลตัวอย่าง

ไฟล์ `docker/init.sql` มีข้อมูลทดสอบพร้อมใช้:

- 1 Trainer (trainer1)
- 1 Trainee Account (somchai) + 2 Clients เพิ่มเติม
- 20+ Exercises (Strength, Cardio, Flexibility, Plyometrics)
- 2 Programs พร้อม Program Days และ Exercises
- 3 Schedules พร้อม Session Logs
- Client Metrics สำหรับทดสอบกราฟ

---

## 🔗 Related Services

- **Backend API**: `backend/userservice` - Go service ที่เชื่อมต่อกับ DB นี้
- **Frontend**: `frontend` - React application ที่เรียกใช้ Backend API

---

## 📝 หมายเหตุ

- Database จะรันบนพอร์ต `5432` (PostgreSQL default)
- PgAdmin รันบนพอร์ต `5050`
- ข้อมูลจะถูก persist ใน Docker Volume ชื่อ `postgres_data`
- หากต้องการรีเซ็ต DB: `docker-compose down -v` แล้ว `up -d` ใหม่
