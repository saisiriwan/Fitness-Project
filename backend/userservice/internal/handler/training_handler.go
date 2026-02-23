package handler

import (
	"net/http"
	"strconv"
	"users/internal/models"
	"users/internal/repository"

	"github.com/gin-gonic/gin"
)

type TrainingHandler struct {
	repo     repository.TrainingRepository
	userRepo repository.UserRepository // Injected Dependency
}

func NewTrainingHandler(repo repository.TrainingRepository, userRepo repository.UserRepository) *TrainingHandler {
	return &TrainingHandler{repo: repo, userRepo: userRepo}
}

// GET /api/v1/clients (เปลี่ยนชื่อจาก GetMyTrainees)
func (h *TrainingHandler) GetClients(c *gin.Context) {
	id, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// เรียก Repo ใหม่ที่คืนค่า []models.Client
	clients, err := h.repo.GetClientsByTrainerID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, clients)
}

// POST /api/v1/clients (Create Client)
func (h *TrainingHandler) CreateClient(c *gin.Context) {
	var req models.Client
	// Bind JSON ที่ส่งมาจากหน้าบ้าน
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// ดึง ID ของ Trainer (คนที่ Login อยู่)
	trainerID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	req.TrainerID = &trainerID

	// [NEW] Automatic Link: Find User by Email
	if req.Email != nil && *req.Email != "" {
		existingUser, err := h.userRepo.GetUserByEmail(*req.Email)
		if err == nil && existingUser != nil {
			req.UserID = &existingUser.ID
		}
	}

	if err := h.repo.CreateClient(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create client"})
		return
	}

	c.JSON(http.StatusCreated, req)
}

// GET /api/v1/programs
func (h *TrainingHandler) GetPrograms(c *gin.Context) {
	userID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	role, _ := c.Get("role")

	programs, err := h.repo.GetProgramsByUserID(userID, role.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, programs)
}

// GET /api/v1/schedules
func (h *TrainingHandler) GetSchedules(c *gin.Context) {
	userID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	role, _ := c.Get("role")

	// [NEW] Filter by Client ID (Optional)
	clientIDStr := c.Query("client_id")
	var clientID *int
	if clientIDStr != "" {
		id, err := strconv.Atoi(clientIDStr)
		if err == nil {
			clientID = &id
		}
	}

	// [NEW] Date Range Filter
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	schedules, err := h.repo.GetSchedulesByUserID(userID, role.(string), clientID, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, schedules)
}

// GET /api/v1/assignments
func (h *TrainingHandler) GetAssignments(c *gin.Context) {
	userID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	role, _ := c.Get("role")

	assignments, err := h.repo.GetAssignmentsByUserID(userID, role.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, assignments)
}

// --- ส่วน POST (สร้างข้อมูล) ---

// POST /api/v1/programs
func (h *TrainingHandler) CreateProgram(c *gin.Context) {
	var req models.Program
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// ดึง Trainer ID จาก Token (คนที่ Login อยู่คือคนสร้าง)
	trainerID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	req.TrainerID = trainerID

	if err := h.repo.CreateProgram(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create program"})
		return
	}

	c.JSON(http.StatusCreated, req)
}

// POST /api/v1/schedules
func (h *TrainingHandler) CreateSchedule(c *gin.Context) {
	var req models.Schedule
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// ดึง Trainer ID จาก Token
	trainerID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	req.TrainerID = trainerID

	if err := h.repo.CreateSchedule(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create schedule"})
		return
	}

	c.JSON(http.StatusCreated, req)
}

// POST /api/v1/assignments
func (h *TrainingHandler) CreateAssignment(c *gin.Context) {
	var req models.Assignment
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// ดึง Trainer ID จาก Token (คนที่ Login อยู่คือคนสร้าง)
	trainerID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	req.TrainerID = trainerID

	// ตรวจสอบว่า ClientID ถูกส่งมาหรือไม่
	if req.ClientID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Client ID is required for assignment"})
		return
	}

	// ตั้ง Status เป็น pending (ถ้า Frontend ไม่ได้ส่งมา)
	if req.Status == "" {
		req.Status = "pending"
	}

	// เรียก Repository เพื่อสร้าง Assignment
	if err := h.repo.CreateAssignment(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create assignment"})
		return
	}

	c.JSON(http.StatusCreated, req)
}

// PUT /api/v1/schedules/:id
func (h *TrainingHandler) UpdateSchedule(c *gin.Context) {
	var req models.Schedule
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	id, _ := strconv.Atoi(c.Param("id"))

	// 1. Fetch Existing Schedule
	existingSchedule, err := h.repo.GetScheduleByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Schedule not found"})
		return
	}

	// 2. Verify Ownership
	trainerID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	if existingSchedule.TrainerID != trainerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to update this schedule"})
		return
	}

	// 3. Merge Fields (Partial Update)
	if req.Title != "" {
		existingSchedule.Title = req.Title
	}
	if req.ClientID != 0 {
		existingSchedule.ClientID = req.ClientID
	}
	if !req.StartTime.IsZero() {
		existingSchedule.StartTime = req.StartTime
	}
	if !req.EndTime.IsZero() {
		existingSchedule.EndTime = req.EndTime
	}
	if req.Status != "" {
		existingSchedule.Status = req.Status
	}

	// 4. Save Updated Schedule
	if err := h.repo.UpdateSchedule(existingSchedule); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, existingSchedule)
}

// DELETE /api/v1/schedules/:id
func (h *TrainingHandler) DeleteSchedule(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	trainerID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	err := h.repo.DeleteSchedule(id, trainerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete schedule"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Schedule deleted"})
}

// PUT /api/v1/assignments/:id
func (h *TrainingHandler) UpdateAssignment(c *gin.Context) {
	var req models.Assignment
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	id, _ := strconv.Atoi(c.Param("id"))
	req.ID = id

	trainerID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	req.TrainerID = trainerID

	if err := h.repo.UpdateAssignment(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, req)
}

// DELETE /api/v1/assignments/:id
func (h *TrainingHandler) DeleteAssignment(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	trainerID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	err := h.repo.DeleteAssignment(id, trainerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete assignment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Assignment deleted"})
}
