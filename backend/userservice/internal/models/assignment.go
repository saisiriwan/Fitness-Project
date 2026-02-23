// userservice/internal/models/domain.go
package models

import "time"

// Assignment (งานที่มอบหมาย)
type Assignment struct {
	ID          int       `json:"id" db:"id"`
	Title       string    `json:"title" db:"title"`
	Description string    `json:"description" db:"description"`
	ClientID    int       `json:"client_id" db:"client_id"`
	TrainerID   int       `json:"trainer_id" db:"trainer_id"`
	DueDate     time.Time `json:"due_date" db:"due_date"`
	Status      string    `json:"status" db:"status"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}
