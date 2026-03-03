package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"
	"users/internal/models"

	"strings"

	"github.com/lib/pq"
)

type ProgramRepository interface {
	// Program CRUD
	CreateProgram(p *models.Program) error
	GetProgramsByTrainerID(trainerID int) ([]models.Program, error)
	GetProgramByID(id int) (*models.Program, error)
	UpdateProgram(p *models.Program) error
	DeleteProgram(id int, trainerID int) error
	CloneProgram(id int, trainerID int) error

	// Program Exercises
	AddExercise(pe *models.ProgramExercise) error
	GetExercisesBySectionID(sectionID int) ([]models.ProgramExercise, error)
	DeleteExerciseFromSection(id int) error
	UpdateProgramExercise(pe *models.ProgramExercise) error

	// Program Days
	CreateProgramDay(pd *models.ProgramDay) error
	GetDaysByProgramID(programID int) ([]models.ProgramDay, error)
	DeleteProgramDay(id int) error
	UpdateProgramDay(pd *models.ProgramDay) error

	// Program Sections
	CreateProgramSection(ps *models.ProgramSection) error
	GetSectionsByDayID(dayID int) ([]models.ProgramSection, error)
	DeleteProgramSection(id int) error
	UpdateProgramSection(ps *models.ProgramSection) error

	// Assignment
	AssignProgramToClients(programID int, clientIDs []int, startDate string, startTime string, endTime string) error

	// ProgressView (Client App)
	GetCurrentProgramByClientID(clientID int) (*models.CurrentProgramResponse, error)
	GetProgramStatistics(clientID int, period string) (*models.ProgramStatisticsResponse, error)
}

type programRepository struct {
	db *sql.DB
}

func NewProgramRepository(db *sql.DB) ProgramRepository {
	return &programRepository{db: db}
}

// --- Implementation ---

func (r *programRepository) CreateProgram(p *models.Program) error {
	query := `
		INSERT INTO programs (name, description, duration_weeks, days_per_week, trainer_id, client_id, is_template, status, total_weeks)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at`
	return r.db.QueryRow(query, p.Name, p.Description, p.DurationWeeks, p.DaysPerWeek, p.TrainerID, p.ClientID, p.IsTemplate, p.Status, p.TotalWeeks).
		Scan(&p.ID, &p.CreatedAt)
}

