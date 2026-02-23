package models

import "time"

// Schedule (ตารางนัดหมาย/ตารางฝึก)
type Schedule struct {
	ID              int          `json:"id" db:"id"`
	Title           string       `json:"title" db:"title"`
	TrainerID       int          `json:"trainer_id" db:"trainer_id"`
	TrainerName     string       `json:"trainer_name" db:"trainer_name"`         // Added
	TrainerUsername string       `json:"trainer_username" db:"trainer_username"` // Added
	TrainerPhone    string       `json:"trainer_phone" db:"trainer_phone"`       // Added
	ClientID        int          `json:"client_id" db:"client_id"`
	StartTime       time.Time    `json:"start_time" db:"start_time"`
	EndTime         time.Time    `json:"end_time" db:"end_time"`
	Status          string       `json:"status" db:"status"`
	Notes           string       `json:"notes" db:"notes"`
	Summary         string       `json:"summary" db:"summary"`
	ProgramID       *int         `json:"program_id" db:"program_id"`         // Added
	ProgramDayID    *int         `json:"program_day_id" db:"program_day_id"` // Added
	Type            string       `json:"type" db:"session_type"`             // Added: workout or appointment
	Location        string       `json:"location" db:"location"`             // Added
	Rating          *int         `json:"rating" db:"rating"`                 // Added
	Feedback        string       `json:"feedback" db:"feedback"`             // Added
	Logs            []SessionLog `json:"logs" db:"-"`                        // Added for frontend (SessionCardsView)
	CreatedAt       time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time    `db:"updated_at" json:"updated_at"`
}
