package handler

import (
	"net/http"
	"strconv"

	"users/internal/models"
	"users/internal/repository"

	"github.com/gin-gonic/gin"
)

type HealthMetricHandler struct {
	repo repository.ClientRepository
}

func NewHealthMetricHandler(repo repository.ClientRepository) *HealthMetricHandler {
	return &HealthMetricHandler{repo: repo}
}

// =============================================================================
// GET /api/v1/client-metrics
// =============================================================================
// ✅ FIXED: Returns all raw metrics (weight, body_fat, one_rm_*, vo2_max, etc.)
//
//	Allows Reports.tsx to generate all chart types.
//
// Query params (optional):
//
//	?client_id=5       → filter by client
//	?type=weight       → filter by metric type
//	?format=grouped    → backward compat: returns grouped {vo2_max, resting_hr}
//
// =============================================================================
func (h *HealthMetricHandler) GetAllHealthMetrics(c *gin.Context) {
	// 1. Fetch raw metrics
	rawMetrics, err := h.repo.GetAllMetrics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch health metrics"})
		return
	}

	// ─── Backward Compatibility ─────────────────────────────────────────
	// If any component still uses the old format (grouped vo2_max + resting_hr)
	// they can call ?format=grouped to get the original response structure.
	// ─────────────────────────────────────────────────────────────────────
	if c.Query("format") == "grouped" {
		h.getGroupedHealthMetrics(c, rawMetrics)
		return
	}

	// ─── New Default: Return raw metrics ────────────────────────────────
	// Reports.tsx needs the full raw list for:
	//   - weight_loss chart  → weight, body_fat
	//   - muscle_building    → weight, chest, arm_right, arm_left, thigh_*
	//   - strength           → one_rm_*
	//   - general_health     → vo2_max, resting_heart_rate
	// ─────────────────────────────────────────────────────────────────────

	// Optional filters
	clientIDStr := c.Query("client_id")
	metricType := c.Query("type")

	var filtered []models.ClientMetric

	for _, m := range rawMetrics {
		// Filter by client_id (optional)
		if clientIDStr != "" {
			id, err := strconv.Atoi(clientIDStr)
			if err == nil && m.ClientID != id {
				continue
			}
		}
		// Filter by type (optional)
		if metricType != "" && m.Type != metricType {
			continue
		}
		filtered = append(filtered, m)
	}

	// If no filters -> return all
	if clientIDStr == "" && metricType == "" {
		c.JSON(http.StatusOK, rawMetrics)
		return
	}

	c.JSON(http.StatusOK, filtered)
}

// ─── Backward compat: grouped health metrics (original implementation) ───
func (h *HealthMetricHandler) getGroupedHealthMetrics(c *gin.Context, rawMetrics []models.ClientMetric) {
	type key struct {
		ClientID int
		Date     string
	}
	grouped := make(map[key]*models.HealthMetricResponse)

	for _, m := range rawMetrics {
		if m.Type != "vo2_max" && m.Type != "resting_hr" && m.Type != "resting_heart_rate" {
			continue
		}

		k := key{ClientID: m.ClientID, Date: m.Date.Format("2006-01-02")}

		if _, exists := grouped[k]; !exists {
			grouped[k] = &models.HealthMetricResponse{
				ClientID:   m.ClientID,
				RecordedAt: m.Date,
			}
		}

		switch m.Type {
		case "vo2_max":
			grouped[k].VO2Max = m.Value
		case "resting_hr", "resting_heart_rate":
			grouped[k].RestingHR = m.Value
		}
	}

	var result []models.HealthMetricResponse
	for _, v := range grouped {
		result = append(result, *v)
	}

	c.JSON(http.StatusOK, result)
}

// GET /api/v1/clients/:id/metrics
// GET /api/v1/clients/:id/metrics
func (h *HealthMetricHandler) GetClientMetrics(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Param("id"))
	goal := c.Query("goal")

	metrics, err := h.repo.GetMetricsByClientID(clientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch client metrics"})
		return
	}

	// 1. Backward Compatibility: If no goal, return as raw list (Trainer App)
	if goal == "" {
		c.JSON(http.StatusOK, metrics)
		return
	}

	// 2. New Logic: Transform for Client ProgressView
	resp := models.MetricsResponse{
		Goal:            goal,
		Metrics:         make(map[string][]models.MetricItem),
		Summary:         make(map[string]models.MetricSummary),
		Recommendations: []string{}, // Placeholder for simple recommendations
	}

	// Group raw metrics
	// Sort by date usually handled by DB, but ensure
	// We assume metrics are sorted by Date DESC from Repo? Or ASC?
	// Repo usually sorts DESC. Let's re-sort or handle carefully.
	// Actually, client wants easy time-series, so ASC might be better for charts.
	// But let's process.

	// Helper to track first/last for summary
	type rangeVal struct {
		First     float64
		Last      float64
		FirstDate string // Compare strings "YYYY-MM-DD"
		LastDate  string
	}
	summaryTracker := make(map[string]*rangeVal)

	for _, m := range metrics {
		dateStr := m.Date.Format("2006-01-02")
		item := models.MetricItem{
			Date:  dateStr,
			Value: m.Value,
		}
		resp.Metrics[m.Type] = append(resp.Metrics[m.Type], item)

		// Tracker
		if _, ok := summaryTracker[m.Type]; !ok {
			summaryTracker[m.Type] = &rangeVal{First: m.Value, FirstDate: dateStr, Last: m.Value, LastDate: dateStr}
		} else {
			tracker := summaryTracker[m.Type]
			// Find First/Last based on Date
			if dateStr < tracker.FirstDate {
				tracker.First = m.Value
				tracker.FirstDate = dateStr
			}
			if dateStr > tracker.LastDate {
				tracker.Last = m.Value
				tracker.LastDate = dateStr
			}
		}
	}

	// Build Summary
	for mType, tracker := range summaryTracker {
		change := tracker.Last - tracker.First
		pct := 0.0
		if tracker.First != 0 {
			pct = (change / tracker.First) * 100
		}

		trend := "stable"
		if change > 0 {
			trend = "up"
		}
		if change < 0 {
			trend = "down"
		}

		resp.Summary[mType] = models.MetricSummary{
			Current:          tracker.Last,
			Starting:         tracker.First,
			Change:           change,
			ChangePercentage: pct,
			Trend:            trend,
		}
	}

	// Simple Recommendation Logic (Mock)
	switch goal {
	case "weight_loss":
		resp.Recommendations = append(resp.Recommendations, "Consistent calorie deficit is key.")
	case "muscle_gain", "strength":
		resp.Recommendations = append(resp.Recommendations, "Ensure enough protein intake.")
	}

	c.JSON(http.StatusOK, resp)
}

// POST /api/v1/clients/:id/metrics
func (h *HealthMetricHandler) CreateClientMetrics(c *gin.Context) {
	clientID, _ := strconv.Atoi(c.Param("id")) // URL parameter overrides potentially

	var req []models.ClientMetric
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if len(req) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No metrics provided"})
		return
	}

	// Assign ClientID to all metrics
	for i := range req {
		req[i].ClientID = clientID
	}

	if err := h.repo.CreateMetrics(req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create metrics"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Metrics created successfully"})
}
