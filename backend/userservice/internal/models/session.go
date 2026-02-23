package models

import "time"

// Session Log (หัวข้อการบันทึกผล)
type SessionLog struct {
	ID           int       `json:"id" db:"id"`
	ScheduleID   int       `json:"schedule_id" db:"schedule_id"`
	ExerciseID   *int      `json:"exercise_id" db:"exercise_id"`     // อาจจะ null ได้
	ExerciseName string    `json:"exercise_name" db:"exercise_name"` // Snapshot name
	Category     string    `json:"category" db:"category"`           // Snapshot category
	Notes        string    `json:"notes" db:"notes"`
	Status       string    `json:"status" db:"status"` // Added
	Order        int       `json:"order" db:"order"`   // Exercise Order within Section (or global order if flattened previously)
	CreatedAt    time.Time `json:"created_at" db:"created_at"`

	// ✅ New Fields for Section Grouping & Dynamic UI
	SectionName    string          `json:"section_name" db:"section_name"`       // e.g. "Warm-up"
	SectionOrder   int             `json:"section_order" db:"section_order"`     // e.g. 1
	TrackingFields JSONStringArray `json:"tracking_fields" db:"tracking_fields"` // e.g. ["time", "distance"]

	// Nested Sets for JSON binding (ignored by DB scan directly, handled manually)
	Sets []SessionLogSet `json:"sets" db:"-"`
}

// Session Log Set (รายละเอียดแต่ละเซต)
// Session Log Set (รายละเอียดแต่ละเซต)
type SessionLogSet struct {
	ID           int `json:"id" db:"id"`
	SessionLogID int `json:"session_log_id" db:"session_log_id"`
	SetNumber    int `json:"set_number" db:"set_number"`

	// Planned (Snapshot from Program)
	PlannedWeightKg        float64                `json:"planned_weight_kg" db:"planned_weight_kg"`
	PlannedReps            int                    `json:"planned_reps" db:"planned_reps"`
	PlannedRPE             float64                `json:"planned_rpe" db:"planned_rpe"`
	PlannedDistance        float64                `json:"planned_distance" db:"planned_distance"`
	PlannedDurationSeconds int                    `json:"planned_duration_seconds" db:"planned_duration_seconds"`
	PlannedPace            string                 `json:"planned_pace" db:"planned_pace"`
	RestDurationSeconds    int                    `json:"rest_duration_seconds" db:"rest_duration_seconds"`
	PlannedMetadata        map[string]interface{} `json:"planned_metadata" db:"planned_metadata"`

	// Actual (Logged by Client)
	ActualWeightKg float64 `json:"actual_weight_kg" db:"actual_weight_kg"`
	ActualReps     int     `json:"actual_reps" db:"actual_reps"`
	ActualDistance float64 `json:"actual_distance" db:"actual_distance"`
	ActualPace     string  `json:"actual_pace" db:"actual_pace"`

	ActualMetadata map[string]interface{} `json:"actual_metadata" db:"actual_metadata"`

	RPE       float64 `json:"actual_rpe" db:"actual_rpe"` // Note: db column is actual_rpe
	Completed bool    `json:"completed" db:"completed"`
}

type SessionLogWithDetails struct {
	ID           int             `json:"id"`
	ScheduleID   int             `json:"schedule_id"`
	ExerciseName *string         `json:"exercise_name"` // May be null
	ClientName   string          `json:"client_name"`
	Notes        string          `json:"notes"`
	CreatedAt    time.Time       `json:"created_at"`
	Date         time.Time       `json:"date"` // From schedule start_time
	Sets         []SessionLogSet `json:"sets"`
}
