// userservice/internal/repository/training_repository.go
package repository

import (
	"database/sql"
	"fmt"
	"users/internal/models"
)

type TrainingRepository interface {
	GetClientsByTrainerID(trainerID int) ([]models.Client, error)
	CreateClient(client *models.Client) error
	GetProgramsByUserID(userID int, role string) ([]models.Program, error)
	GetSchedulesByUserID(userID int, role string, clientID *int, startDate, endDate string) ([]models.Schedule, error)
	GetAssignmentsByUserID(userID int, role string) ([]models.Assignment, error)

	CreateAssignment(assignment *models.Assignment) error
	CreateProgram(program *models.Program) error
	CreateSchedule(schedule *models.Schedule) error

	UpdateSchedule(schedule *models.Schedule) error
	DeleteSchedule(id int, trainerID int) error
	GetScheduleByID(id int) (*models.Schedule, error)

	UpdateAssignment(a *models.Assignment) error
	DeleteAssignment(id int, trainerID int) error
}

type trainingRepository struct {
	db *sql.DB
}

func NewTrainingRepository(db *sql.DB) TrainingRepository {
	return &trainingRepository{db: db}
}

// 1. ดึงรายชื่อลูกเทรน (Trainees) ของเทรนเนอร์คนนั้น
func (r *trainingRepository) GetClientsByTrainerID(trainerID int) ([]models.Client, error) {
	query := `
        SELECT id, trainer_id, name, email, phone_number, avatar_url, 
               birth_date, gender, height_cm, weight_kg, goal, 
               injuries, activity_level, medical_conditions, created_at
        FROM clients 
        WHERE trainer_id = $1
        ORDER BY created_at DESC
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
			&c.ID, &c.TrainerID, &c.Name, &c.Email, &c.Phone, &c.AvatarURL,
			&c.BirthDate, &c.Gender, &c.Height, &c.Weight, &c.Goal,
			&c.Injuries, &c.ActivityLevel, &c.MedicalConditions, &c.CreatedAt,
		); err != nil {
			return nil, err
		}
		clients = append(clients, c)
	}
	return clients, nil
}

// 2. ดึง Program (ถ้าเป็น Trainer เห็นของที่ตัวเองสร้าง, Client เห็นของตัวเอง)
func (r *trainingRepository) GetProgramsByUserID(userID int, role string) ([]models.Program, error) {
	var query string
	if role == "trainer" {
		query = `SELECT id, name, description, trainer_id, client_id, is_template, created_at FROM programs WHERE trainer_id = $1`
	} else {
		// Fix: Join with clients table to match user_id
		query = `
			SELECT p.id, p.name, p.description, p.trainer_id, p.client_id, p.is_template, p.created_at 
			FROM programs p
			JOIN clients c ON p.client_id = c.id
			WHERE c.user_id = $1
		`
	}

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var programs []models.Program
	for rows.Next() {
		var p models.Program
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.TrainerID, &p.ClientID, &p.IsTemplate, &p.CreatedAt); err != nil {
			return nil, err
		}
		programs = append(programs, p)
	}
	return programs, nil
}

// 3. ดึง Schedules
func (r *trainingRepository) GetSchedulesByUserID(userID int, role string, clientID *int, startDate, endDate string) ([]models.Schedule, error) {
	var query string
	var args []interface{}
	args = append(args, userID)
	argCount := 2 // userID is $1

	if role == "trainer" {
		query = `SELECT id, title, trainer_id, client_id, start_time, end_time, status, rating, feedback, program_id, program_day_id, session_type, location FROM schedules WHERE trainer_id = $1`

		// [NEW] Filter by Client (Optional)
		if clientID != nil {
			query += fmt.Sprintf(" AND client_id = $%d", argCount)
			args = append(args, *clientID)
			argCount++
		}
	} else {
		// Fix: Join with clients table to match user_id
		query = `
			SELECT s.id, s.title, s.trainer_id, s.client_id, s.start_time, s.end_time, s.status, s.rating, s.feedback, s.program_id, s.program_day_id, s.session_type, s.location
			FROM schedules s
			JOIN clients c ON s.client_id = c.id
			WHERE c.user_id = $1
		`
	}

	// [NEW] Date Range Filter
	if startDate != "" {
		query += fmt.Sprintf(" AND start_time >= $%d", argCount)
		args = append(args, startDate)
		argCount++
	}
	if endDate != "" {
		query += fmt.Sprintf(" AND start_time <= $%d", argCount)
		args = append(args, endDate)
		argCount++
	}

	query += ` ORDER BY start_time ASC`

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var schedules []models.Schedule
	for rows.Next() {
		var s models.Schedule
		var title, status, sessionType, location sql.NullString
		var clientID, trainerID sql.NullInt64
		var startTime, endTime sql.NullTime
		var rating sql.NullInt64
		var feedback sql.NullString

		if err := rows.Scan(&s.ID, &title, &trainerID, &clientID, &startTime, &endTime, &status, &rating, &feedback, &s.ProgramID, &s.ProgramDayID, &sessionType, &location); err != nil {
			return nil, err
		}

		if title.Valid {
			s.Title = title.String
		}
		if sessionType.Valid {
			s.Type = sessionType.String
		}
		if location.Valid {
			s.Location = location.String
		}
		if clientID.Valid {
			s.ClientID = int(clientID.Int64)
		}
		if trainerID.Valid {
			s.TrainerID = int(trainerID.Int64)
		}
		if startTime.Valid {
			s.StartTime = startTime.Time
		}
		if endTime.Valid {
			s.EndTime = endTime.Time
		}
		if status.Valid {
			s.Status = status.String
		}
		if rating.Valid {
			r := int(rating.Int64)
			s.Rating = &r
		}
		if feedback.Valid {
			s.Feedback = feedback.String
		}

		// Fetch Logs for the schedule to show in Summary Card
		logsQuery := `SELECT id, schedule_id, exercise_id, exercise_name, category FROM session_logs WHERE schedule_id = $1 ORDER BY "order" ASC`
		logRows, err := r.db.Query(logsQuery, s.ID)
		if err == nil {
			var logs []models.SessionLog
			for logRows.Next() {
				var l models.SessionLog
				var exID sql.NullInt64
				var exName, cat sql.NullString
				logRows.Scan(&l.ID, &l.ScheduleID, &exID, &exName, &cat)
				if exID.Valid {
					id := int(exID.Int64)
					l.ExerciseID = &id
				}
				if exName.Valid {
					l.ExerciseName = exName.String
				}
				if cat.Valid {
					l.Category = cat.String
				}

				// Fetch Sets Count/Details (Optimized: Just count or simple fetch)
				// Frontend uses log.sets.length
				setsQuery := `SELECT id FROM session_log_sets WHERE session_log_id = $1`
				setRows, err := r.db.Query(setsQuery, l.ID)
				if err == nil {
					var sets []models.SessionLogSet
					for setRows.Next() {
						var st models.SessionLogSet
						setRows.Scan(&st.ID)
						sets = append(sets, st)
					}
					setRows.Close()
					l.Sets = sets
				}

				logs = append(logs, l)
			}
			logRows.Close()
			s.Logs = logs
		}

		schedules = append(schedules, s)
	}
	return schedules, nil
}

// 4. ดึง Assignments
func (r *trainingRepository) GetAssignmentsByUserID(userID int, role string) ([]models.Assignment, error) {
	var query string
	if role == "trainer" {
		query = `SELECT id, title, description, client_id, trainer_id, due_date, status FROM assignments WHERE trainer_id = $1`
	} else {
		// Fix: Join with clients table to match user_id
		query = `
			SELECT a.id, a.title, a.description, a.client_id, a.trainer_id, a.due_date, a.status 
			FROM assignments a
			JOIN clients c ON a.client_id = c.id
			WHERE c.user_id = $1
		`
	}

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assignments []models.Assignment
	for rows.Next() {
		var a models.Assignment
		if err := rows.Scan(&a.ID, &a.Title, &a.Description, &a.ClientID, &a.TrainerID, &a.DueDate, &a.Status); err != nil {
			return nil, err
		}
		assignments = append(assignments, a)
	}
	return assignments, nil
}

// 5. สร้างโปรแกรมการฝึกใหม่
func (r *trainingRepository) CreateProgram(program *models.Program) error {
	query := `
		INSERT INTO programs (name, description, trainer_id, client_id, is_template)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at,updated_at
	`
	// ถ้า ClientID เป็น 0 หรือ nil ให้ส่ง nil เข้า DB
	return r.db.QueryRow(
		query,
		program.Name,
		program.Description,
		program.TrainerID,
		program.ClientID,
		program.IsTemplate,
	).Scan(&program.ID, &program.CreatedAt, &program.UpdatedAt)
}

// 6. สร้างตารางนัดหมายใหม่
func (r *trainingRepository) CreateSchedule(schedule *models.Schedule) error {
	query := `
		INSERT INTO schedules (title, trainer_id, client_id, start_time, end_time, status, program_id, program_day_id)
		VALUES ($1, $2, $3, $4, $5, 'scheduled', $6, $7)
		RETURNING id, created_at
	`
	return r.db.QueryRow(
		query,
		schedule.Title,
		schedule.TrainerID,
		schedule.ClientID,
		schedule.StartTime,
		schedule.EndTime,
		schedule.ProgramID,
		schedule.ProgramDayID,
	).Scan(&schedule.ID, &schedule.CreatedAt)
}

// 7. สร้างงานมอบหมายใหม่ (Create Assignment)
func (r *trainingRepository) CreateAssignment(assignment *models.Assignment) error {
	query := `
		INSERT INTO assignments (title, description, client_id, trainer_id, due_date, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`
	// (แก้ไข) เปลี่ยนค่าที่ส่งไปให้ตรงกับ Assignment struct
	return r.db.QueryRow(
		query,
		assignment.Title,
		assignment.Description,
		assignment.ClientID,
		assignment.TrainerID,
		assignment.DueDate,
		assignment.Status,
	).Scan(&assignment.ID, &assignment.CreatedAt)
}

// Get Schedule by ID
func (r *trainingRepository) GetScheduleByID(id int) (*models.Schedule, error) {
	query := `SELECT id, title, trainer_id, client_id, start_time, end_time, status, rating, feedback, program_id, program_day_id, session_type, location FROM schedules WHERE id = $1`
	var s models.Schedule
	var title, status, feedback, sessionType, location sql.NullString
	var rating sql.NullInt64

	err := r.db.QueryRow(query, id).Scan(
		&s.ID, &title, &s.TrainerID, &s.ClientID, &s.StartTime, &s.EndTime, &status, &rating, &feedback, &s.ProgramID, &s.ProgramDayID, &sessionType, &location,
	)
	if err != nil {
		return nil, err
	}

	if title.Valid {
		s.Title = title.String
	}
	if sessionType.Valid {
		s.Type = sessionType.String
	}
	if location.Valid {
		s.Location = location.String
	}
	if status.Valid {
		s.Status = status.String
	}
	if rating.Valid {
		r := int(rating.Int64)
		s.Rating = &r
	}
	if feedback.Valid {
		s.Feedback = feedback.String
	}

	return &s, nil
}

// Update Schedule
func (r *trainingRepository) UpdateSchedule(schedule *models.Schedule) error {
	query := `
		UPDATE schedules
		SET title=$1, client_id=$2, start_time=$3, end_time=$4, status=$5, program_id=$6, program_day_id=$7, updated_at=NOW()
		WHERE id=$8 AND trainer_id=$9
		RETURNING updated_at
	`
	return r.db.QueryRow(
		query,
		schedule.Title,
		schedule.ClientID,
		schedule.StartTime,
		schedule.EndTime,
		schedule.Status,
		schedule.ProgramID,
		schedule.ProgramDayID,
		schedule.ID,
		schedule.TrainerID,
	).Scan(&schedule.UpdatedAt)
}

// Delete Schedule (cascade: exercise_history_summary → session_log_sets → session_logs → schedule)
func (r *trainingRepository) DeleteSchedule(id int, trainerID int) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Delete exercise_history_summary (FK to schedules without ON DELETE CASCADE)
	_, err = tx.Exec(`DELETE FROM exercise_history_summary WHERE schedule_id=$1`, id)
	if err != nil {
		return err
	}

	// 2. Delete session_log_sets for all logs of this schedule
	_, err = tx.Exec(`DELETE FROM session_log_sets WHERE session_log_id IN (SELECT id FROM session_logs WHERE schedule_id=$1)`, id)
	if err != nil {
		return err
	}

	// 3. Delete session_logs
	_, err = tx.Exec(`DELETE FROM session_logs WHERE schedule_id=$1`, id)
	if err != nil {
		return err
	}

	// 4. Delete the schedule itself
	res, err := tx.Exec(`DELETE FROM schedules WHERE id=$1 AND trainer_id=$2`, id, trainerID)
	if err != nil {
		return err
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return sql.ErrNoRows
	}

	return tx.Commit()
}

// Update Assignment
func (r *trainingRepository) UpdateAssignment(a *models.Assignment) error {
	query := `
		UPDATE assignments
		SET title=$1, description=$2, client_id=$3, due_date=$4, status=$5, updated_at=NOW()
		WHERE id=$6 AND trainer_id=$7
		RETURNING updated_at
	`
	return r.db.QueryRow(
		query,
		a.Title,
		a.Description,
		a.ClientID,
		a.DueDate,
		a.Status,
		a.ID,
		a.TrainerID,
	).Scan(&a.UpdatedAt)
}

// Delete Assignment
func (r *trainingRepository) DeleteAssignment(id int, trainerID int) error {
	query := `DELETE FROM assignments WHERE id=$1 AND trainer_id=$2`
	res, err := r.db.Exec(query, id, trainerID)
	if err != nil {
		return err
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// 8. สร้างลูกค้าใหม่ (Create Client)
func (r *trainingRepository) CreateClient(client *models.Client) error {
	// Step 1: Check if a User with this email already exists
	// We want to link the client to the user immediately if possible
	var existingUserID *int
	checkUserQuery := `SELECT id FROM users WHERE email = $1 LIMIT 1`
	if client.Email != nil {
		var uid int
		err := r.db.QueryRow(checkUserQuery, *client.Email).Scan(&uid)
		if err == nil {
			existingUserID = &uid
		}
	}

	// Step 2: Insert Client (with user_id if found)
	query := `
		INSERT INTO clients (
            trainer_id, name, email, phone_number, 
            gender, height_cm, weight_kg, goal, birth_date, injuries, user_id
        )
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at
	`
	return r.db.QueryRow(
		query,
		client.TrainerID, client.Name, client.Email, client.Phone,
		client.Gender, client.Height, client.Weight, client.Goal, client.BirthDate, client.Injuries, existingUserID,
	).Scan(&client.ID, &client.CreatedAt)
}
