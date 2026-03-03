package handler

import (
	"log"
	"net/http"
	"strconv"
	"time"
	"users/internal/models"
	"users/internal/repository"
	"users/internal/websocket" // Import our new package

	"github.com/gin-gonic/gin"
)

type SessionHandler struct {
	repo       repository.SessionRepository
	clientRepo repository.ClientRepository
	hub        *websocket.Hub
}

func NewSessionHandler(repo repository.SessionRepository, clientRepo repository.ClientRepository, hub *websocket.Hub) *SessionHandler {
	return &SessionHandler{
		repo:       repo,
		clientRepo: clientRepo,
		hub:        hub,
	}
}

// POST /api/v1/sessions (สร้างนัดหมาย)
func (h *SessionHandler) CreateSession(c *gin.Context) {
	var req models.Schedule
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	trainerID, _ := c.Get("user_id")
	req.TrainerID = int(trainerID.(float64))

	if err := h.repo.CreateSchedule(&req); err != nil {
		log.Printf("Failed to create session in DB: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	// Broadcast Update
	h.hub.Broadcast(gin.H{
		"type":      "SESSION_UPDATE",
		"action":    "create",
		"sessionId": req.ID,
		"clientId":  req.ClientID,
	})

	c.JSON(http.StatusCreated, req)
}

// GET /api/v1/clients/:id/sessions (ดึงประวัติการนัดของลูกค้าคนนี้)
func (h *SessionHandler) GetClientSessions(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Param("id"))

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	status := c.Query("status")

	sessions, err := h.repo.GetSchedulesByClientIDFiltered(clientID, startDate, endDate, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sessions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"sessions": sessions,
		},
	})
}

// GET /api/v1/clients/:id/sessions/:session_id
func (h *SessionHandler) GetClientSessionDetail(c *gin.Context) {
	clientIDStr := c.Param("id") // Changed from client_id to matches route wildcard
	sessionIDStr := c.Param("session_id")

	sessionID, _ := strconv.Atoi(sessionIDStr)

	// Fetch Enriched Data
	session, err := h.repo.GetSessionEnriched(sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch session details"})
		return
	}

	// Security Check: Ensure session belongs to client
	if session.ClientID != clientIDStr {
		c.JSON(http.StatusForbidden, gin.H{"error": "Session does not belong to this client"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    session,
	})
}

// POST /api/v1/sessions/:id/logs (บันทึกผลการฝึก)
func (h *SessionHandler) CreateLog(c *gin.Context) {
	scheduleID, _ := strconv.Atoi(c.Param("id"))
	var req models.SessionLog
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}
	req.ScheduleID = scheduleID

	if err := h.repo.CreateSessionLog(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to log session"})
		return
	}

	// 2. Insert Nested Sets
	for _, set := range req.Sets {
		// Assign Parent Log ID
		set.SessionLogID = req.ID

		// Create Check: If 0, use defaults? (Optional logic, but straightforward insert is best)
		// We use a safe copy for the loop variable pointer
		s := set
		if err := h.repo.CreateSessionLogSet(&s); err != nil {
			// In a robust system, we might want transaction,
			// but for now verifying functionality is priority.
			// Log error via log package if available, or just continue.
		}
	}

	// Broadcast Update
	h.hub.Broadcast(gin.H{
		"type":      "SESSION_UPDATE",
		"action":    "log_create",
		"sessionId": scheduleID,
	})

	c.JSON(http.StatusCreated, req)
}

// GET /api/v1/session-logs
func (h *SessionHandler) GetAllSessionLogs(c *gin.Context) {
	trainerIDFloat, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	trainerID := int(trainerIDFloat.(float64))

	logs, err := h.repo.GetAllLogsByTrainerID(trainerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch session logs"})
		return
	}
	c.JSON(http.StatusOK, logs)
}

// GET /api/v1/sessions/:id
func (h *SessionHandler) GetSession(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	schedule, logs, err := h.repo.GetSessionFullDetails(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch session details"})
		return
	}

	// Combine into single response
	response := gin.H{
		"id":             schedule.ID,
		"title":          schedule.Title,
		"trainer_id":     schedule.TrainerID,
		"client_id":      schedule.ClientID,
		"start_time":     schedule.StartTime,
		"end_time":       schedule.EndTime,
		"status":         schedule.Status,
		"session_type":   schedule.Type,
		"location":       schedule.Location,
		"notes":          schedule.Notes,
		"summary":        schedule.Summary,
		"rating":         schedule.Rating,
		"feedback":       schedule.Feedback,
		"program_id":     schedule.ProgramID,
		"program_day_id": schedule.ProgramDayID,
		"created_at":     schedule.CreatedAt,
		// "updated_at": schedule.UpdatedAt, // if exists
		"logs": logs,
	}

	c.JSON(http.StatusOK, response)
}

