# API Reference - Fitness Management Platform

> **Base URL:** `http://localhost:8080/api/v1`  
> **Authentication:** JWT Token in HTTP-only Cookie  
> **Content-Type:** `application/json`

---

## 📑 Table of Contents

- [Authentication](#authentication)
- [User Management](#user-management)
- [Client Management](#client-management)
- [Schedule Management](#schedule-management)
- [Assignment Management](#assignment-management)
- [Session Management](#session-management)
- [Program Management](#program-management)
- [Exercise Library](#exercise-library)
- [Dashboard & Analytics](#dashboard--analytics)
- [Calendar Notes](#calendar-notes)

---

## 🔓 Authentication

### Register

สมัครสมาชิกใหม่ในระบบ

```http
POST /api/v1/auth/register
```

**Request Body:**

```json
{
  "name": "John Trainer",
  "username": "john_trainer",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "trainer"
}
```

**Response (201 Created):**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 5,
    "name": "John Trainer",
    "username": "john_trainer",
    "email": "john@example.com",
    "role": "trainer"
  }
}
```

---

### Login

เข้าสู่ระบบและรับ JWT Token

```http
POST /api/v1/auth/login
```

**Request Body:**

```json
{
  "username": "trainer1",
  "password": "password"
}
```

**Response (200 OK):**

```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "Trainer One",
    "username": "trainer1",
    "email": "trainer@example.com",
    "role": "trainer"
  }
}
```

**Cookies Set:**

- `token`: JWT Token (HttpOnly, Secure)

---

### Logout

ออกจากระบบและลบ Cookie

```http
POST /api/v1/auth/logout
```

**Response (200 OK):**

```json
{
  "message": "Logged out successfully"
}
```

---

### Google Login

เริ่มต้นการ Login ด้วย Google OAuth

```http
GET /api/v1/auth/google/login
```

**Response:**

- Redirect to Google OAuth consent screen

---

### Google Callback

รับผลลัพธ์จาก Google OAuth

```http
GET /api/v1/auth/google/callback?code={auth_code}&state={state}
```

**Response:**

- Redirect to frontend with JWT Cookie set

---

### Check Auth

ตรวจสอบสถานะการ Login ปัจจุบัน

```http
GET /api/v1/auth/me
```

**Headers:**

```
Cookie: token={jwt_token}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "name": "Trainer One",
  "username": "trainer1",
  "email": "trainer@example.com",
  "role": "trainer"
}
```

---

## 👤 User Management

### Get All Users

ดึงรายชื่อผู้ใช้ทั้งหมดในระบบ

```http
GET /api/v1/users
```

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "name": "Trainer One",
    "username": "trainer1",
    "email": "trainer@example.com",
    "role": "trainer",
    "avatar_url": "https://example.com/avatar.jpg"
  },
  {
    "id": 2,
    "name": "Somchai Trainee",
    "username": "somchai",
    "email": "somchai@example.com",
    "role": "trainee"
  }
]
```

---

### Get User by ID

ดึงข้อมูลผู้ใช้รายบุคคล

```http
GET /api/v1/users/:id
```

**Parameters:**

- `id` (path) - User ID

**Response (200 OK):**

```json
{
  "id": 1,
  "name": "Trainer One",
  "username": "trainer1",
  "email": "trainer@example.com",
  "role": "trainer",
  "bio": "Certified Personal Trainer",
  "avatar_url": "https://example.com/avatar.jpg",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### Upload Avatar

อัปโหลดรูปโปรไฟล์

```http
POST /api/v1/users/upload-avatar
```

**Request (multipart/form-data):**

```
avatar: [image file]
user_id: 1
```

**Response (200 OK):**

```json
{
  "message": "Avatar uploaded successfully",
  "avatar_url": "/uploads/avatars/1_1234567890.jpg"
}
```

---

### Update User

แก้ไขข้อมูลผู้ใช้

```http
PUT /api/v1/users/:id
```

**Request Body:**

```json
{
  "name": "Trainer One Updated",
  "email": "trainer_new@example.com",
  "bio": "Senior Personal Trainer with 10 years experience"
}
```

**Response (200 OK):**

```json
{
  "message": "User updated successfully",
  "user": {
    "id": 1,
    "name": "Trainer One Updated",
    "email": "trainer_new@example.com",
    "bio": "Senior Personal Trainer with 10 years experience"
  }
}
```

---

### Delete User

ลบผู้ใช้ออกจากระบบ

```http
DELETE /api/v1/users/:id
```

**Response (200 OK):**

```json
{
  "message": "User deleted successfully"
}
```

---

## 🏃 Client Management

### Get All Clients

ดึงรายชื่อลูกเทรนทั้งหมด

```http
GET /api/v1/clients
```

**Query Parameters (Optional):**

- `status` - Filter by status (active, paused, inactive)

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "trainer_id": 1,
    "name": "สมชาย ใจดี",
    "email": "somchai@example.com",
    "phone_number": "081-234-5678",
    "goal": "ลดน้ำหนัก 5 กิโล",
    "status": "active",
    "weight_kg": 75.0,
    "height_cm": 175.0,
    "join_date": "2024-01-15T00:00:00Z"
  }
]
```

---

### Create Client

เพิ่มลูกเทรนใหม่

```http
POST /api/v1/clients
```

**Request Body:**

```json
{
  "trainer_id": 1,
  "name": "มาลี สวยงาม",
  "email": "malee@example.com",
  "phone_number": "082-345-6789",
  "birth_date": "1995-05-15",
  "gender": "female",
  "height_cm": 165.0,
  "weight_kg": 55.0,
  "goal": "เพิ่มกล้ามเนื้อ",
  "activity_level": "moderate",
  "medical_conditions": "ไม่มี"
}
```

**Response (201 Created):**

```json
{
  "message": "Client created successfully",
  "client": {
    "id": 2,
    "name": "มาลี สวยงาม",
    "email": "malee@example.com",
    "status": "active"
  }
}
```

---

### Get Client by ID

ดึงข้อมูลลูกเทรนรายบุคคล

```http
GET /api/v1/clients/:id
```

**Response (200 OK):**

```json
{
  "id": 1,
  "trainer_id": 1,
  "name": "สมชาย ใจดี",
  "email": "somchai@example.com",
  "phone_number": "081-234-5678",
  "avatar_url": "https://example.com/avatar.jpg",
  "birth_date": "1990-03-20T00:00:00Z",
  "gender": "male",
  "height_cm": 175.0,
  "weight_kg": 75.0,
  "goal": "ลดน้ำหนัก 5 กิโล",
  "injuries": "มีปัญหาเข่าเล็กน้อย",
  "activity_level": "moderate",
  "medical_conditions": "ไม่มี",
  "target_weight": 70.0,
  "target_date": "2024-06-01T00:00:00Z",
  "status": "active",
  "join_date": "2024-01-15T00:00:00Z"
}
```

---

### Update Client

แก้ไขข้อมูลลูกเทรน

```http
PUT /api/v1/clients/:id
```

**Request Body:**

```json
{
  "weight_kg": 73.5,
  "goal": "ลดน้ำหนักอีก 3.5 กิโล",
  "status": "active"
}
```

**Response (200 OK):**

```json
{
  "message": "Client updated successfully"
}
```

---

### Delete Client

ลบข้อมูลลูกเทรน

```http
DELETE /api/v1/clients/:id
```

**Response (200 OK):**

```json
{
  "message": "Client deleted successfully"
}
```

---

### Get Client Metrics

ดึงข้อมูลการวัดผลร่างกาย

```http
GET /api/v1/clients/:id/metrics
```

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "client_id": 1,
    "date": "2024-01-15T00:00:00Z",
    "type": "weight",
    "value": 80.0
  },
  {
    "id": 2,
    "client_id": 1,
    "date": "2024-01-15T00:00:00Z",
    "type": "body_fat",
    "value": 25.0
  },
  {
    "id": 3,
    "client_id": 1,
    "date": "2024-02-15T00:00:00Z",
    "type": "weight",
    "value": 78.5
  }
]
```

---

### Create Client Metric

บันทึกการวัดผลใหม่

```http
POST /api/v1/clients/:id/metrics
```

**Request Body:**

```json
{
  "metrics": [
    {
      "type": "weight",
      "value": 77.0,
      "date": "2024-03-15"
    },
    {
      "type": "body_fat",
      "value": 22.5,
      "date": "2024-03-15"
    },
    {
      "type": "waist",
      "value": 85.0,
      "date": "2024-03-15"
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "message": "Metrics saved successfully",
  "count": 3
}
```

---

### Get Client Notes

ดึงโน้ตของลูกเทรน

```http
GET /api/v1/clients/:id/notes
```

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "client_id": 1,
    "content": "มีปัญหาเข่าเล็กน้อย ต้องระวัง squat",
    "type": "general",
    "created_by": "Trainer One",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

---

### Create Client Note

เขียนโน้ตใหม่

```http
POST /api/v1/clients/:id/notes
```

**Request Body:**

```json
{
  "content": "ความก้าวหน้าดีมาก ฟอร์มดีขึ้นเรื่อยๆ",
  "type": "progress",
  "created_by": "Trainer One"
}
```

**Response (201 Created):**

```json
{
  "message": "Note created successfully",
  "note_id": 2
}
```

---

### Get Client Sessions

ดึงรายการ Sessions ของลูกเทรน

```http
GET /api/v1/clients/:id/sessions
```

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "client_id": 1,
    "trainer_id": 1,
    "title": "Upper Body Workout",
    "start_time": "2024-03-20T10:00:00Z",
    "end_time": "2024-03-20T11:00:00Z",
    "status": "completed",
    "rating": 5,
    "feedback": "เซสชันที่ดีมาก"
  }
]
```

---

### Get My Profile (Trainee)

ดึงโปรไฟล์ตัวเอง (สำหรับ Trainee ที่ Login)

```http
GET /api/v1/trainees/me
```

**Response (200 OK):**

```json
{
  "id": 1,
  "trainer_id": 1,
  "user_id": 2,
  "name": "สมชาย ใจดี",
  "email": "somchai@example.com",
  "goal": "ลดน้ำหนัก 5 กิโล",
  "current_program": {
    "id": 1,
    "name": "โปรแกรมลดน้ำหนัก 8 สัปดาห์"
  }
}
```

---

## 📅 Schedule Management

### Get Schedules

ดึงรายการนัดหมายทั้งหมด

```http
GET /api/v1/schedules
```

**Query Parameters (Optional):**

- `start_date` - Filter from date (YYYY-MM-DD)
- `end_date` - Filter to date (YYYY-MM-DD)
- `status` - Filter by status (scheduled, completed, cancelled)

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "title": "Session with Somchai",
    "trainer_id": 1,
    "client_id": 1,
    "start_time": "2024-09-24T10:00:00Z",
    "end_time": "2024-09-24T11:00:00Z",
    "location": "Gym Floor 2",
    "status": "scheduled"
  }
]
```

---

### Create Schedule

สร้างนัดหมายใหม่

```http
POST /api/v1/schedules
```

**Request Body:**

```json
{
  "title": "Full Body Training",
  "trainer_id": 1,
  "client_id": 2,
  "start_time": "2024-09-25T14:00:00Z",
  "end_time": "2024-09-25T15:00:00Z",
  "location": "Gym Floor 3",
  "status": "scheduled"
}
```

**Response (201 Created):**

```json
{
  "message": "Schedule created successfully",
  "schedule_id": 4
}
```

---

### Update Schedule

แก้ไขนัดหมาย

```http
PUT /api/v1/schedules/:id
```

**Request Body:**

```json
{
  "start_time": "2024-09-25T15:00:00Z",
  "end_time": "2024-09-25T16:00:00Z",
  "location": "Gym Floor 1",
  "status": "scheduled"
}
```

**Response (200 OK):**

```json
{
  "message": "Schedule updated successfully"
}
```

---

### Delete Schedule

ยกเลิก/ลบนัดหมาย

```http
DELETE /api/v1/schedules/:id
```

**Response (200 OK):**

```json
{
  "message": "Schedule deleted successfully"
}
```

---

## 📝 Assignment Management

### Get Assignments

ดึงรายการงานที่มอบหมาย

```http
GET /api/v1/assignments
```

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "title": "Complete 3 cardio sessions this week",
    "description": "20 minutes each session, moderate intensity",
    "client_id": 1,
    "trainer_id": 1,
    "due_date": "2024-03-30T00:00:00Z",
    "status": "pending",
    "created_at": "2024-03-20T10:00:00Z"
  }
]
```

---

### Create Assignment

มอบหมายงานใหม่

```http
POST /api/v1/assignments
```

**Request Body:**

```json
{
  "title": "Flexibility Routine",
  "description": "Practice stretching exercises daily for 15 minutes",
  "client_id": 1,
  "trainer_id": 1,
  "due_date": "2024-04-05",
  "status": "pending"
}
```

**Response (201 Created):**

```json
{
  "message": "Assignment created successfully",
  "assignment_id": 2
}
```

---

### Update Assignment

แก้ไขงาน

```http
PUT /api/v1/assignments/:id
```

**Request Body:**

```json
{
  "status": "completed",
  "due_date": "2024-04-10"
}
```

**Response (200 OK):**

```json
{
  "message": "Assignment updated successfully"
}
```

---

### Delete Assignment

ลบงาน

```http
DELETE /api/v1/assignments/:id
```

**Response (200 OK):**

```json
{
  "message": "Assignment deleted successfully"
}
```

---

## 💪 Session Management

### Create Session

สร้าง Session การฝึกใหม่

```http
POST /api/v1/sessions
```

**Request Body:**

```json
{
  "schedule_id": 1,
  "client_id": 1,
  "start_time": "2024-03-20T10:00:00Z",
  "end_time": "2024-03-20T11:00:00Z"
}
```

**Response (201 Created):**

```json
{
  "message": "Session created successfully",
  "session_id": 5
}
```

---

### Get Session

ดึงรายละเอียด Session

```http
GET /api/v1/sessions/:id
```

**Response (200 OK):**

```json
{
  "id": 1,
  "schedule_id": 3,
  "client_id": 1,
  "start_time": "2024-03-20T10:00:00Z",
  "end_time": "2024-03-20T11:00:00Z",
  "status": "completed",
  "exercises": [
    {
      "id": 1,
      "exercise_name": "Barbell Squat",
      "sets": [
        {
          "set_number": 1,
          "planned_weight_kg": 40,
          "planned_reps": 15,
          "actual_weight_kg": 40,
          "actual_reps": 15,
          "actual_rpe": 7,
          "completed": true
        }
      ]
    }
  ]
}
```

---

### Update Session

แก้ไข Session

```http
PUT /api/v1/sessions/:id
```

**Request Body:**

```json
{
  "status": "completed",
  "rating": 5,
  "feedback": "Great session, good progress on squats"
}
```

**Response (200 OK):**

```json
{
  "message": "Session updated successfully"
}
```

---

### Delete Session

ลบ Session

```http
DELETE /api/v1/sessions/:id
```

**Response (200 OK):**

```json
{
  "message": "Session deleted successfully"
}
```

---

### Reschedule Session

เลื่อนเวลา Session

```http
PATCH /api/v1/sessions/:id
```

**Request Body:**

```json
{
  "start_time": "2024-03-21T14:00:00Z",
  "end_time": "2024-03-21T15:00:00Z"
}
```

**Response (200 OK):**

```json
{
  "message": "Session rescheduled successfully"
}
```

---

### Create Log

เพิ่มท่าฝึกใน Session

```http
POST /api/v1/sessions/:id/logs
```

**Request Body:**

```json
{
  "exercise_id": 2,
  "notes": "Focus on form",
  "sets": [
    {
      "set_number": 1,
      "planned_weight_kg": 60,
      "planned_reps": 10
    },
    {
      "set_number": 2,
      "planned_weight_kg": 60,
      "planned_reps": 10
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "message": "Exercise log created successfully",
  "log_id": 3
}
```

---

### Update Set

บันทึกผลการฝึกแต่ละ Set

```http
PUT /api/v1/sessions/:id/sets/:setId
```

**Request Body:**

```json
{
  "actual_weight_kg": 60,
  "actual_reps": 12,
  "actual_rpe": 8,
  "completed": true
}
```

**Response (200 OK):**

```json
{
  "message": "Set updated successfully"
}
```

---

## 📋 Program Management

### Get Programs

ดึงรายการโปรแกรมทั้งหมด

```http
GET /api/v1/programs
```

**Query Parameters (Optional):**

- `is_template` - Filter templates (true/false)
- `client_id` - Filter by assigned client

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "name": "โปรแกรมลดน้ำหนัก 8 สัปดาห์",
    "description": "โปรแกรมสำหรับผู้เริ่มต้น",
    "duration_weeks": 8,
    "days_per_week": 3,
    "trainer_id": 1,
    "is_template": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

---

### Create Program

สร้างโปรแกรมใหม่

```http
POST /api/v1/programs
```

**Request Body:**

```json
{
  "name": "โปรแกรมเพิ่มกล้ามเนื้อ 12 สัปดาห์",
  "description": "Progressive overload program",
  "duration_weeks": 12,
  "days_per_week": 4,
  "trainer_id": 1,
  "is_template": true
}
```

**Response (201 Created):**

```json
{
  "message": "Program created successfully",
  "program_id": 3
}
```

---

### Get Program Detail

ดึงรายละเอียดโปรแกรม

```http
GET /api/v1/programs/:id
```

**Response (200 OK):**

```json
{
  "id": 1,
  "name": "โปรแกรมลดน้ำหนัก 8 สัปดาห์",
  "description": "โปรแกรมสำหรับผู้เริ่มต้น",
  "duration_weeks": 8,
  "days_per_week": 3,
  "trainer_id": 1,
  "is_template": true,
  "days": [
    {
      "id": 1,
      "week_number": 1,
      "day_number": 1,
      "name": "Upper Body",
      "is_rest_day": false,
      "sections": [
        {
          "id": 1,
          "type": "warmup",
          "format": "circuit",
          "name": "Dynamic Warmup",
          "duration_seconds": 300,
          "exercises": [
            {
              "id": 1,
              "exercise_id": 4,
              "exercise_name": "Treadmill Running",
              "sets": 1,
              "reps": "5 min",
              "weight": "bodyweight",
              "rest_seconds": 0,
              "order": 1
            }
          ]
        }
      ]
    }
  ]
}
```

---

### Update Program

แก้ไขโปรแกรม

```http
PUT /api/v1/programs/:id
```

**Request Body:**

```json
{
  "name": "โปรแกรมลดน้ำหนัก 8 สัปดาห์ (Updated)",
  "description": "Updated description",
  "duration_weeks": 10
}
```

**Response (200 OK):**

```json
{
  "message": "Program updated successfully"
}
```

---

### Delete Program

ลบโปรแกรม

```http
DELETE /api/v1/programs/:id
```

**Response (200 OK):**

```json
{
  "message": "Program deleted successfully"
}
```

---

### Assign Program

มอบหมายโปรแกรมให้ลูกเทรน

```http
POST /api/v1/programs/:id/assign
```

**Request Body:**

```json
{
  "client_id": 2,
  "start_date": "2024-04-01"
}
```

**Response (201 Created):**

```json
{
  "message": "Program assigned successfully",
  "assigned_program_id": 5,
  "sessions_created": 24
}
```

---

### Create Program Day

เพิ่มวันฝึกในโปรแกรม

```http
POST /api/v1/program-days
```

**Request Body:**

```json
{
  "program_id": 1,
  "week_number": 1,
  "day_number": 2,
  "name": "Lower Body",
  "is_rest_day": false
}
```

**Response (201 Created):**

```json
{
  "message": "Program day created successfully",
  "day_id": 5
}
```

---

### Update Program Day

แก้ไขวันฝึก

```http
PUT /api/v1/program-days/:id
```

**Request Body:**

```json
{
  "name": "Push Day",
  "is_rest_day": false
}
```

**Response (200 OK):**

```json
{
  "message": "Program day updated successfully"
}
```

---

### Delete Program Day

ลบวันฝึก

```http
DELETE /api/v1/program-days/:id
```

**Response (200 OK):**

```json
{
  "message": "Program day deleted successfully"
}
```

---

### Create Section

เพิ่มช่วงการฝึก (Section)

```http
POST /api/v1/program-sections
```

**Request Body:**

```json
{
  "program_day_id": 1,
  "type": "main",
  "format": "straight-sets",
  "name": "Main Strength Work",
  "duration_seconds": 2400,
  "rounds": 1,
  "order": 2
}
```

**Response (201 Created):**

```json
{
  "message": "Section created successfully",
  "section_id": 8
}
```

---

### Update Section

แก้ไขช่วงการฝึก

```http
PUT /api/v1/program-sections/:id
```

**Request Body:**

```json
{
  "name": "Main Hypertrophy Work",
  "duration_seconds": 3000
}
```

**Response (200 OK):**

```json
{
  "message": "Section updated successfully"
}
```

---

### Delete Section

ลบช่วงการฝึก

```http
DELETE /api/v1/program-sections/:id
```

**Response (200 OK):**

```json
{
  "message": "Section deleted successfully"
}
```

---

### Add Exercise to Section

เพิ่มท่าฝึกใน Section

```http
POST /api/v1/program-exercises
```

**Request Body:**

```json
{
  "program_section_id": 2,
  "exercise_id": 1,
  "sets": 4,
  "reps": "8-10",
  "weight": "75%",
  "rest_seconds": 120,
  "rpe": 8,
  "notes": "Focus on depth",
  "order": 1
}
```

**Response (201 Created):**

```json
{
  "message": "Exercise added to section successfully",
  "program_exercise_id": 12
}
```

---

### Update Program Exercise

แก้ไขท่าฝึกใน Section

```http
PUT /api/v1/program-exercises/:id
```

**Request Body:**

```json
{
  "sets": 5,
  "reps": "6-8",
  "weight": "80%",
  "rest_seconds": 180,
  "rpe": 9
}
```

**Response (200 OK):**

```json
{
  "message": "Program exercise updated successfully"
}
```

---

### Delete Program Exercise

ลบท่าฝึกออกจาก Section

```http
DELETE /api/v1/program-exercises/:exerciseId
```

**Response (200 OK):**

```json
{
  "message": "Exercise removed from program successfully"
}
```

---

## 💪 Exercise Library

### Get Exercises

ดึงรายการท่าฝึกทั้งหมด

```http
GET /api/v1/exercises
```

**Query Parameters (Optional):**

- `category` - Filter by category
- `modality` - Filter by modality (strength, cardio, flexibility)
- `search` - Search by name

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "name": "Barbell Squat",
    "category": "Compound",
    "modality": "strength",
    "muscle_groups": ["Quadriceps", "Glutes", "Core"],
    "movement_pattern": "Squat",
    "instructions": "ยืนกางขาเท่าไหล่ ค่อยๆ นั่งลง...",
    "tracking_type": "strength",
    "tracking_fields": ["Weight (น้ำหนัก)", "Reps (จำนวนครั้ง)"],
    "calories_estimate": "100-150"
  }
]
```

---

### Create Exercise

เพิ่มท่าฝึกใหม่

```http
POST /api/v1/exercises
```

**Request Body:**

```json
{
  "name": "Dumbbell Bench Press",
  "category": "Compound",
  "modality": "strength",
  "muscle_groups": ["Chest", "Shoulders", "Triceps"],
  "movement_pattern": "Push",
  "instructions": "นอนบนเบาะ ดันดัมเบลขึ้นจากหน้าอก",
  "description": "Great alternative to barbell bench press",
  "tracking_type": "strength",
  "tracking_fields": ["Weight (น้ำหนัก)", "Reps (จำนวนครั้ง)"],
  "calories_estimate": "80-120"
}
```

**Response (201 Created):**

```json
{
  "message": "Exercise created successfully",
  "exercise_id": 25
}
```

---

### Update Exercise

แก้ไขท่าฝึก

```http
PUT /api/v1/exercises/:id
```

**Request Body:**

```json
{
  "instructions": "Updated instructions with more details",
  "calories_estimate": "90-130"
}
```

**Response (200 OK):**

```json
{
  "message": "Exercise updated successfully"
}
```

---

### Delete Exercise

ลบท่าฝึก

```http
DELETE /api/v1/exercises/:id
```

**Response (200 OK):**

```json
{
  "message": "Exercise deleted successfully"
}
```

---

## 📊 Dashboard & Analytics

### Get Dashboard Stats

ดึงสถิติหน้า Dashboard

```http
GET /api/v1/dashboard/stats
```

**Response (200 OK):**

```json
{
  "total_clients": 15,
  "active_clients": 12,
  "sessions_today": 3,
  "sessions_this_week": 18,
  "pending_assignments": 5,
  "upcoming_sessions": [
    {
      "id": 10,
      "client_name": "สมชาย ใจดี",
      "start_time": "2024-03-25T10:00:00Z",
      "title": "Upper Body Workout"
    }
  ]
}
```

---

### Get All Health Metrics

ดึงข้อมูลสุขภาพทั้งหมด

```http
GET /api/v1/health-metrics
```

**Response (200 OK):**

```json
[
  {
    "client_id": 1,
    "client_name": "สมชาย ใจดี",
    "latest_weight": 75.0,
    "latest_bmi": 24.5,
    "latest_body_fat": 22.0,
    "last_measured": "2024-03-20T00:00:00Z"
  }
]
```

---

### Get All Session Logs

ดึงบันทึกการฝึกทั้งหมด (สำหรับ 1RM Progress)

```http
GET /api/v1/session-logs
```

**Query Parameters (Optional):**

- `client_id` - Filter by client
- `exercise_id` - Filter by exercise
- `start_date` - From date
- `end_date` - To date

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "schedule_id": 3,
    "exercise_id": 1,
    "exercise_name": "Barbell Squat",
    "client_id": 1,
    "client_name": "สมชาย ใจดี",
    "session_date": "2024-03-20T10:00:00Z",
    "sets": [
      {
        "set_number": 1,
        "actual_weight_kg": 40,
        "actual_reps": 15,
        "actual_rpe": 7
      }
    ],
    "estimated_1rm": 60.0
  }
]
```

---

### Get All Client Metrics

ดึงข้อมูล Body Metrics ทั้งหมด

```http
GET /api/v1/client-metrics
```

**Query Parameters (Optional):**

- `client_id` - Filter by client
- `type` - Filter by metric type

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "client_id": 1,
    "client_name": "สมชาย ใจดี",
    "date": "2024-01-15T00:00:00Z",
    "type": "weight",
    "value": 80.0
  },
  {
    "id": 2,
    "client_id": 1,
    "client_name": "สมชาย ใจดี",
    "date": "2024-02-15T00:00:00Z",
    "type": "weight",
    "value": 78.5
  }
]
```

---

## 📆 Calendar Notes

### Get Calendar Notes

ดึงโน้ตในปฏิทิน

```http
GET /api/v1/calendar/notes
```

**Query Parameters (Optional):**

- `start_date` - From date (YYYY-MM-DD)
- `end_date` - To date (YYYY-MM-DD)

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "trainer_id": 1,
    "date": "2024-03-25T00:00:00Z",
    "type": "rest-day",
    "title": "Rest Day",
    "content": "No sessions scheduled",
    "created_at": "2024-03-20T10:00:00Z"
  }
]
```

