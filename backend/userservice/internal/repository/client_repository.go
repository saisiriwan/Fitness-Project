package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"users/internal/models"

	"github.com/lib/pq"
)

type ClientRepository interface {
	GetAllClients(trainerID int) ([]models.Client, error)
	CreateClient(client *models.Client) error
	GetClientByID(id int, trainerID int) (*models.Client, error)
	UpdateClient(client *models.Client) error
	DeleteClient(id int, trainerID int) error

	// Metrics methods
	GetAllMetrics() ([]models.ClientMetric, error)

	// Note methods
	GetNotesByClientID(clientID int) ([]models.ClientNote, error)
	CreateNote(note *models.ClientNote) error
	UpdateNote(note *models.ClientNote) error
	DeleteNote(id int) error

	// Client Specific Metrics
	GetMetricsByClientID(clientID int) ([]models.ClientMetric, error)
	CreateMetrics(metrics []models.ClientMetric) error

	// Auth / Profile
	GetClientByUserID(userID int) (*models.Client, error)
	LinkUserByEmail(email string, userID int) error
}

type clientRepository struct {
	db *sql.DB
}

func NewClientRepository(db *sql.DB) ClientRepository {
	return &clientRepository{db: db}
}

// -----------------------

// 1. Get All Clients
// ✅ FIX: เพิ่ม COALESCE สำหรับ preferred_workout_days (NULL text[] → pq.Array crash)
func (r *clientRepository) GetAllClients(trainerID int) ([]models.Client, error) {
	query := `
		SELECT c.id, c.trainer_id, c.user_id, c.name, c.email, c.phone_number, c.avatar_url, 
		       c.birth_date, c.gender, c.height_cm, c.weight_kg, c.target_weight, c.target_date, c.goal, 
		       c.injuries, c.activity_level, c.medical_conditions, c.status, c.created_at, c.updated_at,
		       ap.program_id as current_program_id,
		       p.name as current_program_name,
		       c.fitness_level, COALESCE(c.preferred_workout_days, '{}') as preferred_workout_days, c.workout_frequency_per_week, c.notes
		FROM clients c
		LEFT JOIN client_active_programs ap ON c.id = ap.client_id AND ap.status = 'active'
		LEFT JOIN programs p ON ap.program_id = p.id
		WHERE c.trainer_id = $1
		ORDER BY c.created_at DESC
	`
	rows, err := r.db.Query(query, trainerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clients []models.Client
	for rows.Next() {
		var c models.Client
		if err := rows.Scan(
			&c.ID, &c.TrainerID, &c.UserID, &c.Name, &c.Email, &c.Phone, &c.AvatarURL,
			&c.BirthDate, &c.Gender, &c.Height, &c.Weight, &c.TargetWeight, &c.TargetDate, &c.Goal,
			&c.Injuries, &c.ActivityLevel, &c.MedicalConditions, &c.Status, &c.CreatedAt, &c.UpdatedAt,
			&c.CurrentProgramID, &c.CurrentProgramName,
			&c.FitnessLevel, pq.Array(&c.PreferredWorkoutDays), &c.WorkoutFrequencyPerWeek, &c.Notes,
		); err != nil {
			fmt.Println("Scan Error:", err)
			return nil, err
		}
		clients = append(clients, c)
	}
	return clients, nil
}

// 2. Create Client
func (r *clientRepository) CreateClient(client *models.Client) error {
	query := `
		INSERT INTO clients (
			trainer_id, user_id, name, email, phone_number, 
			gender, height_cm, weight_kg, target_weight, target_date,
			goal, birth_date, injuries, activity_level, medical_conditions, avatar_url,
			status, fitness_level, preferred_workout_days, workout_frequency_per_week, notes
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
		RETURNING id, created_at
	`
	return r.db.QueryRow(
		query,
		client.TrainerID, client.UserID, client.Name, client.Email, client.Phone,
		client.Gender, client.Height, client.Weight, client.TargetWeight, client.TargetDate,
		client.Goal, client.BirthDate, client.Injuries, client.ActivityLevel, client.MedicalConditions, client.AvatarURL,
		client.Status, client.FitnessLevel, pq.Array(client.PreferredWorkoutDays), client.WorkoutFrequencyPerWeek, client.Notes,
	).Scan(&client.ID, &client.CreatedAt)
}

// 3. Get Client By ID
// ✅ FIX: เพิ่ม COALESCE สำหรับ preferred_workout_days
func (r *clientRepository) GetClientByID(id int, trainerID int) (*models.Client, error) {
	query := `
		SELECT id, trainer_id, user_id, name, email, phone_number, avatar_url, 
		       birth_date, gender, height_cm, weight_kg, target_weight, target_date,
		       goal, injuries, activity_level, medical_conditions, status, created_at, updated_at,
		       fitness_level, COALESCE(preferred_workout_days, '{}') as preferred_workout_days, workout_frequency_per_week, notes
		FROM clients 
		WHERE id = $1 AND trainer_id = $2
	`
	var c models.Client
	err := r.db.QueryRow(query, id, trainerID).Scan(
		&c.ID, &c.TrainerID, &c.UserID, &c.Name, &c.Email, &c.Phone, &c.AvatarURL,
		&c.BirthDate, &c.Gender, &c.Height, &c.Weight, &c.TargetWeight, &c.TargetDate,
		&c.Goal, &c.Injuries, &c.ActivityLevel, &c.MedicalConditions, &c.Status, &c.CreatedAt, &c.UpdatedAt,
		&c.FitnessLevel, pq.Array(&c.PreferredWorkoutDays), &c.WorkoutFrequencyPerWeek, &c.Notes,
	)
	if err == sql.ErrNoRows {
		return nil, errors.New("client not found")
	}
	return &c, err
}

// 3.1 Get Client By User ID
// ✅ FIX: เพิ่ม COALESCE สำหรับ preferred_workout_days
func (r *clientRepository) GetClientByUserID(userID int) (*models.Client, error) {
	query := `
		SELECT c.id, c.trainer_id, c.user_id, c.name, c.email, c.phone_number, c.avatar_url, 
		       c.birth_date, c.gender, c.height_cm, c.weight_kg, c.target_weight, c.target_date,
		       c.goal, c.injuries, c.activity_level, c.medical_conditions, c.status, c.created_at, c.updated_at,
		       COALESCE(u.name, 'Unknown Trainer') as trainer_name,
		       c.fitness_level, COALESCE(c.preferred_workout_days, '{}') as preferred_workout_days, c.workout_frequency_per_week, c.notes
		FROM clients c
		LEFT JOIN users u ON c.trainer_id = u.id
		WHERE c.user_id = $1
	`
	var c models.Client
	var trainerID sql.NullInt64
	err := r.db.QueryRow(query, userID).Scan(
		&c.ID, &trainerID, &c.UserID, &c.Name, &c.Email, &c.Phone, &c.AvatarURL,
		&c.BirthDate, &c.Gender, &c.Height, &c.Weight, &c.TargetWeight, &c.TargetDate,
		&c.Goal, &c.Injuries, &c.ActivityLevel, &c.MedicalConditions, &c.Status, &c.CreatedAt, &c.UpdatedAt,
		&c.TrainerName,
		&c.FitnessLevel, pq.Array(&c.PreferredWorkoutDays), &c.WorkoutFrequencyPerWeek, &c.Notes,
	)
	if err == sql.ErrNoRows {
		return nil, errors.New("client profile not found")
	}
	if trainerID.Valid {
		id := int(trainerID.Int64)
		c.TrainerID = &id
	}
	return &c, err
}

// 4. Update Client
func (r *clientRepository) UpdateClient(client *models.Client) error {
	var existingUserID *int
	if client.Email != nil {
		checkUserQuery := `SELECT id FROM users WHERE email = $1 LIMIT 1`
		var uid int
		err := r.db.QueryRow(checkUserQuery, *client.Email).Scan(&uid)
		if err == nil {
			existingUserID = &uid
		}
	}

	query := `
		UPDATE clients 
		SET name=$1, email=$2, phone_number=$3, gender=$4, 
		    height_cm=$5, weight_kg=$6, target_weight=$7, target_date=$8,
		    goal=$9, birth_date=$10, injuries=$11, activity_level=$12, 
		    medical_conditions=$13, avatar_url=$14,
		    user_id=$15,
		    status=$16, fitness_level=$17, preferred_workout_days=$18, workout_frequency_per_week=$19, notes=$20
		WHERE id=$21 AND trainer_id=$22
	`
	res, err := r.db.Exec(query,
		client.Name, client.Email, client.Phone, client.Gender,
		client.Height, client.Weight, client.TargetWeight, client.TargetDate,
		client.Goal, client.BirthDate, client.Injuries, client.ActivityLevel,
		client.MedicalConditions, client.AvatarURL,
		existingUserID,
		client.Status, client.FitnessLevel, pq.Array(client.PreferredWorkoutDays), client.WorkoutFrequencyPerWeek, client.Notes,
		client.ID, client.TrainerID,
	)
	if err != nil {
		return err
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("client not found or unauthorized")
	}
	return nil
}

// 5. Delete Client
func (r *clientRepository) DeleteClient(id int, trainerID int) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec(`DELETE FROM client_metrics WHERE client_id=$1`, id)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`DELETE FROM client_notes WHERE client_id=$1`, id)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`DELETE FROM exercise_history_summary WHERE client_id=$1`, id)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`DELETE FROM client_active_programs WHERE client_id=$1`, id)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`DELETE FROM client_streaks WHERE client_id=$1`, id)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`DELETE FROM assignments WHERE client_id=$1 AND trainer_id=$2`, id, trainerID)
	if err != nil {
		return err
	}

	// Delete session_log_sets and session_logs for schedules belonging to this client
	_, err = tx.Exec(`
		DELETE FROM session_log_sets WHERE session_log_id IN (
			SELECT sl.id FROM session_logs sl
			JOIN schedules s ON sl.schedule_id = s.id
			WHERE s.client_id = $1
		)
	`, id)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`
		DELETE FROM session_logs WHERE schedule_id IN (
			SELECT id FROM schedules WHERE client_id = $1
		)
	`, id)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`DELETE FROM schedules WHERE client_id=$1`, id)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`DELETE FROM programs WHERE client_id=$1 AND trainer_id=$2`, id, trainerID)
	if err != nil {
		return err
	}

	res, err := tx.Exec(`DELETE FROM clients WHERE id=$1 AND trainer_id=$2`, id, trainerID)
	if err != nil {
		return err
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errors.New("client not found or unauthorized")
	}

	return tx.Commit()
}