func (r *programRepository) GetProgramsByTrainerID(trainerID int) ([]models.Program, error) {
	query := `SELECT id, name, description, duration_weeks, days_per_week, trainer_id, client_id, parent_program_id, is_template, status, start_date, end_date, current_week, total_weeks, target_description, created_at FROM programs WHERE trainer_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.Query(query, trainerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var programs []models.Program
	for rows.Next() {
		var p models.Program
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.DurationWeeks, &p.DaysPerWeek, &p.TrainerID, &p.ClientID, &p.ParentProgramID, &p.IsTemplate, &p.Status, &p.StartDate, &p.EndDate, &p.CurrentWeek, &p.TotalWeeks, &p.TargetDescription, &p.CreatedAt); err != nil {
			return nil, err
		}
		programs = append(programs, p)
	}
	return programs, nil
}

func (r *programRepository) GetProgramByID(id int) (*models.Program, error) {
	query := `SELECT id, name, description, duration_weeks, days_per_week, trainer_id, client_id, is_template, status, start_date, end_date, current_week, total_weeks, target_description, created_at FROM programs WHERE id = $1`
	var p models.Program
	err := r.db.QueryRow(query, id).Scan(&p.ID, &p.Name, &p.Description, &p.DurationWeeks, &p.DaysPerWeek, &p.TrainerID, &p.ClientID, &p.IsTemplate, &p.Status, &p.StartDate, &p.EndDate, &p.CurrentWeek, &p.TotalWeeks, &p.TargetDescription, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// --- Program Exercises ---

// --- Program Days ---

func (r *programRepository) CreateProgramDay(pd *models.ProgramDay) error {
	query := `
		INSERT INTO program_days (program_id, week_number, day_number, name, is_rest_day)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`
	return r.db.QueryRow(query, pd.ProgramID, pd.WeekNumber, pd.DayNumber, pd.Name, pd.IsRestDay).Scan(&pd.ID)
}

func (r *programRepository) GetDaysByProgramID(programID int) ([]models.ProgramDay, error) {
	query := `SELECT id, program_id, week_number, day_number, name, is_rest_day FROM program_days WHERE program_id = $1 ORDER BY week_number, day_number`
	rows, err := r.db.Query(query, programID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var days []models.ProgramDay
	for rows.Next() {
		var day models.ProgramDay
		if err := rows.Scan(&day.ID, &day.ProgramID, &day.WeekNumber, &day.DayNumber, &day.Name, &day.IsRestDay); err != nil {
			continue
		}
		days = append(days, day)
	}
	return days, nil
}

func (r *programRepository) DeleteProgramDay(id int) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Unlink from Schedules
	if _, err := tx.Exec(`UPDATE schedules SET program_day_id = NULL WHERE program_day_id = $1`, id); err != nil {
		return err
	}

	// 2. Delete Day
	if _, err := tx.Exec(`DELETE FROM program_days WHERE id=$1`, id); err != nil {
		return err
	}

	return tx.Commit()
}

func (r *programRepository) UpdateProgramDay(pd *models.ProgramDay) error {
	query := `UPDATE program_days SET name=$1, is_rest_day=$2 WHERE id=$3`
	_, err := r.db.Exec(query, pd.Name, pd.IsRestDay, pd.ID)
	return err
}

// --- Program Sections ---

func (r *programRepository) CreateProgramSection(ps *models.ProgramSection) error {
	query := `
		INSERT INTO program_sections (program_day_id, type, format, name, duration_seconds, work_seconds, rest_seconds_section, rounds, "order", notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`
	return r.db.QueryRow(query, ps.ProgramDayID, ps.Type, ps.Format, ps.Name, ps.DurationSeconds, ps.WorkSeconds, ps.RestSecondsSection, ps.Rounds, ps.Order, ps.Notes).Scan(&ps.ID)
}

func (r *programRepository) GetSectionsByDayID(dayID int) ([]models.ProgramSection, error) {
	query := `SELECT id, program_day_id, type, format, name, duration_seconds, work_seconds, rest_seconds_section, rounds, "order", notes 
	          FROM program_sections WHERE program_day_id = $1 ORDER BY "order"`
	rows, err := r.db.Query(query, dayID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sections []models.ProgramSection
	for rows.Next() {
		var s models.ProgramSection
		if err := rows.Scan(&s.ID, &s.ProgramDayID, &s.Type, &s.Format, &s.Name, &s.DurationSeconds, &s.WorkSeconds, &s.RestSecondsSection, &s.Rounds, &s.Order, &s.Notes); err != nil {
			continue
		}
		sections = append(sections, s)
	}
	return sections, nil
}

func (r *programRepository) DeleteProgramSection(id int) error {
	_, err := r.db.Exec(`DELETE FROM program_sections WHERE id=$1`, id)
	return err
}

func (r *programRepository) UpdateProgramSection(ps *models.ProgramSection) error {
	query := `UPDATE program_sections SET type=$1, format=$2, name=$3, duration_seconds=$4, work_seconds=$5, rest_seconds_section=$6, rounds=$7, notes=$8 WHERE id=$9`
	_, err := r.db.Exec(query, ps.Type, ps.Format, ps.Name, ps.DurationSeconds, ps.WorkSeconds, ps.RestSecondsSection, ps.Rounds, ps.Notes, ps.ID)
	return err
}

// --- Program Exercises ---

func (r *programRepository) AddExercise(pe *models.ProgramExercise) error {
	query := `
        INSERT INTO program_exercises (
			program_section_id, exercise_id, 
			reps, weight, distance, pace, side,
			sets, reps_min, reps_max, weight_kg, weight_percentage, is_bodyweight, duration_seconds, rest_seconds, rpe_target, notes, "order", tracking_fields,
			duration, rest, rpe, tempo, hold_time, 
			"time", speed, cadence, distance_long, distance_short, one_rm, rir, heart_rate, hr_zone, watts, rpm, rounds
		)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)
        RETURNING id`
	return r.db.QueryRow(query,
		pe.ProgramSectionID, pe.ExerciseID,
		pe.Reps, pe.Weight, pe.Distance, pe.Pace, pe.Side,
		pe.Sets, pe.RepsMin, pe.RepsMax, pe.WeightKg, pe.WeightPercentage, pe.IsBodyweight, pe.DurationSeconds, pe.RestSeconds, pe.RPETarget, pe.Notes, pe.Order,
		pq.Array(pe.TrackingFields),
		pe.Duration, pe.Rest, pe.Rpe, pe.Tempo, pe.HoldTime,
		pe.Time, pe.Speed, pe.Cadence, pe.DistanceLong, pe.DistanceShort, pe.OneRM, pe.RIR, pe.HeartRate, pe.HRZone, pe.Watts, pe.RPM, pe.Rounds,
	).Scan(&pe.ID)
}

func (r *programRepository) GetExercisesBySectionID(sectionID int) ([]models.ProgramExercise, error) {
	query := `
		SELECT 
			pe.id, pe.program_section_id, pe.exercise_id, 
			e.name as exercise_name, COALESCE(e.category, '') as exercise_category,
			pe.reps,
			pe.weight,
			pe.distance,
			pe.pace,
			pe.side,
			pe.sets, 
			COALESCE(pe.reps_min, 0) as reps_min, 
			COALESCE(pe.reps_max, 0) as reps_max, 
			COALESCE(pe.weight_kg, 0) as weight_kg, 
			COALESCE(pe.weight_percentage, 0) as weight_percentage, 
			pe.is_bodyweight,
			COALESCE(pe.duration_seconds, 0) as duration_seconds,
			COALESCE(pe.rest_seconds, 0) as rest_seconds, 
			COALESCE(pe.rpe_target, 0) as rpe_target, 
			COALESCE(pe.notes, '[]')::jsonb as notes,
			pe."order",
			COALESCE(pe.tracking_fields, e.tracking_fields) as tracking_fields,
			pe.duration,
			pe.rest,
			pe.rpe,
			pe.tempo,
			pe.hold_time,
			pe.time,
			pe.speed,
			pe.cadence,
			pe.distance_long,
			pe.distance_short,
			pe.one_rm,
			pe.rir,
			pe.heart_rate,
			pe.hr_zone,
			pe.watts,
			pe.rpm,
			pe.rounds
		FROM program_exercises pe
		LEFT JOIN exercises e ON pe.exercise_id = e.id
		WHERE pe.program_section_id = $1 ORDER BY pe."order" ASC`
	rows, err := r.db.Query(query, sectionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var exercises []models.ProgramExercise
	for rows.Next() {
		var pe models.ProgramExercise
		// Scan into new struct fields
		err := rows.Scan(
			&pe.ID, &pe.ProgramSectionID, &pe.ExerciseID,
			&pe.ExerciseName, &pe.ExerciseCategory,
			&pe.Reps, &pe.Weight, &pe.Distance, &pe.Pace, &pe.Side,
			&pe.Sets, &pe.RepsMin, &pe.RepsMax,
			&pe.WeightKg, &pe.WeightPercentage, &pe.IsBodyweight,
			&pe.DurationSeconds, &pe.RestSeconds, &pe.RPETarget, &pe.Notes, &pe.Order,
			pq.Array(&pe.TrackingFields),
			&pe.Duration, &pe.Rest, &pe.Rpe, &pe.Tempo, &pe.HoldTime,
			&pe.Time, &pe.Speed, &pe.Cadence, &pe.DistanceLong, &pe.DistanceShort,
			&pe.OneRM, &pe.RIR, &pe.HeartRate, &pe.HRZone, &pe.Watts, &pe.RPM, &pe.Rounds,
		)
		if err != nil {
			return nil, err
		}
		exercises = append(exercises, pe)
	}
	return exercises, nil
}

func (r *programRepository) UpdateProgram(p *models.Program) error {
	query := `
		UPDATE programs 
		SET name=$1, description=$2, duration_weeks=$3, days_per_week=$4, is_template=$5, 
		    status=$6, start_date=$7, end_date=$8, current_week=$9, total_weeks=$10, target_description=$11
		WHERE id=$12 AND trainer_id=$13
	`
	res, err := r.db.Exec(query,
		p.Name, p.Description, p.DurationWeeks, p.DaysPerWeek, p.IsTemplate,
		p.Status, p.StartDate, p.EndDate, p.CurrentWeek, p.TotalWeeks, p.TargetDescription,
		p.ID, p.TrainerID,
	)
	if err != nil {
		return err
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// Helper for MM:SS parsing
func parseDurationString(s string) int {
	if s == "" {
		return 0
	}
	if strings.Contains(s, ":") {
		parts := strings.Split(s, ":")
		if len(parts) == 2 {
			m, _ := strconv.Atoi(parts[0])
			sec, _ := strconv.Atoi(parts[1])
			return m*60 + sec
		}
	}
	val, _ := strconv.Atoi(s)
	return val
}

func (r *programRepository) DeleteProgram(id int, trainerID int) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Handle Schedules: Delete future appointments, preserve completed sessions

	// 1.1 Clean up FK dependencies for scheduled/pending sessions before deleting them
	if _, err := tx.Exec(`DELETE FROM exercise_history_summary WHERE schedule_id IN (SELECT id FROM schedules WHERE program_id = $1 AND status IN ('scheduled', 'pending'))`, id); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM session_log_sets WHERE session_log_id IN (SELECT id FROM session_logs WHERE schedule_id IN (SELECT id FROM schedules WHERE program_id = $1 AND status IN ('scheduled', 'pending')))`, id); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM session_logs WHERE schedule_id IN (SELECT id FROM schedules WHERE program_id = $1 AND status IN ('scheduled', 'pending'))`, id); err != nil {
		return err
	}

	// 1.2 Delete scheduled (future) appointments
	if _, err := tx.Exec(`DELETE FROM schedules WHERE program_id = $1 AND status IN ('scheduled', 'pending')`, id); err != nil {
		return err
	}

	// 1.3 Unlink all remaining sessions (completed, passed, etc. - preserve workout history but remove program reference)
	if _, err := tx.Exec(`
		UPDATE schedules 
		SET program_id = NULL, program_day_id = NULL 
		WHERE program_id = $1 
	`, id); err != nil {
		return err
	}

	// 2. Unlink Parent Reference (If this is a template, detach its children)
	if _, err := tx.Exec(`UPDATE programs SET parent_program_id = NULL WHERE parent_program_id = $1`, id); err != nil {
		return err
	}

	// 3. Remove from Client Active Programs (If this program is currently active)
	if _, err := tx.Exec(`DELETE FROM client_active_programs WHERE program_id = $1`, id); err != nil {
		return err
	}

	// 4. Delete the Program (Cascades to Days -> Sections -> Exercises)
	query := `DELETE FROM programs WHERE id=$1 AND trainer_id=$2`
	res, err := tx.Exec(query, id, trainerID)
	if err != nil {
		return err
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return sql.ErrNoRows
	}

	return tx.Commit()
}

// --- Program Exercises Delete ---

func (r *programRepository) DeleteExerciseFromProgram(id int) error {
	// Deprecated or removed, kept for interface match temporarily or removed entirely
	// Logic changed to delete from section
	return nil // placeholder
}

// New Delete
func (r *programRepository) DeleteExerciseFromSection(id int) error {
	_, err := r.db.Exec(`DELETE FROM program_exercises WHERE id=$1`, id)
	return err
}

// --- Assignment Logic ---

func (r *programRepository) AssignProgramToClients(programID int, clientIDs []int, startDate string, startTime string, endTime string) error {
	log.Printf("[DEBUG] AssignProgramToClients: ProgramID=%d, ClientIDs=%v, StartDate=%s, Time=%s-%s", programID, clientIDs, startDate, startTime, endTime)

	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Guerilla Logging Helper
	logErrorToDisk := func(msg string, err error) {
		f, _ := os.OpenFile("assignment_error.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if f != nil {
			defer f.Close()
			f.WriteString(fmt.Sprintf("[%s] %s: %v\n", time.Now().Format(time.RFC3339), msg, err))
		}
		log.Printf("[ERROR] %s: %v", msg, err)
	}

	// Fetch program
	program, err := r.GetProgramByID(programID)
	if err != nil {
		logErrorToDisk("Failed to fetch program", err)
		return err
	}

	// Calculate target dates
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		log.Printf("[WARN] Invalid start date format, defaulting to today: %v", err)
		start = time.Now()
	}
	end := start.AddDate(0, 0, program.DurationWeeks*7)

	// Helper to parse time string HH:MM
	parseTime := func(date time.Time, timeStr string, defaultHour int) time.Time {
		if timeStr == "" {
			return time.Date(date.Year(), date.Month(), date.Day(), defaultHour, 0, 0, 0, date.Location())
		}
		parts := strings.Split(timeStr, ":")
		if len(parts) != 2 {
			return time.Date(date.Year(), date.Month(), date.Day(), defaultHour, 0, 0, 0, date.Location())
		}
		h, _ := strconv.Atoi(parts[0])
		m, _ := strconv.Atoi(parts[1])
		return time.Date(date.Year(), date.Month(), date.Day(), h, m, 0, 0, date.Location())
	}

	// Fetch days structure
	days, err := r.GetDaysByProgramID(programID)
	if err != nil {
		log.Printf("[ERROR] Failed to fetch program days: %v", err)
		return err
	}

	for _, clientID := range clientIDs {
		// 1. Create a Child Program (Frozen copy for the client)
		var childProgramID int
		err := tx.QueryRow(`
			INSERT INTO programs (
				name, description, duration_weeks, days_per_week, 
				trainer_id, client_id, is_template, parent_program_id, created_at,
				status, start_date, end_date, total_weeks
			) VALUES ($1, $2, $3, $4, $5, $6, false, $7, NOW(), 'active', $8, $9, $10)
			RETURNING id`,
			program.Name, program.Description, program.DurationWeeks, program.DaysPerWeek,
			program.TrainerID, clientID, programID, start, end, program.DurationWeeks,
		).Scan(&childProgramID)
		if err != nil {
			logErrorToDisk("Failed to insert child program", err)
			return err
		}

		dayMapping := make(map[int]int)

		for _, day := range days {
			var newDayID int
			err := tx.QueryRow(`
				INSERT INTO program_days (program_id, day_number, week_number, name, is_rest_day, created_at)
				VALUES ($1, $2, $3, $4, $5, NOW())
				RETURNING id`,
				childProgramID, day.DayNumber, day.WeekNumber, day.Name, day.IsRestDay,
			).Scan(&newDayID)
			if err != nil {
				logErrorToDisk("Failed to insert program day", err)
				return err
			}
			dayMapping[day.ID] = newDayID

			sections, err := r.GetSectionsByDayID(day.ID)
			if err != nil {
				return err
			}

			for _, section := range sections {
				var newSectionID int
				err := tx.QueryRow(`
					INSERT INTO program_sections (
						program_day_id, type, format, name, duration_seconds,
						work_seconds, rest_seconds_section, rounds, "order", notes, created_at
					) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
					RETURNING id`,
					newDayID, section.Type, section.Format, section.Name, section.DurationSeconds,
					section.WorkSeconds, section.RestSecondsSection, section.Rounds, section.Order, section.Notes,
				).Scan(&newSectionID)
				if err != nil {
					logErrorToDisk("Failed to insert program section", err)
					return err
				}

				exercises, err := r.GetExercisesBySectionID(section.ID)
				if err != nil {
					return err
				}

				for _, exercise := range exercises {
					_, err := tx.Exec(`
						INSERT INTO program_exercises (
							program_section_id, exercise_id, sets, 
							reps, weight, distance, pace, side,
							reps_min, reps_max, weight_kg, weight_percentage, is_bodyweight, 
							duration_seconds, rest_seconds, rpe_target, notes, "order", tracking_fields,
							duration, rest, rpe, tempo, hold_time, 
							"time", speed, cadence, distance_long, distance_short, one_rm, rir, heart_rate, hr_zone, watts, rpm, rounds
						) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)`,
						newSectionID, exercise.ExerciseID, exercise.Sets,
						exercise.Reps, exercise.Weight, exercise.Distance, exercise.Pace, exercise.Side,
						exercise.RepsMin, exercise.RepsMax, exercise.WeightKg, exercise.WeightPercentage, exercise.IsBodyweight,
						exercise.DurationSeconds, exercise.RestSeconds, exercise.RPETarget, exercise.Notes, exercise.Order, pq.Array(exercise.TrackingFields),
						exercise.Duration, exercise.Rest, exercise.Rpe, exercise.Tempo, exercise.HoldTime,
						exercise.Time, exercise.Speed, exercise.Cadence, exercise.DistanceLong, exercise.DistanceShort, exercise.OneRM, exercise.RIR, exercise.HeartRate, exercise.HRZone, exercise.Watts, exercise.RPM, exercise.Rounds,
					)
					if err != nil {
						logErrorToDisk("Failed to insert program exercise", err)
						return err
					}
				}
			}
		}

		// 2. Manage Active Program (Cancel previous and clean up their future schedules)
		// Find the active programs for this client to clean up their schedules
		rowsArgs, err := tx.Query(`SELECT program_id FROM client_active_programs WHERE client_id = $1 AND status = 'active'`, clientID)
		if err == nil {
			var oldProgramIDs []int
			for rowsArgs.Next() {
				var pid int
				if err := rowsArgs.Scan(&pid); err == nil {
					oldProgramIDs = append(oldProgramIDs, pid)
				}
			}
			rowsArgs.Close()

			// Delete future/pending schedules for those old programs so they don't overlap
			for _, pid := range oldProgramIDs {
				tx.Exec(`DELETE FROM exercise_history_summary WHERE schedule_id IN (SELECT id FROM schedules WHERE program_id = $1 AND status IN ('scheduled', 'pending'))`, pid)
				tx.Exec(`DELETE FROM session_log_sets WHERE session_log_id IN (SELECT id FROM session_logs WHERE schedule_id IN (SELECT id FROM schedules WHERE program_id = $1 AND status IN ('scheduled', 'pending')))`, pid)
				tx.Exec(`DELETE FROM session_logs WHERE schedule_id IN (SELECT id FROM schedules WHERE program_id = $1 AND status IN ('scheduled', 'pending'))`, pid)
				tx.Exec(`DELETE FROM schedules WHERE program_id = $1 AND status IN ('scheduled', 'pending')`, pid)
			}
		}

		_, err = tx.Exec(`UPDATE client_active_programs SET status = 'cancelled' WHERE client_id = $1 AND status = 'active'`, clientID)
		if err != nil {
			log.Printf("[WARN] Failed to cancel existing active programs: %v", err)
		}

		var activeProgramID int
		err = tx.QueryRow(`
			INSERT INTO client_active_programs (
				client_id, program_id, start_date, end_date, total_weeks, status
			) VALUES ($1, $2, $3, $4, $5, 'active')
			RETURNING id`,
			clientID, childProgramID, start, end, program.DurationWeeks,
		).Scan(&activeProgramID)
		if err != nil {
			logErrorToDisk("Failed to insert active program", err)
			return err
		}

		// 3. Create Schedules
		for _, day := range days {
			offsetDays := (day.WeekNumber-1)*7 + (day.DayNumber - 1)
			scheduleDate := start.AddDate(0, 0, offsetDays)
			newDayID := dayMapping[day.ID]

			// Pre-check if this day actually has exercises
			sections, _ := r.GetSectionsByDayID(day.ID)
			hasExercises := false
			for _, section := range sections {
				exercises, _ := r.GetExercisesBySectionID(section.ID)
				if len(exercises) > 0 {
					hasExercises = true
					break
				}
			}

			if !hasExercises {
				continue // Skip creating a schedule for rest days or empty days
			}

			// Calculate specific start/end times
			sTime := parseTime(scheduleDate, startTime, 10) // Default 10:00
			eTime := parseTime(scheduleDate, endTime, 11)   // Default 11:00

			var scheduleID int
			err := tx.QueryRow(`
				INSERT INTO schedules (
					client_id, trainer_id, program_id, program_day_id, title,
					start_time, end_time, status, created_at
				) VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', NOW())
				RETURNING id`,
				clientID, program.TrainerID, childProgramID, newDayID, day.Name,
				sTime, eTime,
			).Scan(&scheduleID)
			if err != nil {
				logErrorToDisk("Failed to insert schedule", err)
				return err
			}
			// 4. Create Session Logs
			sections, _ = r.GetSectionsByDayID(day.ID)
			for _, section := range sections {
				exercises, _ := r.GetExercisesBySectionID(section.ID)
				for _, exercise := range exercises {
					var logID int
					err := tx.QueryRow(`
						INSERT INTO session_logs (schedule_id, exercise_id, exercise_name, category, status, "order", section_name, section_order, tracking_fields)
						VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8)
						RETURNING id`,
						scheduleID, exercise.ExerciseID, exercise.ExerciseName, exercise.ExerciseCategory, exercise.Order,
						section.Name, section.Order, pq.Array(exercise.TrackingFields),
					).Scan(&logID)
					if err != nil {
						logErrorToDisk("Failed to insert session log", err)
						return err
					}

					// Read per-set values from JSONB arrays, falling back to legacy columns
					for i := 0; i < exercise.Sets; i++ {
						// Reps: JSONB array (strings) -> fallback to RepsMin
						pReps := exercise.RepsMin
						if i < len(exercise.Reps) {
							if v, convErr := strconv.Atoi(exercise.Reps[i]); convErr == nil && v > 0 {
								pReps = v
							}
						}
						if pReps == 0 && exercise.RepsMax > 0 {
							pReps = exercise.RepsMax
						}

						// Weight: JSONB array (floats) -> fallback to WeightKg
						pWeight := exercise.WeightKg
						if i < len(exercise.Weight) && exercise.Weight[i] > 0 {
							pWeight = exercise.Weight[i]
						}

						// RPE: JSONB array (floats) -> fallback to RPETarget
						pRpe := exercise.RPETarget
						if i < len(exercise.Rpe) && exercise.Rpe[i] > 0 {
							pRpe = exercise.Rpe[i]
						}

						// Prioritize Duration from JSONB array
						pDuration := 0
						if i < len(exercise.Duration) {
							pDuration = parseDurationString(exercise.Duration[i])
						}
						// Fallback to aggregate if set-specific not found or 0
						// (Though logic above overrides. If we want fallback only if 0, keep it)
						if pDuration == 0 && exercise.DurationSeconds > 0 {
							pDuration = int(exercise.DurationSeconds)
						}

						// Distance: JSONB array (strings)
						pDistance := 0.0
						if i < len(exercise.Distance) {
							if v, convErr := strconv.ParseFloat(exercise.Distance[i], 64); convErr == nil {
								pDistance = v
							}
						}

						// Rest: JSONB array (floats, seconds)
						pRest := 0
						if i < len(exercise.Rest) && exercise.Rest[i] > 0 {
							pRest = int(exercise.Rest[i])
						}
						if pRest == 0 && exercise.RestSeconds > 0 {
							pRest = int(exercise.RestSeconds)
						}

						// Metadata (Speed, Cadence, Watts, etc.)
						metadata := make(map[string]interface{})

						// DEBUG LOGGING
						f, openErr := os.OpenFile("debug_assign_log.txt", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
						if openErr == nil {
							defer f.Close()
							fmt.Fprintf(f, "ExID: %d, Speed: %v, RIR: %v, Watts: %v\n", exercise.ExerciseID, exercise.Speed, exercise.RIR, exercise.Watts)
						}

						// Helper to add if valid
						addFloat := func(key string, arr models.JSONFloatArray) {
							if i < len(arr) {
								metadata[key] = arr[i]
							}
						}
						addString := func(key string, arr models.JSONStringArray) {
							if i < len(arr) && arr[i] != "" {
								metadata[key] = arr[i]
							}
						}

						addFloat("speed", exercise.Speed)
						addFloat("cadence", exercise.Cadence)
						addFloat("watts", exercise.Watts)
						addFloat("heart_rate", exercise.HeartRate)
						addFloat("hr_zone", exercise.HRZone)
						addFloat("distance_long", exercise.DistanceLong)
						addFloat("distance_short", exercise.DistanceShort)
						addFloat("one_rm", exercise.OneRM)
						addFloat("rir", exercise.RIR)
						addFloat("rpm", exercise.RPM)
						addFloat("rounds", exercise.Rounds)

						addString("time", exercise.Time)
						addString("hold_time", exercise.HoldTime)
						addString("tempo", exercise.Tempo)

						metadataJSON, _ := json.Marshal(metadata)

						_, err := tx.Exec(`
							INSERT INTO session_log_sets (
								session_log_id, set_number,
								planned_reps, planned_weight_kg, planned_rpe,
								planned_duration_seconds, planned_distance,
								rest_duration_seconds,
								planned_metadata,
								completed
							) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)`,
							logID, i+1, pReps, pWeight, pRpe, pDuration, pDistance, pRest, metadataJSON,
						)
						if err != nil {
							logErrorToDisk("Failed to insert session log set", err)
							return err
						}
					}

				}
			}
		}
	}

	return tx.Commit()
}

// --- Client Dashboard / ProgressView Queries ---

func (r *programRepository) GetCurrentProgramByClientID(clientID int) (*models.CurrentProgramResponse, error) {
	// 1. Get Active Program Info
	queryProgram := `
        SELECT p.name, cap.current_week, cap.total_weeks, p.id, p.days_per_week, cap.start_date, cap.end_date
        FROM client_active_programs cap
        JOIN programs p ON cap.program_id = p.id
        WHERE cap.client_id = $1 AND cap.status = 'active'
        LIMIT 1
    `
	var resp models.CurrentProgramResponse

	err := r.db.QueryRow(queryProgram, clientID).Scan(&resp.Name, &resp.CurrentWeek, &resp.DurationWeeks, &resp.ID, &resp.DaysPerWeek, &resp.StartDate, &resp.EndDate)
	resp.Exercises = []models.ProgramExerciseProgress{}
	if err == sql.ErrNoRows {
		return nil, nil // No active program
	} else if err != nil {
		return nil, err
	}

	// 2. Get Exercises for Current Week
	queryExercises := `
        SELECT 
            e.name, COALESCE(e.tracking_type, ''), COALESCE(e.category, ''), COALESCE(pe.is_bodyweight, false), 
            COALESCE(pe.sets, 0), COALESCE(pe.reps_min, 0), COALESCE(pe.weight_kg, 0), 
            COALESCE(pe.duration_seconds, 0), 0.0 as target_distance
        FROM program_days pd
        JOIN program_sections ps ON ps.program_day_id = pd.id
        JOIN program_exercises pe ON pe.program_section_id = ps.id
        JOIN exercises e ON pe.exercise_id = e.id
        WHERE pd.program_id = $1 AND pd.week_number = $2
        ORDER BY pd.day_number, ps."order", pe."order"
    `
	rows, err := r.db.Query(queryExercises, resp.ID, resp.CurrentWeek)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var exName, exType, exCat string
		var isBW bool
		var sets, reps int
		var weight, duration, distance float64
		if err := rows.Scan(&exName, &exType, &exCat, &isBW, &sets, &reps, &weight, &duration, &distance); err != nil {
			continue
		}

		resp.Exercises = append(resp.Exercises, models.ProgramExerciseProgress{
			Name:         exName,
			Type:         exType,
			Category:     exCat,
			IsBodyweight: isBW,
			ProgramPrescription: &models.PerformanceData{
				Sets:            sets,
				Reps:            reps,
				WeightKg:        weight,
				DurationMinutes: int(duration / 60),
				DistanceKm:      distance,
			},
			CurrentPerformance:  &models.PerformanceData{WeightKg: 0},
			PreviousPerformance: &models.PerformanceData{WeightKg: 0},
			ProgressPercentage:  0,
		})
	}

	return &resp, nil
}

func (r *programRepository) GetProgramStatistics(clientID int, period string) (*models.ProgramStatisticsResponse, error) {
	var stats models.ProgramStatisticsResponse

	// 1. Active Program Stats
	err := r.db.QueryRow(`
        SELECT completion_percentage, current_week
        FROM client_active_programs
        WHERE client_id = $1 AND status = 'active'
    `, clientID).Scan(&stats.CompletionRate, &stats.WeeksCompleted)

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	if err == sql.ErrNoRows {
		stats.CompletionRate = 0
		stats.WeeksCompleted = 0
	}

	// 2. Volume & Workouts (Simplification: All time for now, or use period logic if critical)
	queryStats := `
        SELECT COUNT(id), COALESCE(SUM(total_volume_kg), 0)
        FROM schedules
        WHERE client_id = $1 AND status = 'completed' AND program_id = (
            SELECT program_id FROM client_active_programs WHERE client_id = $1 AND status = 'active' LIMIT 1
        )
    `
	// If period filtering is needed, add WHERE clauses here based on 'period'

	err = r.db.QueryRow(queryStats, clientID).Scan(&stats.TotalWorkouts, &stats.TotalVolume)
	if err != nil {
		return nil, err
	}

	return &stats, nil
}

func (r *programRepository) CloneProgram(programID int, trainerID int) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Fetch Original Program
	var p models.Program
	err = tx.QueryRow(`
		SELECT name, description, duration_weeks, days_per_week, client_id, is_template 
		FROM programs WHERE id = $1 AND trainer_id = $2`, programID, trainerID).
		Scan(&p.Name, &p.Description, &p.DurationWeeks, &p.DaysPerWeek, &p.ClientID, &p.IsTemplate)
	if err != nil {
		return err // Likely sql.ErrNoRows if not found or not owner
	}

	// 2. Create New Program
	newProgramName := "Copy of " + p.Name
	var newProgramID int
	err = tx.QueryRow(`
		INSERT INTO programs (name, description, duration_weeks, days_per_week, trainer_id, client_id, is_template, created_at)
		VALUES ($1, $2, $3, $4, $5, NULL, $6, NOW())
		RETURNING id`,
		newProgramName, p.Description, p.DurationWeeks, p.DaysPerWeek, trainerID, p.IsTemplate,
	).Scan(&newProgramID)
	if err != nil {
		return err
	}

	// 3. Clone Days
	rows, err := tx.Query(`SELECT id, week_number, day_number, name, is_rest_day FROM program_days WHERE program_id = $1 ORDER BY week_number, day_number`, programID)
	if err != nil {
		return err
	}
	defer rows.Close()

	type dayData struct {
		ID      int
		WeekNum int
		DayNum  int
		Name    string
		IsRest  bool
	}
	var cloneDays []dayData
	for rows.Next() {
		var d dayData
		if err := rows.Scan(&d.ID, &d.WeekNum, &d.DayNum, &d.Name, &d.IsRest); err != nil {
			return err
		}
		cloneDays = append(cloneDays, d)
	}
	rows.Close()

	for _, d := range cloneDays {
		var newDayID int
		err = tx.QueryRow(`
			INSERT INTO program_days (program_id, week_number, day_number, name, is_rest_day)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id`,
			newProgramID, d.WeekNum, d.DayNum, d.Name, d.IsRest,
		).Scan(&newDayID)
		if err != nil {
			return err
		}

		// 4. Clone Sections
		secRows, err := tx.Query(`
			SELECT id, type, format, name, duration_seconds, work_seconds, rest_seconds_section, rounds, "order", notes 
			FROM program_sections WHERE program_day_id = $1 ORDER BY "order"`, d.ID)
		if err != nil {
			return err
		}

		type secData struct {
			ID                             int
			Type, Format, Name, Notes      string
			Dur, Work, Rest, Rounds, Order int
			// Handle NULLs
			WorkNull, RestNull, RndNull sql.NullInt32
		}
		var sections []secData
		for secRows.Next() {
			var s secData
			if err := secRows.Scan(&s.ID, &s.Type, &s.Format, &s.Name, &s.Dur, &s.WorkNull, &s.RestNull, &s.RndNull, &s.Order, &s.Notes); err != nil {
				secRows.Close()
				return err
			}
			if s.WorkNull.Valid {
				s.Work = int(s.WorkNull.Int32)
			}
			if s.RestNull.Valid {
				s.Rest = int(s.RestNull.Int32)
			}
			if s.RndNull.Valid {
				s.Rounds = int(s.RndNull.Int32)
			}
			sections = append(sections, s)
		}
		secRows.Close()

		for _, s := range sections {
			var newSecID int
			err = tx.QueryRow(`
				INSERT INTO program_sections (program_day_id, type, format, name, duration_seconds, work_seconds, rest_seconds_section, rounds, "order", notes)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
				RETURNING id`,
				newDayID, s.Type, s.Format, s.Name, s.Dur, s.Work, s.Rest, s.Rounds, s.Order, s.Notes,
			).Scan(&newSecID)
			if err != nil {
				return err
			}

			// 5. Clone Exercises
			exRows, err := tx.Query(`
				SELECT 
					exercise_id, sets, 
					reps, weight, distance, pace, side, 
					reps_min, reps_max, weight_kg, weight_percentage, is_bodyweight, 
					duration_seconds, rest_seconds, rpe_target, notes, "order",
					duration, rest, rpe, tempo, hold_time,
					time, speed, cadence, distance_long, distance_short,
					one_rm, rir, heart_rate, hr_zone, watts, rpm, rounds, tracking_fields
				FROM program_exercises WHERE program_section_id = $1 ORDER BY "order"`, s.ID)
			if err != nil {
				return err
			}

			type exData struct {
				ExID, Sets, Order          int
				RepsMin, RepsMax           int
				WeiKg, WeiPct              float64
				IsBW                       bool
				DurSec, RestSec, RPETarget float64 // Changed to float64
				Notes                      string
				// JSONB Fields as []byte (Raw JSON)
				Reps, Weight, Distance, Pace, Side, Duration, Rest, RPE, Tempo, HoldTime              []byte
				Time, Speed, Cadence, DistLong, DistShort, OneRM, RIR, HR, HRZone, Watts, RPM, Rounds []byte
				TrackingFields                                                                        []byte

				// Null handling
				RepsMinNull, RepsMaxNull, RestNull, RPENull                   sql.NullInt32
				WeiKgNull, WeiPctNull, DurSecNull, RestSecNull, RPETargetNull sql.NullFloat64
				NotesNull                                                     sql.NullString
				TrackingNull                                                  interface{} // Just in case
			}
			var cloneExercises []exData
			for exRows.Next() {
				var e exData
				if err := exRows.Scan(
					&e.ExID, &e.Sets,
					&e.Reps, &e.Weight, &e.Distance, &e.Pace, &e.Side,
					&e.RepsMinNull, &e.RepsMaxNull, &e.WeiKgNull, &e.WeiPctNull, &e.IsBW,
					&e.DurSecNull, &e.RestSecNull, &e.RPETargetNull, &e.NotesNull, &e.Order,
					&e.Duration, &e.Rest, &e.RPE, &e.Tempo, &e.HoldTime,
					&e.Time, &e.Speed, &e.Cadence, &e.DistLong, &e.DistShort,
					&e.OneRM, &e.RIR, &e.HR, &e.HRZone, &e.Watts, &e.RPM, &e.Rounds, &e.TrackingFields,
				); err != nil {
					exRows.Close()
					return err
				}

				// Map Nullables
				if e.RepsMinNull.Valid {
					e.RepsMin = int(e.RepsMinNull.Int32)
				}
				if e.RepsMaxNull.Valid {
					e.RepsMax = int(e.RepsMaxNull.Int32)
				}
				if e.WeiKgNull.Valid {
					e.WeiKg = e.WeiKgNull.Float64
				}
				if e.WeiPctNull.Valid {
					e.WeiPct = e.WeiPctNull.Float64
				}
				if e.DurSecNull.Valid {
					e.DurSec = e.DurSecNull.Float64
				}
				if e.RestSecNull.Valid {
					e.RestSec = e.RestSecNull.Float64
				}
				if e.RPETargetNull.Valid {
					e.RPETarget = e.RPETargetNull.Float64
				}
				if e.NotesNull.Valid {
					e.Notes = e.NotesNull.String
				}

				cloneExercises = append(cloneExercises, e)
			}
			exRows.Close()

			for _, e := range cloneExercises {
				_, err = tx.Exec(`
					INSERT INTO program_exercises (
						program_section_id, exercise_id, sets, reps, weight, distance, pace, side, 
						reps_min, reps_max, weight_kg, weight_percentage, is_bodyweight, 
						duration_seconds, rest_seconds, rpe_target, notes, "order",
						duration, rest, rpe, tempo, hold_time,
						time, speed, cadence, distance_long, distance_short,
						one_rm, rir, heart_rate, hr_zone, watts, rpm, rounds, tracking_fields
					)
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)`,
					newSecID, e.ExID, e.Sets, e.Reps, e.Weight, e.Distance, e.Pace, e.Side,
					e.RepsMin, e.RepsMax, e.WeiKg, e.WeiPct, e.IsBW,
					e.DurSec, e.RestSec, e.RPETarget, e.Notes, e.Order,
					e.Duration, e.Rest, e.RPE, e.Tempo, e.HoldTime,
					e.Time, e.Speed, e.Cadence, e.DistLong, e.DistShort,
					e.OneRM, e.RIR, e.HR, e.HRZone, e.Watts, e.RPM, e.Rounds, e.TrackingFields,
				)
				if err != nil {
					return err
				}
			}
		}
	}

	return tx.Commit()
}

func (r *programRepository) UpdateProgramExercise(pe *models.ProgramExercise) error {
	query := `
		UPDATE program_exercises
		SET sets=$1, reps=$2, weight=$3, distance=$4, pace=$5, side=$6,
		    duration=$7, hold_time=$8, tempo=$9, rest=$10, rpe=$11,
		    time=$12, speed=$13, cadence=$14, distance_long=$15, distance_short=$16,
		    one_rm=$17, rir=$18, heart_rate=$19, hr_zone=$20, watts=$21, rpm=$22, rounds=$23,
		    duration_seconds=$24, rest_seconds=$25, rpe_target=$26, notes=$27, "order"=$28, tracking_fields=$29
		WHERE id=$30
	`
	_, err := r.db.Exec(query,
		pe.Sets, pe.Reps, pe.Weight, pe.Distance, pe.Pace, pe.Side,
		pe.Duration, pe.HoldTime, pe.Tempo, pe.Rest, pe.Rpe,
		pe.Time, pe.Speed, pe.Cadence, pe.DistanceLong, pe.DistanceShort,
		pe.OneRM, pe.RIR, pe.HeartRate, pe.HRZone, pe.Watts, pe.RPM, pe.Rounds,
		pe.DurationSeconds, pe.RestSeconds, pe.RPETarget, pe.Notes, pe.Order,
		pq.Array(pe.TrackingFields),
		pe.ID,
	)
	return err
}
