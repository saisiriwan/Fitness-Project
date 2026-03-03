package models

import "time"

// Response Structs for Client Dashboard API

// 1. Session Detail Response (Enriched)
type SessionDetailResponse struct {
	ID              string                    `json:"id"`         // Cast ID to string for Frontend
	ClientID        string                    `json:"client_id"`  // Cast ID to string
	TrainerID       string                    `json:"trainer_id"` // Cast ID to string
	TrainerName     string                    `json:"trainer_name"`
	TrainerUsername string                    `json:"trainer_username"` // Added
	TrainerAvatar   string                    `json:"trainer_avatar"`
	Title           string                    `json:"title"`
	Description     string                    `json:"description,omitempty"`
	Date            string                    `json:"date"` // YYYY-MM-DD
	StartTime       time.Time                 `json:"start_time"`
	EndTime         time.Time                 `json:"end_time"`
	Duration        int                       `json:"duration"` // Minutes
	Location        Location                  `json:"location"`
	Status          string                    `json:"status"`
	SessionType     string                    `json:"session_type"`
	Notes           string                    `json:"notes,omitempty"`
	Exercises       []SessionExerciseResponse `json:"exercises"`
	Summary         *SessionSummaryResponse   `json:"summary,omitempty"`
	CreatedAt       time.Time                 `json:"created_at"`
	UpdatedAt       time.Time                 `json:"updated_at"`
}

type Location struct {
	Name        string  `json:"name"`
	Address     string  `json:"address,omitempty"`
	Type        string  `json:"type,omitempty"`
	Coordinates *Coords `json:"coordinates,omitempty"`
}

type Coords struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// 2. Exercise in Session
type SessionExerciseResponse struct {
	ID             string               `json:"id"`
	SessionID      string               `json:"session_id"`
	ExerciseID     string               `json:"exercise_id"`
	Name           string               `json:"name"`
	Type           string               `json:"type"`     // e.g., "compound"
	Category       string               `json:"category"` // e.g., "legs"
	Order          int                  `json:"order"`
	Sets           []SessionSetResponse `json:"sets"`
	Notes          string               `json:"notes,omitempty"`
	VideoURL       string               `json:"video_url,omitempty"`
	RestTime       int                  `json:"rest_time,omitempty"`
	SectionName    string               `json:"section_name,omitempty"`
	SectionOrder   int                  `json:"section_order,omitempty"`
	TrackingFields []string             `json:"tracking_fields,omitempty"`
}