func (r *clientRepository) GetAllMetrics() ([]models.ClientMetric, error) {
	query := `
		SELECT id, client_id, date, type, value, created_at 
		FROM client_metrics 
		ORDER BY date DESC, client_id ASC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var metrics []models.ClientMetric
	for rows.Next() {
		var m models.ClientMetric
		if err := rows.Scan(&m.ID, &m.ClientID, &m.Date, &m.Type, &m.Value, &m.CreatedAt); err != nil {
			return nil, err
		}
		metrics = append(metrics, m)
	}
	return metrics, nil
}

func (r *clientRepository) GetNotesByClientID(clientID int) ([]models.ClientNote, error) {
	query := `
		SELECT id, client_id, content, type, created_by, created_at 
		FROM client_notes 
		WHERE client_id = $1 
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query, clientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []models.ClientNote
	for rows.Next() {
		var n models.ClientNote
		if err := rows.Scan(&n.ID, &n.ClientID, &n.Content, &n.Type, &n.CreatedBy, &n.CreatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	return notes, nil
}

func (r *clientRepository) CreateNote(note *models.ClientNote) error {
	query := `
		INSERT INTO client_notes (client_id, content, type, created_by) 
		VALUES ($1, $2, $3, $4) 
		RETURNING id, created_at
	`
	return r.db.QueryRow(
		query,
		note.ClientID,
		note.Content,
		note.Type,
		note.CreatedBy,
	).Scan(&note.ID, &note.CreatedAt)
}

func (r *clientRepository) UpdateNote(note *models.ClientNote) error {
	query := `
		UPDATE client_notes 
		SET content = $1, type = $2
		WHERE id = $3
	`
	res, err := r.db.Exec(query, note.Content, note.Type, note.ID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("note not found")
	}
	return nil
}

func (r *clientRepository) DeleteNote(id int) error {
	query := `DELETE FROM client_notes WHERE id = $1`
	res, err := r.db.Exec(query, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("note not found")
	}
	return nil
}

func (r *clientRepository) GetMetricsByClientID(clientID int) ([]models.ClientMetric, error) {
	query := `
		SELECT id, client_id, date, type, value, created_at 
		FROM client_metrics 
		WHERE client_id = $1 
		ORDER BY date ASC, type ASC
	`
	rows, err := r.db.Query(query, clientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var metrics []models.ClientMetric
	for rows.Next() {
		var m models.ClientMetric
		if err := rows.Scan(&m.ID, &m.ClientID, &m.Date, &m.Type, &m.Value, &m.CreatedAt); err != nil {
			return nil, err
		}
		metrics = append(metrics, m)
	}
	return metrics, nil
}

func (r *clientRepository) CreateMetrics(metrics []models.ClientMetric) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO client_metrics (client_id, type, value, date)
		VALUES ($1, $2, $3, $4)
	`
	deleteQuery := `DELETE FROM client_metrics WHERE client_id=$1 AND type=$2 AND date($3) = date(date)`

	for _, m := range metrics {
		_, err := tx.Exec(deleteQuery, m.ClientID, m.Type, m.Date)
		if err != nil {
			return err
		}

		_, err = tx.Exec(query, m.ClientID, m.Type, m.Value, m.Date)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *clientRepository) LinkUserByEmail(email string, userID int) error {
	fmt.Printf("[LinkUserByEmail] Attempting to link email: %s to UserID: %d\n", email, userID)
	query := `UPDATE clients SET user_id = $1 WHERE LOWER(TRIM(email)) = LOWER(TRIM($2)) AND user_id IS NULL`
	res, err := r.db.Exec(query, userID, email)
	if err != nil {
		fmt.Printf("[LinkUserByEmail] Error executing update: %v\n", err)
		return err
	}

	rows, _ := res.RowsAffected()
	fmt.Printf("[LinkUserByEmail] Rows affected: %d\n", rows)
	return nil
}
