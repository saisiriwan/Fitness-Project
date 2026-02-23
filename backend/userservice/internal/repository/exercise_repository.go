package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"users/internal/models"

	"github.com/lib/pq" // จำเป็นต้องใช้ pq.Array
)

type ExerciseRepository interface {
	GetAllExercise(userID int) ([]models.Exercise, error)
	CreateExercise(ex *models.Exercise) error
	GetByIDExercise(id int) (*models.Exercise, error)
	UpdateExercise(ex *models.Exercise) error
	DeleteExercise(id int, userID int) error
	GetExerciseHistoryByClientID(clientID int) (*models.ExerciseHistoryResponse, error)
}

type exerciseRepository struct {
	db *sql.DB
}

func NewExerciseRepository(db *sql.DB) ExerciseRepository {
	return &exerciseRepository{db: db}
}

// 1. GetAll (System + User's exercises)
func (r *exerciseRepository) GetAllExercise(userID int) ([]models.Exercise, error) {
	// Filter: System exercises (user_id IS NULL) OR User's own exercises (user_id = $1)
	query := `
		SELECT id, name, category, muscle_groups, movement_pattern, modality, instructions, description, tracking_type, tracking_fields, calories_estimate, user_id, created_at 
		FROM exercises 
		WHERE user_id IS NULL OR user_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var exercises []models.Exercise
	for rows.Next() {
		var ex models.Exercise
		// ✅ ใช้ pq.Array เพื่อรับค่า TEXT[] จาก DB เข้ามาเป็น []string ใน Go
		if err := rows.Scan(&ex.ID, &ex.Name, &ex.Category, pq.Array(&ex.MuscleGroups), &ex.MovementPattern, &ex.Modality, &ex.Instructions, &ex.Description, &ex.TrackingType, pq.Array(&ex.TrackingFields), &ex.CaloriesEstimate, &ex.UserID, &ex.CreatedAt); err != nil {
			return nil, err
		}
		exercises = append(exercises, ex)
	}
	return exercises, nil
}

// 2. Create (แก้ไข: ส่ง Array ตรงๆ)
func (r *exerciseRepository) CreateExercise(ex *models.Exercise) error {
	query := `
        INSERT INTO exercises (name, category, muscle_groups, movement_pattern, modality, instructions, description, tracking_type, tracking_fields, calories_estimate, user_id) 
	    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING id, created_at
    `
	// ✅ ใช้ pq.Array(ex.MuscleGroups) เพื่อแปลง []string ของ Go ให้เป็น TEXT[] ของ Postgres
	return r.db.QueryRow(
		query,
		ex.Name,
		ex.Category,
		pq.Array(ex.MuscleGroups), // ส่ง Array ไปเลย
		ex.MovementPattern,
		ex.Modality,
		ex.Instructions,
		ex.Description,
		ex.TrackingType,
		pq.Array(ex.TrackingFields),
		ex.CaloriesEstimate,
		ex.UserID, // Added
	).Scan(&ex.ID, &ex.CreatedAt)
}

// 3. GetByID (แก้ไข: ใช้ pq.Array)
func (r *exerciseRepository) GetByIDExercise(id int) (*models.Exercise, error) {
	query := `SELECT id, name, category, muscle_groups, movement_pattern, modality, instructions, description, tracking_type, tracking_fields, calories_estimate, created_at FROM exercises WHERE id = $1`
	var ex models.Exercise

	// ✅ ใช้ pq.Array(&ex.MuscleGroups)
	err := r.db.QueryRow(query, id).Scan(&ex.ID, &ex.Name, &ex.Category, pq.Array(&ex.MuscleGroups), &ex.MovementPattern, &ex.Modality, &ex.Instructions, &ex.Description, &ex.TrackingType, pq.Array(&ex.TrackingFields), &ex.CaloriesEstimate, &ex.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &ex, nil
}

// 4. Update (แก้ไข: ส่ง Array ตรงๆ)
func (r *exerciseRepository) UpdateExercise(ex *models.Exercise) error {
	// Only update if user_id matches (Ownership check)
	query := `
		UPDATE exercises 
		SET name=$1, category=$2, muscle_groups=$3, movement_pattern=$4, modality=$5, instructions=$6, description=$7, tracking_type=$8, tracking_fields=$9, calories_estimate=$10 
		WHERE id=$11 AND user_id=$12
	`
	// ✅ ใช้ pq.Array(ex.MuscleGroups)
	res, err := r.db.Exec(query, ex.Name, ex.Category, pq.Array(ex.MuscleGroups), ex.MovementPattern, ex.Modality, ex.Instructions, ex.Description, ex.TrackingType, pq.Array(ex.TrackingFields), ex.CaloriesEstimate, ex.ID, ex.UserID)
	if err != nil {
		return err
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("exercise not found or unauthorized")
	}
	return nil
}

// 5. Delete (Ownership check)
func (r *exerciseRepository) DeleteExercise(id int, userID int) error {
	// Start Transaction
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 0. Verify Ownership First (Cannot delete system exercises or others')
	var ownerID int
	err = tx.QueryRow("SELECT user_id FROM exercises WHERE id = $1", id).Scan(&ownerID)
	if err != nil {
		return errors.New("exercise not found")
	}
	if ownerID != userID {
		return errors.New("unauthorized to delete this exercise")
	}

	// 1. Remove from exercise_history_summary (FK to exercises without ON DELETE CASCADE)
	if _, err := tx.Exec(`UPDATE exercise_history_summary SET exercise_id = NULL WHERE exercise_id = $1`, id); err != nil {
		return err
	}

	// 2. Remove from Program Exercises (Delete the instruction from templates)
	if _, err := tx.Exec(`DELETE FROM program_exercises WHERE exercise_id = $1`, id); err != nil {
		return err
	}

	// 3. Unlink from Session Logs (Preserve History! Set ID to NULL, keep Name/Data)
	if _, err := tx.Exec(`UPDATE session_logs SET exercise_id = NULL WHERE exercise_id = $1`, id); err != nil {
		return err
	}

	// 4. Delete from exercises table
	res, err := tx.Exec(`DELETE FROM exercises WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		// If constraint failure happens (e.g. other unexpected dependencies), return err
		return err
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("exercise not found or unauthorized")
	}

	return tx.Commit()
}

