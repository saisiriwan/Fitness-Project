# REST API Project
โฟลเดอร์: userservice/
หน้าที่: นี่คือ "ห้องครัวและพนักงานเสิร์ฟ" (Go API Server) ที่แท้จริง
ไฟล์สำคัญ:
cmd/main.go : นี่คือ "ประตูทางเข้า" ของแอป Go ทั้งหมดครับ ไฟล์นี้จะทำหน้าที่:
โหลด Config (จาก internal/config) 
เชื่อมต่อ Database (จาก internal/repository) 
ตั้งค่า Gin Router (กำหนด "เมนู" API) 
รันเซิร์ฟเวอร์
internal/config/config.go :
ทำตามหลัก 12-Factor App คืออ่านค่า Config (เช่น รหัสผ่าน DB) จาก Environment Variables (ไฟล์ .env) โดยใช้ Library อย่าง Viper (ตามที่เราเรียนจาก Mastering Golang... Part 4 )
internal/models/user.go :
คือ "พิมพ์เขียว" ข้อมูล (Struct) ใน Go  ที่บอกว่า User (หรือ Client) ต้องมีหน้าตาอย่างไร (เช่น ID, Name, Email)
internal/repository/user_repository.go :
นี่คือส่วนที่ทำหน้าที่ CRUD (Create, Read, Update, Delete) 
โค้ดในนี้จะเขียน SQL Query (เช่น SELECT *..., INSERT...) เพื่อคุยกับ PostgreSQL โดยตรง 
(สำคัญ) มีการใช้ Interface (UserRepository) ซึ่งเป็นเทคนิค Dependency Injection (DIP) ที่เราเรียนรู้จาก Mastering Golang... Part 4  เพื่อให้โค้ดทดสอบได้ง่าย
internal/service/user_service.go :
นี่คือ "ตรรกะ" (Business Logic) ของระบบ (เช่น อาจจะมีการคำนวณ BMI ก่อนบันทึก) มันจะอยู่คั่นกลางระหว่าง Handler และ Repository
internal/handler/user_handler.go :
นี่คือ "พ่อครัว" (Handlers) ของ Gin 
ทำหน้าที่รับ Request จากผู้ใช้ (เช่น c.ShouldBindJSON ) แล้วเรียก Service หรือ Repository ไปทำงาน จากนั้นส่งผลลัพธ์ (c.JSON(...)) กลับไป 
internal/middleware/auth_middleware.go :
นี่คือ "ยาม" (Auth Middleware)
ทำหน้าที่ตรวจสอบ JWT Token (บัตรผ่าน) ที่ผู้ใช้ส่งมาใน Header เพื่อยืนยันตัวตน (ตามที่เราเรียนจาก การทำ Authentication.pdf )
Dockerfile :
นี่คือ "สูตร" ในการแพ็ก Go API Server นี้ลงใน Docker Container
มันใช้ Multi-stage build (มี AS builder และ FROM alpine) ตามที่ Docker Deployment Guide.pdf แนะนำ เพื่อให้ Image สุดท้ายมีขนาดเล็กและปลอดภัย