// 3. Set Detail
type SessionSetResponse struct {
	SetNumber    int      `json:"set_number"`
	TargetReps   *int     `json:"target_reps,omitempty"`
	TargetWeight *float64 `json:"target_weight,omitempty"`
	TargetRPE    *float64 `json:"target_rpe,omitempty"`

	TargetDuration *int                   `json:"target_duration,omitempty"`
	TargetDistance *float64               `json:"target_distance,omitempty"`
	TargetPace     *string                `json:"target_pace,omitempty"`
	RestDuration   *int                   `json:"rest_duration,omitempty"`
	TargetMetadata map[string]interface{} `json:"target_metadata,omitempty"`

	ActualReps   *int     `json:"actual_reps,omitempty"`
	ActualWeight *float64 `json:"actual_weight,omitempty"`
	ActualRPE    *float64 `json:"actual_rpe,omitempty"`

	ActualMetadata map[string]interface{} `json:"actual_metadata,omitempty"`

	Completed   bool       `json:"completed"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// 4. Summary Stats
type SessionSummaryResponse struct {
	TotalExercises     int     `json:"total_exercises"`
	CompletedExercises int     `json:"completed_exercises"`
	TotalSets          int     `json:"total_sets"`
	CompletedSets      int     `json:"completed_sets"`
	TotalVolume        float64 `json:"total_volume"`
}

// 5. CurrentProgramResponse
type CurrentProgramResponse struct {
	ID            int                       `json:"id"`
	Name          string                    `json:"name"`
	CurrentWeek   int                       `json:"current_week"`
	DurationWeeks int                       `json:"duration_weeks"`
	DaysPerWeek   int                       `json:"days_per_week"`
	StartDate     *time.Time                `json:"start_date"`
	EndDate       *time.Time                `json:"end_date"`
	Exercises     []ProgramExerciseProgress `json:"exercises"`
}

type ProgramExerciseProgress struct {
	Name                string           `json:"name"`
	Type                string           `json:"type"`
	Category            string           `json:"category"`
	IsBodyweight        bool             `json:"is_bodyweight"`
	ProgramPrescription *PerformanceData `json:"program_prescription"` // Using PerformanceData struct for sets/reps
	CurrentPerformance  *PerformanceData `json:"current_performance"`
	PreviousPerformance *PerformanceData `json:"previous_performance"`
	ProgressPercentage  float64          `json:"progress_percentage"`
}

type PerformanceData struct {
	WeightKg        float64 `json:"weight_kg,omitempty"`
	Reps            int     `json:"reps,omitempty"`
	Sets            int     `json:"sets,omitempty"`
	DistanceKm      float64 `json:"distance_km,omitempty"`
	DurationMinutes int     `json:"duration_minutes,omitempty"`
}

// 6. Exercise History Response
type ExerciseHistoryResponse struct {
	Exercises []ExerciseHistoryItem `json:"exercises"`
}

type ExerciseHistoryItem struct {
	ExerciseName   string             `json:"exercise_name"`
	Type           string             `json:"type"`          // Added for frontend grouping
	IsBodyweight   bool               `json:"is_bodyweight"` // Added
	TrackingFields []string           `json:"tracking_fields,omitempty"`
	History        []ExerciseLogItem  `json:"history"`
	Statistics     ExerciseStatistics `json:"statistics"`
}

type ExerciseLogItem struct {
	Date            string  `json:"date"`
	WeightKg        float64 `json:"weight_kg"`
	Reps            int     `json:"reps"`
	Sets            int     `json:"sets"`
	DistanceKm      float64 `json:"distance_km,omitempty"`
	DurationMinutes int     `json:"duration_minutes,omitempty"`
	// Extended tracking fields
	Speed         float64 `json:"speed,omitempty"`
	Cadence       float64 `json:"cadence,omitempty"`
	HeartRate     float64 `json:"heart_rate,omitempty"`
	HrZone        float64 `json:"hr_zone,omitempty"`
	Watts         float64 `json:"watts,omitempty"`
	Rpm           float64 `json:"rpm,omitempty"`
	Rounds        int     `json:"rounds,omitempty"`
	OneRm         float64 `json:"one_rm,omitempty"`
	Rir           float64 `json:"rir,omitempty"`
	RestSeconds   float64 `json:"rest_seconds,omitempty"`
	DistanceShort float64 `json:"distance_short,omitempty"`
	Rpe           float64 `json:"rpe,omitempty"`
}

type ExerciseStatistics struct {
	ProgressPercentage float64 `json:"progress_percentage"`
	MaxWeight          float64 `json:"max_weight"`
	TotalDistance      float64 `json:"total_distance,omitempty"` // Added
	TotalDuration      int     `json:"total_duration,omitempty"` // Added
}

// 7. Metrics Response (Goal-based)
type MetricsResponse struct {
	Goal            string                   `json:"goal"`
	Metrics         map[string][]MetricItem  `json:"metrics"`
	Summary         map[string]MetricSummary `json:"summary"`
	Recommendations []string                 `json:"recommendations"`
}

type MetricItem struct {
	Date  string  `json:"date"`
	Value float64 `json:"value"`
}

type MetricSummary struct {
	Current          float64 `json:"current"`
	Starting         float64 `json:"starting"`
	Change           float64 `json:"change"`
	ChangePercentage float64 `json:"change_percentage"`
	Trend            string  `json:"trend"`
}

// 8. Program Statistics
type ProgramStatisticsResponse struct {
	CompletionRate float64 `json:"completion_rate"`
	TotalVolume    float64 `json:"total_volume"`
	TotalWorkouts  int     `json:"total_workouts"`
	WeeksCompleted int     `json:"weeks_completed"`
}
