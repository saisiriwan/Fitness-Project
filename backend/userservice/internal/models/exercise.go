package models

import "time"

// Exercise matches the 'exercises' table
type Exercise struct {
	ID               int       `json:"id" db:"id"`
	Name             string    `json:"name" db:"name"`
	Category         *string   `json:"category" db:"category"`
	MuscleGroups     []string  `json:"muscle_groups" db:"muscle_groups"` // Requires PQ array handling in repo
	MovementPattern  *string   `json:"movement_pattern" db:"movement_pattern"`
	Modality         *string   `json:"modality" db:"modality"`         // Added
	Instructions     *string   `json:"instructions" db:"instructions"` // Added
	Description      *string   `json:"description" db:"description"`
	TrackingType     *string   `json:"tracking_type" db:"tracking_type"`         // Added
	TrackingFields   []string  `json:"tracking_fields" db:"tracking_fields"`     // Added
	CaloriesEstimate *string   `json:"calories_estimate" db:"calories_estimate"` // Changed to string to support ranges
	UserID           *int      `json:"user_id" db:"user_id"`                     // Owner (Nullable)
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}
