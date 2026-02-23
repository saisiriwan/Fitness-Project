package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"
)

// Program (โปรแกรมการฝึก)
type Program struct {
	ID              int       `json:"id" db:"id"`
	Name            string    `json:"name" db:"name"`
	Description     string    `json:"description" db:"description"`
	DurationWeeks   int       `json:"duration_weeks" db:"duration_weeks"`
	DaysPerWeek     int       `json:"days_per_week" db:"days_per_week"`
	TrainerID       int       `json:"trainer_id" db:"trainer_id"`
	ClientID        *int      `json:"client_id" db:"client_id"` // null = template
	ParentProgramID *int      `json:"parent_program_id" db:"parent_program_id"`
	IsTemplate      bool      `json:"is_template" db:"is_template"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time `db:"updated_at" json:"updated_at"`

	// ✅ NEW: Progress/Status Fields for ProgressView
	Status            *string    `json:"status" db:"status"` // draft, active, etc.
	StartDate         *time.Time `json:"start_date" db:"start_date"`
	EndDate           *time.Time `json:"end_date" db:"end_date"`
	CurrentWeek       *int       `json:"current_week" db:"current_week"`
	TotalWeeks        *int       `json:"total_weeks" db:"total_weeks"`
	TargetDescription *string    `json:"target_description" db:"target_description"`

	// Nested Structure for API Response
	Days []ProgramDay `json:"days" db:"-"`
}

// Program Day
type ProgramDay struct {
	ID         int              `json:"id" db:"id"`
	ProgramID  int              `json:"program_id" db:"program_id"`
	WeekNumber int              `json:"week_number" db:"week_number"`
	DayNumber  int              `json:"day_number" db:"day_number"`
	Name       string           `json:"name" db:"name"`
	IsRestDay  bool             `json:"is_rest_day" db:"is_rest_day"`
	Sections   []ProgramSection `json:"sections" db:"-"`
}

// Helper Types for JSONB Arrays
// Note: We use these custom types to handle JSONB serialization/deserialization for arrays in Postgres

type JSONFloatArray []float64

// Value implements the driver.Valuer interface
func (a JSONFloatArray) Value() (driver.Value, error) {
	if len(a) == 0 {
		return "[]", nil
	}
	return json.Marshal(a)
}

// Scan implements the sql.Scanner interface
func (a *JSONFloatArray) Scan(value interface{}) error {
	if value == nil {
		*a = []float64{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, &a)
}

func (a *JSONFloatArray) UnmarshalJSON(data []byte) error {
	var raw interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	switch v := raw.(type) {
	case []interface{}:
		*a = make([]float64, len(v))
		for i, val := range v {
			switch num := val.(type) {
			case float64:
				(*a)[i] = num
			case string:
				f, _ := strconv.ParseFloat(num, 64)
				(*a)[i] = f
			default:
				(*a)[i] = 0
			}
		}
	case nil:
		*a = []float64{}
	default:
		return fmt.Errorf("JSONFloatArray: expected array, got %T", v)
	}
	return nil
}

type JSONStringArray []string

// Value implements the driver.Valuer interface
func (a JSONStringArray) Value() (driver.Value, error) {
	if len(a) == 0 {
		return "[]", nil
	}
	return json.Marshal(a)
}

// Scan implements the sql.Scanner interface
func (a *JSONStringArray) Scan(value interface{}) error {
	if value == nil {
		*a = []string{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, &a)
}

func (a *JSONStringArray) UnmarshalJSON(data []byte) error {
	var raw interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	switch v := raw.(type) {
	case []interface{}:
		*a = make([]string, len(v))
		for i, val := range v {
			(*a)[i] = fmt.Sprint(val)
		}
	case nil:
		*a = []string{}
	default:
		return fmt.Errorf("JSONStringArray: expected array, got %T", v)
	}
	return nil
}

// Program Exercise (Detail)
type ProgramExercise struct {
	ID               int    `json:"id" db:"id"`
	ProgramSectionID int    `json:"program_section_id" db:"program_section_id"`
	ExerciseID       int    `json:"exercise_id" db:"exercise_id"`
	ExerciseName     string `json:"exercise_name" db:"-"`     // JOIN
	ExerciseCategory string `json:"exercise_category" db:"-"` // JOIN

	// JSONB Array Fields for Multi-Set Data (Numeric)
	Reps     JSONStringArray `json:"reps" db:"reps"`
	Weight   JSONFloatArray  `json:"weight" db:"weight"`
	Distance JSONStringArray `json:"distance" db:"distance"`

	// JSONB Array Fields (String/Mixed)
	Pace JSONStringArray `json:"pace" db:"pace"`
	Side JSONStringArray `json:"side" db:"side"`

	// ✅ NEW: Additional JSONB fields for complete data
	Duration JSONStringArray `json:"duration" db:"duration"`   // Per-set duration
	HoldTime JSONStringArray `json:"hold_time" db:"hold_time"` // Per-set hold time
	Tempo    JSONStringArray `json:"tempo" db:"tempo"`         // Tempo strings
	Rest     JSONFloatArray  `json:"rest" db:"rest"`           // Per-set rest
	Rpe      JSONFloatArray  `json:"rpe" db:"rpe"`             // Per-set RPE

	// ✅ Advanced Metrics (JSONB Arrays - Numeric)
	Time          JSONStringArray `json:"time" db:"time"`
	Speed         JSONFloatArray  `json:"speed" db:"speed"`
	Cadence       JSONFloatArray  `json:"cadence" db:"cadence"`
	DistanceLong  JSONFloatArray  `json:"distance_long" db:"distance_long"`
	DistanceShort JSONFloatArray  `json:"distance_short" db:"distance_short"`
	OneRM         JSONFloatArray  `json:"one_rm" db:"one_rm"`
	RIR           JSONFloatArray  `json:"rir" db:"rir"`
	HeartRate     JSONFloatArray  `json:"heart_rate" db:"heart_rate"`
	HRZone        JSONFloatArray  `json:"hr_zone" db:"hr_zone"`
	Watts         JSONFloatArray  `json:"watts" db:"watts"`
	RPM           JSONFloatArray  `json:"rpm" db:"rpm"`
	Rounds        JSONFloatArray  `json:"rounds" db:"rounds"`

	// Video Link (Text)
	VideoLink string `json:"video_link" db:"video_link"`

	// Numeric/Constraint Fields
	Sets             int     `json:"sets" db:"sets"`
	RepsMin          int     `json:"reps_min" db:"reps_min"`
	RepsMax          int     `json:"reps_max" db:"reps_max"`
	WeightKg         float64 `json:"weight_kg" db:"weight_kg"`
	WeightPercentage float64 `json:"weight_percentage" db:"weight_percentage"`
	IsBodyweight     bool    `json:"is_bodyweight" db:"is_bodyweight"`

	// ✅ Fixed: Use float64 for Aggregate Calculations
	DurationSeconds float64 `json:"duration_seconds" db:"duration_seconds"`
	RestSeconds     float64 `json:"rest_seconds" db:"rest_seconds"`
	RPETarget       float64 `json:"rpe_target" db:"rpe_target"`

	Notes JSONStringArray `json:"notes" db:"notes"`
	Order int             `json:"order" db:"order"`

	// ✅ NEW: Per-program tracking fields configuration
	TrackingFields []string `json:"tracking_fields" db:"tracking_fields"`
}
