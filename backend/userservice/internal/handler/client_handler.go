package handler

import (
	"net/http"
	"strconv"
	"strings"
	"users/internal/models"
	"users/internal/repository"
	"users/internal/service" // เพิ่ม import service เพื่อเรียก GetUserByID (สำหรับดึงชื่อ Trainer)

	"github.com/gin-gonic/gin"
)

type ClientHandler struct {
	repo         repository.ClientRepository
	userService  service.UserService
	programRepo  repository.ProgramRepository
	exerciseRepo repository.ExerciseRepository
}

func NewClientHandler(
	repo repository.ClientRepository,
	userService service.UserService,
	programRepo repository.ProgramRepository,
	exerciseRepo repository.ExerciseRepository,
) *ClientHandler {
	return &ClientHandler{
		repo:         repo,
		userService:  userService,
		programRepo:  programRepo,
		exerciseRepo: exerciseRepo,
	}
}

// DELETE /api/v1/clients/:id
func (h *ClientHandler) DeleteClient(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	// Get Trainer ID from token
	trainerID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := h.repo.DeleteClient(id, trainerID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete client: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Client deleted successfully"})
}

// GET /api/v1/clients
func (h *ClientHandler) GetAllClients(c *gin.Context) {
	trainerID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	clients, err := h.repo.GetAllClients(trainerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch clients: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, clients)
}

// POST /api/v1/clients
func (h *ClientHandler) CreateClient(c *gin.Context) {
	var req models.Client
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	trainerID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	req.TrainerID = &trainerID

	// [NEW] Automatic Link: Find User ID by Email if provided
	if req.Email != nil && *req.Email != "" {
		existingUser, err := h.userService.GetUserByEmail(*req.Email)
		if err == nil && existingUser != nil {
			req.UserID = &existingUser.ID
		}
	}

	if err := h.repo.CreateClient(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create client: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

// GET /api/v1/clients/:id
func (h *ClientHandler) GetClient(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	// Get Trainer ID from token
	trainerID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	client, err := h.repo.GetClientByID(id, trainerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client not found"})
		return
	}
	c.JSON(http.StatusOK, client)
}

// GET /api/v1/trainees/me
func (h *ClientHandler) GetMe(c *gin.Context) {
	userIDFloat, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := int(userIDFloat.(float64))

	client, err := h.repo.GetClientByUserID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client profile not found"})
		return
	}
	c.JSON(http.StatusOK, client)
}

// --- เพิ่มฟังก์ชันใหม่ต่อท้ายไฟล์ ---

// GET /api/v1/clients/:id/notes
func (h *ClientHandler) GetClientNotes(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Param("id"))

	notes, err := h.repo.GetNotesByClientID(clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, notes)
}

// POST /api/v1/clients/:id/notes
func (h *ClientHandler) CreateClientNote(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Param("id"))

	var req models.ClientNote
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// ดึงชื่อ Trainer จาก Token -> User ID -> Database
	userID, _ := c.Get("user_id")
	trainerID := int(userID.(float64))

	trainer, err := h.userService.GetUserByID(trainerID)
	trainerName := "Unknown Trainer"
	if err == nil {
		trainerName = trainer.Name
	}

	req.ClientID = clientID
	req.CreatedBy = trainerName // บันทึกชื่อคนเขียน

	if err := h.repo.CreateNote(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create note"})
		return
	}
	c.JSON(http.StatusCreated, req)
}

// PUT /api/v1/notes/:id
func (h *ClientHandler) UpdateClientNote(c *gin.Context) {
	noteID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid note ID"})
		return
	}

	var req models.ClientNote
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	req.ID = noteID
	if err := h.repo.UpdateNote(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update note"})
		return
	}
	c.JSON(http.StatusOK, req)
}

// DELETE /api/v1/notes/:id
func (h *ClientHandler) DeleteClientNote(c *gin.Context) {
	noteID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid note ID"})
		return
	}

	if err := h.repo.DeleteNote(noteID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete note"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Note deleted successfully"})
}

// PUT /api/v1/clients/:id
func (h *ClientHandler) UpdateClient(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid client ID"})
		return
	}

	var req models.Client
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	// Validate mandatory fields
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Client name is required"})
		return
	}

	// [NEW] Trim whitespace from email
	if req.Email != nil {
		trimmed := strings.TrimSpace(*req.Email)
		req.Email = &trimmed
	}

	// Get Trainer ID from token for security check
	trainerID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Ensure ID matches
	req.ID = id
	req.TrainerID = &trainerID

	// Call Repository
	if err := h.repo.UpdateClient(&req); err != nil {
		if strings.Contains(err.Error(), "duplicate key value") {
			c.JSON(http.StatusConflict, gin.H{"error": "Email already exists (อีเมลนี้มีอยู่ในระบบแล้ว)"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update client: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Client updated successfully", "client": req})
}

// GET /api/v1/clients/:id/programs/current
func (h *ClientHandler) GetCurrentProgram(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Param("id"))

	program, err := h.programRepo.GetCurrentProgramByClientID(clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch current program"})
		return
	}
	if program == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active program found"})
		return
	}
	c.JSON(http.StatusOK, program)
}

// GET /api/v1/clients/:id/exercises/history
func (h *ClientHandler) GetExerciseHistory(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Param("id"))

	history, err := h.exerciseRepo.GetExerciseHistoryByClientID(clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch exercise history"})
		return
	}
	c.JSON(http.StatusOK, history)
}

// GET /api/v1/clients/:id/programs/current/statistics
func (h *ClientHandler) GetProgramStatistics(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Param("id"))
	period := c.DefaultQuery("period", "all")

	stats, err := h.programRepo.GetProgramStatistics(clientID, period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch program statistics"})
		return
	}
	c.JSON(http.StatusOK, stats)
}

// GET /api/v1/trainee/program/current
func (h *ClientHandler) GetMyCurrentProgram(c *gin.Context) {
	userIDFloat, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := int(userIDFloat.(float64))

	client, err := h.repo.GetClientByUserID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client profile not found"})
		return
	}

	program, err := h.programRepo.GetCurrentProgramByClientID(client.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch current program"})
		return
	}
	if program == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active program found"})
		return
	}
	c.JSON(http.StatusOK, program)
}

// GET /api/v1/trainee/exercises/history
func (h *ClientHandler) GetMyExerciseHistory(c *gin.Context) {
	userIDFloat, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := int(userIDFloat.(float64))

	client, err := h.repo.GetClientByUserID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client profile not found"})
		return
	}

	history, err := h.exerciseRepo.GetExerciseHistoryByClientID(client.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch exercise history"})
		return
	}
	c.JSON(http.StatusOK, history)
}

// GET /api/v1/trainee/program/current/statistics
func (h *ClientHandler) GetMyProgramStatistics(c *gin.Context) {
	userIDFloat, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := int(userIDFloat.(float64))

	client, err := h.repo.GetClientByUserID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client profile not found"})
		return
	}

	period := c.DefaultQuery("period", "all")

	stats, err := h.programRepo.GetProgramStatistics(client.ID, period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch program statistics"})
		return
	}
	c.JSON(http.StatusOK, stats)
}
