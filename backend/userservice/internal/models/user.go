package models

import "time"

type User struct {
	ID           int       `db:"id" json:"id"`
	Name         string    `db:"name" json:"name"`
	Username     string    `db:"username" json:"username"` // Added to match DB schema
	Email        string    `db:"email" json:"email"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time `db:"updated_at" json:"updated_at"`
	PasswordHash string    `db:"password_hash" json:"-"` // json:"-" คือ ห้ามส่งฟิลด์นี้กลับไปใน JSON
	Role         string    `db:"role" json:"role"`
	AvatarURL    *string   `db:"avatar_url" json:"avatar_url"`
	PhoneNumber  *string   `db:"phone_number" json:"phone_number"` // Joined from trainers/clients
	Settings     *string   `db:"settings" json:"settings"`         // JSONB
}
