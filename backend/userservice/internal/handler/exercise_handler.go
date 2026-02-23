package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"users/internal/models"
	"users/internal/repository"

	"github.com/gin-gonic/gin"
)

type ExerciseHandler struct {
	repo repository.ExerciseRepository
}

func NewExerciseHandler(repo repository.ExerciseRepository) *ExerciseHandler {
	return &ExerciseHandler{repo: repo}
}

func (h *ExerciseHandler) GetExercises(c *gin.Context) {
	// Extract user_id from context (set by JWTCookieAuth)
	// Extract user_id from context (set by JWTCookieAuth)
	userIDFloat, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := int(userIDFloat.(float64))

	exs, err := h.repo.GetAllExercise(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, exs)
}

func (h *ExerciseHandler) CreateExercise(c *gin.Context) {
	var req models.Exercise
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// Assign Owner
	userIDFloat, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := int(userIDFloat.(float64))
	req.UserID = &userID

	if err := h.repo.CreateExercise(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create exercise"})
		return
	}
	c.JSON(http.StatusCreated, req)
}

// PUT /api/v1/exercises/:id
func (h *ExerciseHandler) UpdateExercise(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req models.Exercise
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}
	req.ID = id

	// Assign Owner for check
	userIDFloat, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := int(userIDFloat.(float64))
	req.UserID = &userID

	if err := h.repo.UpdateExercise(&req); err != nil {
		// Distinguish between not found/unauthorized and other errors if possible,
		// but generic error is fine for now or check error message
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update exercise: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Exercise updated"})
}

// DELETE /api/v1/exercises/:id
func (h *ExerciseHandler) DeleteExercise(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	userIDFloat, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := int(userIDFloat.(float64))

	if err := h.repo.DeleteExercise(id, userID); err != nil {
		// Log the error for server-side debugging
		fmt.Printf("Error deleting exercise %d: %v\n", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to delete exercise: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Exercise deleted"})
}
