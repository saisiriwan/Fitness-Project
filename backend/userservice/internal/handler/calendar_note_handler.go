package handler

import (
	"net/http"
	"strconv"
	"time"
	"users/internal/models"
	"users/internal/repository"

	"github.com/gin-gonic/gin"
)

type CalendarNoteHandler struct {
	repo repository.CalendarNoteRepository
}

func NewCalendarNoteHandler(repo repository.CalendarNoteRepository) *CalendarNoteHandler {
	return &CalendarNoteHandler{repo: repo}
}

func (h *CalendarNoteHandler) CreateNote(c *gin.Context) {
	var note models.CalendarNote
	if err := c.ShouldBindJSON(&note); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get Trainer ID from context (set by middleware)
	trainerIDFloat, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	note.TrainerID = int(trainerIDFloat.(float64))

	if err := h.repo.CreateNote(&note); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create note"})
		return
	}

	c.JSON(http.StatusCreated, note)
}

func (h *CalendarNoteHandler) GetNotes(c *gin.Context) {
	trainerIDFloat, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	trainerID := int(trainerIDFloat.(float64))

	startDate := c.Query("startDate")
	endDate := c.Query("endDate")

	if startDate == "" || endDate == "" {
		// Default to current month if not specified?
		// For now, require query params or default to a wide range logic if needed.
		// Let's enforce YYYY-MM-DD
		now := time.Now()
		if startDate == "" {
			startDate = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local).Format("2006-01-02")
		}
		if endDate == "" {
			endDate = time.Date(now.Year(), now.Month()+1, 0, 0, 0, 0, 0, time.Local).Format("2006-01-02")
		}
	}

	notes, err := h.repo.GetNotesByTrainerID(trainerID, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notes"})
		return
	}

	c.JSON(http.StatusOK, notes)
}

func (h *CalendarNoteHandler) DeleteNote(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	if err := h.repo.DeleteNote(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete note"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Note deleted"})
}
