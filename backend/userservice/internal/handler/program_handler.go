package handler

import (
	"net/http"
	"strconv"
	"users/internal/models"
	"users/internal/repository"

	"github.com/gin-gonic/gin"
)

type ProgramHandler struct {
	repo repository.ProgramRepository
}

func NewProgramHandler(repo repository.ProgramRepository) *ProgramHandler {
	return &ProgramHandler{repo: repo}
}

// GET /api/v1/programs (ดึงรายการโปรแกรม)
func (h *ProgramHandler) GetPrograms(c *gin.Context) {
	trainerID, _ := GetUserID(c)
	programs, err := h.repo.GetProgramsByTrainerID(trainerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch programs"})
		return
	}
	c.JSON(http.StatusOK, programs)
}

// GET /api/v1/programs/:id (ดึงรายละเอียด + ท่าฝึก)
func (h *ProgramHandler) GetProgramDetail(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	// 1. Fetch Program
	program, err := h.repo.GetProgramByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Program not found"})
		return
	}

	// 2. Fetch Days
	days, err := h.repo.GetDaysByProgramID(id)
	if err != nil {
		c.JSON(http.StatusOK, program) // Return program without details if error
		return
	}

	// 3. Fetch Sections and Exercises for each Day
	for i := range days {
		sections, err := h.repo.GetSectionsByDayID(days[i].ID)
		if err == nil {
			for j := range sections {
				exercises, err := h.repo.GetExercisesBySectionID(sections[j].ID)
				if err == nil {
					sections[j].Exercises = exercises
				}
			}
			days[i].Sections = sections
		}
	}
	program.Days = days

	c.JSON(http.StatusOK, program)
}

// PUT /api/v1/programs/:id (แก้ไขโปรแกรม)
func (h *ProgramHandler) UpdateProgram(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req models.Program
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	trainerID, _ := GetUserID(c)
	req.ID = id
	req.TrainerID = trainerID

	if err := h.repo.UpdateProgram(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update program"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Program updated successfully"})
}

// DELETE /api/v1/programs/:id (ลบโปรแกรม)
func (h *ProgramHandler) DeleteProgram(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	trainerID, _ := GetUserID(c)

	if err := h.repo.DeleteProgram(id, trainerID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete program"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Program deleted successfully"})
}

// POST /api/v1/programs (สร้างโปรแกรมใหม่)
func (h *ProgramHandler) CreateProgram(c *gin.Context) {
	var req models.Program
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	trainerID, _ := GetUserID(c)
	req.TrainerID = trainerID

	if err := h.repo.CreateProgram(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create program"})
		return
	}
	// Initial Day creation logic could go here if needed
	c.JSON(http.StatusCreated, req)
}

// --- Days ---
func (h *ProgramHandler) CreateProgramDay(c *gin.Context) {
	var req models.ProgramDay
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}
	if err := h.repo.CreateProgramDay(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create day: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *ProgramHandler) DeleteProgramDay(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.repo.DeleteProgramDay(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete day"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Day deleted successfully"})
}

func (h *ProgramHandler) UpdateProgramDay(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req models.ProgramDay
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}
	req.ID = id
	if err := h.repo.UpdateProgramDay(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update day"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Day updated successfully"})
}

func (h *ProgramHandler) CreateProgramSection(c *gin.Context) {
	var req models.ProgramSection
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}
	if err := h.repo.CreateProgramSection(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create section: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *ProgramHandler) DeleteProgramSection(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.repo.DeleteProgramSection(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete section"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Section deleted successfully"})
}

// --- Exercises ---
// POST /api/v1/program-exercises
func (h *ProgramHandler) AddExercise(c *gin.Context) {
	var req models.ProgramExercise
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: " + err.Error()})
		return
	}

	if err := h.repo.AddExercise(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add exercise"})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *ProgramHandler) DeleteExercise(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := h.repo.DeleteExerciseFromSection(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete exercise"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Exercise deleted successfully"})
}

// POST /api/v1/programs/:id/assign
func (h *ProgramHandler) AssignProgram(c *gin.Context) {
	programID, _ := strconv.Atoi(c.Param("id"))

	type AssignRequest struct {
		ClientIDs []int  `json:"client_ids"`
		StartDate string `json:"start_date"` // YYYY-MM-DD
		StartTime string `json:"start_time"` // HH:MM (Optional)
		EndTime   string `json:"end_time"`   // HH:MM (Optional)
	}

	var req AssignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if len(req.ClientIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No clients selected"})
		return
	}

	// Call Repository
	if err := h.repo.AssignProgramToClients(programID, req.ClientIDs, req.StartDate, req.StartTime, req.EndTime); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign program: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Program assigned successfully"})
}

// POST /api/v1/programs/:id/clone
func (h *ProgramHandler) CloneProgram(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	trainerID, _ := GetUserID(c)

	if err := h.repo.CloneProgram(id, trainerID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clone program: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Program cloned successfully"})
}

// PUT /api/v1/program-exercises/:id
func (h *ProgramHandler) UpdateExercise(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid exercise ID"})
		return
	}

	var req models.ProgramExercise
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	req.ID = id
	if err := h.repo.UpdateProgramExercise(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update exercise"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Exercise updated successfully"})
}