// 6. Get History (ProgressView)
func (r *exerciseRepository) GetExerciseHistoryByClientID(clientID int) (*models.ExerciseHistoryResponse, error) {
	// Debug Logging
	fmt.Printf("[DEBUG] Fetching History for ClientID: %d\n", clientID)

	query := `
		SELECT 
			ehs.exercise_name,
			CASE 
				WHEN LOWER(e.modality) = 'strength' THEN 'weight_training'
				WHEN LOWER(e.modality) = 'cardio' THEN 'cardio'
				ELSE 'weight_training'
			END as exercise_type,
			ehs.date,
			COALESCE(ehs.max_weight_kg, 0),
			COALESCE(ehs.total_reps, 0),
			COALESCE(ehs.total_sets, 0),
			COALESCE(ehs.total_distance_km, 0),
			COALESCE(ehs.total_duration_minutes, 0),
			COALESCE(e.tracking_fields, '{}'),
			COALESCE(ehs.is_bodyweight, false),
			COALESCE(ehs.avg_speed, 0),
			COALESCE(ehs.avg_cadence, 0),
			COALESCE(ehs.avg_heart_rate, 0),
			COALESCE(ehs.avg_hr_zone, 0),
			COALESCE(ehs.avg_watts, 0),
			COALESCE(ehs.avg_rpm, 0),
			COALESCE(ehs.total_rounds, 0),
			COALESCE(ehs.max_one_rm, 0),
			COALESCE(ehs.avg_rir, 0),
			COALESCE(ehs.avg_rest_seconds, 0),
			COALESCE(ehs.total_distance_short, 0),
			COALESCE(ehs.avg_rpe, 0)
		FROM exercise_history_summary ehs
		LEFT JOIN exercises e ON ehs.exercise_id = e.id
		WHERE ehs.client_id = $1
		ORDER BY ehs.exercise_name, ehs.date ASC
	`
	rows, err := r.db.Query(query, clientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Map to group by exercise name
	historyMap := make(map[string]*models.ExerciseHistoryItem)

	for rows.Next() {
		var name, exType string
		var date string
		var weight, distance float64
		var reps, sets, duration int
		var trackingFields []string
		var isBodyweight bool
		// Extended fields
		var speed, cadence, heartRate, hrZone, watts, rpm float64
		var rounds int
		var oneRm, rir, restSeconds, distanceShort, rpe float64

		if err := rows.Scan(
			&name, &exType, &date, &weight, &reps, &sets, &distance, &duration,
			pq.Array(&trackingFields), &isBodyweight,
			&speed, &cadence, &heartRate, &hrZone, &watts, &rpm,
			&rounds, &oneRm, &rir, &restSeconds, &distanceShort, &rpe,
		); err != nil {
			continue
		}

		// Initialize if not exists
		if _, exists := historyMap[name]; !exists {
			historyMap[name] = &models.ExerciseHistoryItem{
				ExerciseName:   name,
				Type:           exType,
				IsBodyweight:   isBodyweight,
				TrackingFields: trackingFields,
				History:        []models.ExerciseLogItem{},
				Statistics: models.ExerciseStatistics{
					MaxWeight: 0,
				},
			}
		}

		item := historyMap[name]
		item.History = append(item.History, models.ExerciseLogItem{
			Date:            date,
			WeightKg:        weight,
			Reps:            reps,
			Sets:            sets,
			DistanceKm:      distance,
			DurationMinutes: duration,
			Speed:           speed,
			Cadence:         cadence,
			HeartRate:       heartRate,
			HrZone:          hrZone,
			Watts:           watts,
			Rpm:             rpm,
			Rounds:          rounds,
			OneRm:           oneRm,
			Rir:             rir,
			RestSeconds:     restSeconds,
			DistanceShort:   distanceShort,
			Rpe:             rpe,
		})

		// Simple Stat update
		if weight > item.Statistics.MaxWeight {
			item.Statistics.MaxWeight = weight
		}
		item.Statistics.TotalDistance += distance
		item.Statistics.TotalDuration += duration
	}

	// Convert Map to Slice
	resp := &models.ExerciseHistoryResponse{
		Exercises: make([]models.ExerciseHistoryItem, 0, len(historyMap)),
	}
	for _, v := range historyMap {
		// Calculate Progress % (Simple: Last - First / First * 100)
		if len(v.History) >= 2 {
			first := v.History[0].WeightKg
			last := v.History[len(v.History)-1].WeightKg
			if first > 0 {
				v.Statistics.ProgressPercentage = ((last - first) / first) * 100
			}
		}
		resp.Exercises = append(resp.Exercises, *v)
	}

	return resp, nil
}
