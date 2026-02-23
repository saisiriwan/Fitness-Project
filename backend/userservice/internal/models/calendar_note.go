package models

import "time"

// CalendarNote structure for trainer's calendar
type CalendarNote struct {
	ID        int       `json:"id" db:"id"`
	TrainerID int       `json:"trainer_id" db:"trainer_id"`
	Date      time.Time `json:"date" db:"date"`
	Type      string    `json:"type" db:"type"` // 'note', 'rest-day'
	Title     string    `json:"title" db:"title"`
	Content   string    `json:"content" db:"content"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
