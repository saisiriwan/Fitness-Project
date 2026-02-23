package models

import "time"

// ProgramSection matches 'program_sections' table
type ProgramSection struct {
	ID                 int               `json:"id" db:"id"`
	ProgramDayID       int               `json:"program_day_id" db:"program_day_id"`
	Type               string            `json:"type" db:"type"`     // 'warmup', 'main', 'cooldown', 'skill', 'custom'
	Format             string            `json:"format" db:"format"` // 'straight-sets', 'circuit', 'superset', etc.
	Name               string            `json:"name" db:"name"`
	DurationSeconds    *int              `json:"duration_seconds" db:"duration_seconds"`
	WorkSeconds        *int              `json:"work_seconds" db:"work_seconds"`                 // For Circuit
	RestSecondsSection *int              `json:"rest_seconds_section" db:"rest_seconds_section"` // For Circuit
	Rounds             *int              `json:"rounds" db:"rounds"`                             // For circuit/amrap
	Order              int               `json:"order" db:"order"`
	Notes              string            `json:"notes" db:"notes"`
	CreatedAt          time.Time         `json:"created_at" db:"created_at"`
	Exercises          []ProgramExercise `json:"exercises" db:"-"` // Nested exercises
}