// PUT /api/v1/sessions/:id
func (h *SessionHandler) UpdateSession(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	// Temporary struct for binding
	type UpdateSessionRequest struct {
		Notes    string              `json:"notes"`
		Status   string              `json:"status"`
		Summary  string              `json:"summary"`
		Rating   *int                `json:"rating"`
		Feedback string              `json:"feedback"`
		Logs     []models.SessionLog `json:"logs"`
	}

	var req UpdateSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// Map to models
	scheduleData := &models.Schedule{
		Notes:    req.Notes,
		Status:   req.Status,
		Summary:  req.Summary,
		Rating:   req.Rating,
		Feedback: req.Feedback,
	}

	if err := h.repo.UpdateSession(id, scheduleData, req.Logs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update session"})
		return
	}

	// Broadcast Update
	h.hub.Broadcast(gin.H{
		"type":      "SESSION_UPDATE",
		"action":    "update",
		"sessionId": id,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Session updated successfully"})
}

// POST /api/v1/sessions/:id/complete
func (h *SessionHandler) CompleteSession(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	// Temporary struct for binding
	type CompleteSessionRequest struct {
		Notes    string              `json:"notes"`
		Summary  string              `json:"summary"`
		Rating   *int                `json:"rating"`
		Feedback string              `json:"feedback"`
		Logs     []models.SessionLog `json:"logs"`
	}

	var req CompleteSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// Map to models
	scheduleData := &models.Schedule{
		Notes:    req.Notes,
		Summary:  req.Summary,
		Rating:   req.Rating,
		Feedback: req.Feedback,
	}

	if err := h.repo.CompleteSession(id, scheduleData, req.Logs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete session: " + err.Error()})
		return
	}

	// Broadcast Update
	h.hub.Broadcast(gin.H{
		"type":      "SESSION_UPDATE",
		"action":    "complete",
		"sessionId": id,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Session completed successfully"})
}

// PATCH /clients/:client_id/sessions/:session_id/exercises/:exercise_id/sets/:set_number
func (h *SessionHandler) UpdateExerciseSet(c *gin.Context) {
	// exercise_id in URL corresponds to session_log.id (the unique instance of exercise in a session)
	logID, _ := strconv.Atoi(c.Param("exercise_id"))
	setNumber, _ := strconv.Atoi(c.Param("set_number"))

	type UpdateSetRequest struct {
		ActualReps   *float64 `json:"actual_reps"`
		ActualWeight *float64 `json:"actual_weight"`
		ActualRPE    *float64 `json:"actual_rpe"`
		Completed    bool     `json:"completed"`
		Notes        string   `json:"notes"`
	}

	var req UpdateSetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if err := h.repo.UpdateLogSet(logID, setNumber, req.ActualWeight, req.ActualReps, req.ActualRPE, req.Completed, req.Notes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update set"})
		return
	}

	// Broadcast Update
	sessionID, _ := strconv.Atoi(c.Param("session_id"))
	h.hub.Broadcast(gin.H{
		"type":       "SESSION_UPDATE",
		"action":     "update_set",
		"sessionId":  sessionID,
		"exerciseId": logID,
		"setNumber":  setNumber,
	})

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Set updated successfully"})
}

// PATCH /api/v1/sessions/:id (Reschedule Session)
func (h *SessionHandler) RescheduleSession(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var req struct {
		StartTime string `json:"start_time"`
		EndTime   string `json:"end_time"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	startTime, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_time format"})
		return
	}

	endTime, err := time.Parse(time.RFC3339, req.EndTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_time format"})
		return
	}

	if err := h.repo.RescheduleSession(id, startTime, endTime); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reschedule session"})
		return
	}

	h.hub.Broadcast(gin.H{
		"type":      "SESSION_UPDATE",
		"action":    "reschedule",
		"sessionId": id,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Session rescheduled successfully"})
}

// ----------------------------------------------------
// Trainee Specific Methods
// ----------------------------------------------------

// GET /api/v1/trainee/sessions
func (h *SessionHandler) GetMySessions(c *gin.Context) {
	// 1. Get User ID
	userIDFloat, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := int(userIDFloat.(float64))

	// 2. Get Client Profile
	client, err := h.clientRepo.GetClientByUserID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client profile not found"})
		return
	}

	// 3. Fetch Sessions
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	status := c.Query("status")

	sessions, err := h.repo.GetSchedulesByClientIDFiltered(client.ID, startDate, endDate, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sessions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"sessions": sessions,
		},
	})
}

// GET /api/v1/trainee/sessions/:id
func (h *SessionHandler) GetMySessionDetail(c *gin.Context) {
	// 1. Get User ID
	userIDFloat, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := int(userIDFloat.(float64))

	// 2. Get Client Profile
	client, err := h.clientRepo.GetClientByUserID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client profile not found"})
		return
	}

	sessionID, _ := strconv.Atoi(c.Param("id"))

	// 3. Fetch Enriched Data
	session, err := h.repo.GetSessionEnriched(sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch session details"})
		return
	}

	// 4. Security Check
	if session.ClientID != strconv.Itoa(client.ID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Session does not belong to you"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    session,
	})
}

// BackfillHistory triggers recalulcation of all history data
func (h *SessionHandler) BackfillHistory(c *gin.Context) {
	if err := h.repo.BackfillHistory(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to backfill history: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "History backfill triggered successfully"})
}

// InspectHistory returns debugging info
func (h *SessionHandler) InspectHistory(c *gin.Context) {
	clientIDStr := c.Query("clientId")
	clientID := 1 // Default to 1
	if clientIDStr != "" {
		id, err := strconv.Atoi(clientIDStr)
		if err == nil {
			clientID = id
		}
	}

	data, err := h.repo.InspectHistory(clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}
