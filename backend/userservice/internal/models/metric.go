package models

import "time"

// ClientMetric matches 'client_metrics' table
type ClientMetric struct {
	ID        int       `json:"id" db:"id"`
	ClientID  int       `json:"client_id" db:"client_id"`
	Date      time.Time `json:"date" db:"date"`
	Type      string    `json:"type" db:"type"`
	Value     float64   `json:"value" db:"value"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type HealthMetricResponse struct {
	ClientID   int       `json:"client_id"`
	VO2Max     float64   `json:"vo2_max"`
	RestingHR  float64   `json:"resting_hr"`
	RecordedAt time.Time `json:"recorded_at"`
}
