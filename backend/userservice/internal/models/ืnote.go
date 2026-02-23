package models

import "time"

type ClientNote struct {
	ID        int       `json:"id" db:"id"`
	ClientID  int       `json:"client_id" db:"client_id"`
	Content   string    `json:"content" db:"content" binding:"required"`
	Type      string    `json:"type" db:"type" binding:"required"`
	CreatedBy string    `json:"created_by" db:"created_by"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
