package models

import "time"

type Client struct {
	ID          int    `json:"id" db:"id"`
	TrainerID   *int   `json:"trainer_id" db:"trainer_id"`
	UserID      *int   `json:"user_id" db:"user_id"`
	TrainerName string `json:"trainer_name" db:"trainer_name"`

	Name      string  `json:"name" db:"name" binding:"required"`
	Email     *string `json:"email" db:"email"`
	Phone     *string `json:"phone_number" db:"phone_number"`
	AvatarURL *string `json:"avatar_url" db:"avatar_url"`

	BirthDate         *time.Time `json:"birth_date" db:"birth_date"`
	Gender            *string    `json:"gender" db:"gender"`
	Height            *float64   `json:"height_cm" db:"height_cm"`
	Weight            *float64   `json:"weight_kg" db:"weight_kg"`
	TargetWeight      *float64   `json:"target_weight" db:"target_weight"`
	TargetDate        *time.Time `json:"target_date" db:"target_date"`
	Goal              *string    `json:"goal" db:"goal"`
	Injuries          *string    `json:"injuries" db:"injuries"`
	ActivityLevel     *string    `json:"activity_level" db:"activity_level"`
	MedicalConditions *string    `json:"medical_conditions" db:"medical_conditions"`

	CurrentProgramID   *int    `json:"current_program_id" db:"current_program_id"`
	CurrentProgramName *string `json:"current_program_name" db:"current_program_name"` // ✅ เปลี่ยนเป็น *string

	CreatedAt *time.Time `json:"created_at" db:"created_at"`
	UpdatedAt *time.Time `json:"updated_at" db:"updated_at"`

	Status                  *string  `json:"status" db:"status"` // Added for Search
	FitnessLevel            *string  `json:"fitness_level" db:"fitness_level"`
	PreferredWorkoutDays    []string `json:"preferred_workout_days" db:"preferred_workout_days"`
	WorkoutFrequencyPerWeek *int     `json:"workout_frequency_per_week" db:"workout_frequency_per_week"`
	Notes                   *string  `json:"notes" db:"notes"`
}