---

### Create Calendar Note

สร้างโน้ตใหม่

```http
POST /api/v1/calendar/notes
```

**Request Body:**

```json
{
  "trainer_id": 1,
  "date": "2024-04-01",
  "type": "note",
  "title": "Gym Maintenance",
  "content": "Gym will be closed for maintenance"
}
```

**Response (201 Created):**

```json
{
  "message": "Calendar note created successfully",
  "note_id": 5
}
```

---

### Delete Calendar Note

ลบโน้ต

```http
DELETE /api/v1/calendar/notes/:id
```

**Response (200 OK):**

```json
{
  "message": "Calendar note deleted successfully"
}
```

---

## 🔒 Authentication Headers

ทุก Protected Endpoint ต้องส่ง JWT Token ผ่าน Cookie:

```http
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

หรือผ่าน Authorization Header (ถ้ารองรับ):

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ❌ Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid request body",
  "details": "missing required field: name"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "You don't have permission to access this resource"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## 📝 Notes

- ทุก timestamps ใช้รูปแบบ ISO 8601 (RFC3339)
- ทุก Request/Response ใช้ `Content-Type: application/json`
- ID fields เป็น Integer (SERIAL in PostgreSQL)
- Arrays ใช้รูปแบบ JSON array `[]`
- Boolean ใช้ `true`/`false` (lowercase)

---

**Last Updated:** 2026-01-19  
**API Version:** 1.0  
**Base URL:** http://localhost:8080/api/v1
