package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"time"
	"users/internal/models"

	"github.com/lib/pq"
)

type SessionRepository interface {
	// Schedule
	CreateSchedule(s *models.Schedule) error
	GetSchedulesByClientID(clientID int) ([]models.Schedule, error)
	GetScheduleByID(id int) (*models.Schedule, error)
	UpdateScheduleStatus(id int, status string) error

	// Session Log
	CreateSessionLog(log *models.SessionLog) error
	CreateSessionLogSet(set *models.SessionLogSet) error

	GetLogsByScheduleID(scheduleID int) ([]models.SessionLog, error)
	GetAllLogsByTrainerID(trainerID int) ([]models.SessionLogWithDetails, error)

	// Complex Operations
	UpdateSession(id int, data *models.Schedule, logs []models.SessionLog) error
	GetSessionFullDetails(id int) (*models.Schedule, []models.SessionLog, error)
	CompleteSession(id int, data *models.Schedule, logs []models.SessionLog) error

	// New API Methods (Enriched)
	GetSessionEnriched(id int) (*models.SessionDetailResponse, error)
	GetSchedulesByClientIDFiltered(clientID int, startDate, endDate, status string) ([]models.Schedule, error)
	UpdateLogSet(logID, setNumber int, actualWeight, actualReps, actualRPE *float64, completed bool, notes string) error
	RescheduleSession(sessionID int, startTime, endTime time.Time) error
	BackfillHistory() error
	InspectHistory(clientID int) (map[string]interface{}, error)
}

type sessionRepository struct {
	db *sql.DB
}

func NewSessionRepository(db *sql.DB) SessionRepository {
	return &sessionRepository{db: db}
}

func (r *sessionRepository) RescheduleSession(sessionID int, startTime, endTime time.Time) error {
	query := `UPDATE schedules SET start_time = $1, end_time = $2 WHERE id = $3`
	_, err := r.db.Exec(query, startTime, endTime, sessionID)
	return err
}

// --- Implementation ---

func (r *sessionRepository) CreateSchedule(s *models.Schedule) error {
	query := `
		INSERT INTO schedules (title, trainer_id, client_id, start_time, end_time, status, program_id, program_day_id, session_type, location)
		VALUES ($1, $2, $3, $4, $5, 'scheduled', $6, $7, $8, $9)
		RETURNING id, created_at`

	// Default to workout if not provided
	sessionType := s.Type
	if sessionType == "" {
		sessionType = "workout"
	}

	return r.db.QueryRow(query, s.Title, s.TrainerID, s.ClientID, s.StartTime, s.EndTime, s.ProgramID, s.ProgramDayID, sessionType, s.Location).
		Scan(&s.ID, &s.CreatedAt)
}

func (r *sessionRepository) GetSchedulesByClientID(clientID int) ([]models.Schedule, error) {
	return r.GetSchedulesByClientIDFiltered(clientID, "", "", "")
}

func (r *sessionRepository) GetSchedulesByClientIDFiltered(clientID int, startDate, endDate, status string) ([]models.Schedule, error) {
	query := `SELECT s.id, s.title, s.trainer_id, u.name as trainer_name, u.username as trainer_username, t.phone_number, s.client_id, s.start_time, s.end_time, s.status, s.notes, s.summary, s.rating, s.feedback, s.session_type, s.location, s.program_id, s.program_day_id, s.created_at 
              FROM schedules s
              LEFT JOIN users u ON s.trainer_id = u.id
              LEFT JOIN trainers t ON u.id = t.user_id
              WHERE s.client_id = $1`

	args := []interface{}{clientID}
	argID := 2

	if startDate != "" {
		query += fmt.Sprintf(" AND s.start_time >= $%d", argID)
		args = append(args, startDate)
		argID++
	}
	if endDate != "" {
		query += fmt.Sprintf(" AND s.start_time <= $%d", argID)
		args = append(args, endDate)
		argID++
	}
	if status != "" {
		query += fmt.Sprintf(" AND s.status = $%d", argID)
		args = append(args, status)
		argID++
	}

	query += ` ORDER BY s.start_time ASC`

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var schedules []models.Schedule
	for rows.Next() {
		var s models.Schedule
		var tName, tUsername, tPhone, notes, summary, feedback, sessionType, location sql.NullString
		var rating, progID, progDayID sql.NullInt64

		if err := rows.Scan(&s.ID, &s.Title, &s.TrainerID, &tName, &tUsername, &tPhone, &s.ClientID, &s.StartTime, &s.EndTime, &s.Status, &notes, &summary, &rating, &feedback, &sessionType, &location, &progID, &progDayID, &s.CreatedAt); err != nil {
			return nil, err
		}
		if tName.Valid {
			s.TrainerName = tName.String
		}
		if tUsername.Valid {
			s.TrainerUsername = tUsername.String
		}
		if tPhone.Valid {
			s.TrainerPhone = tPhone.String
		}
		if notes.Valid {
			s.Notes = notes.String
		}
		if summary.Valid {
			s.Summary = summary.String
		}
		if feedback.Valid {
			s.Feedback = feedback.String
		}
		if rating.Valid {
			val := int(rating.Int64)
			s.Rating = &val
		}
		if sessionType.Valid {
			s.Type = sessionType.String
		} else {
			s.Type = "workout"
		}
		if location.Valid {
			s.Location = location.String
		}
		if progID.Valid {
			id := int(progID.Int64)
			s.ProgramID = &id
		}
		if progDayID.Valid {
			id := int(progDayID.Int64)
			s.ProgramDayID = &id
		}
		schedules = append(schedules, s)
	}
	// ---------------------------------------------------------
	// Enrichment: Fetch Logs & Sets (Batch)
	// ---------------------------------------------------------
	if len(schedules) > 0 {
		// 1. Collect Schedule IDs
		scheduleIDs := make([]int64, len(schedules))
		for i := range schedules {
			scheduleIDs[i] = int64(schedules[i].ID)
		}

		// 2. Fetch Logs
		logsQuery := `
			SELECT 
				sl.id, sl.schedule_id, sl.exercise_id, sl.exercise_name, sl.category, sl.notes, sl.status, sl."order", sl.created_at,
				e.name as ex_real_name,
				sl.section_name, sl.section_order, sl.tracking_fields
			FROM session_logs sl
			LEFT JOIN exercises e ON sl.exercise_id = e.id
			WHERE sl.schedule_id = ANY($1)
			ORDER BY sl."order" ASC
		`
		logRows, err := r.db.Query(logsQuery, pq.Array(scheduleIDs))
		if err != nil {
			return nil, err
		}
		defer logRows.Close()

		var allLogs []models.SessionLog
		var logIDs []int64

		for logRows.Next() {
			var l models.SessionLog
			var exID sql.NullInt64
			var exName, cat, notesLog, statusLog, exRealName, secName sql.NullString
			var orderLog, secOrder sql.NullInt64
			var trackFields pq.StringArray

			if err := logRows.Scan(
				&l.ID, &l.ScheduleID, &exID, &exName, &cat, &notesLog, &statusLog, &orderLog, &l.CreatedAt,
				&exRealName, &secName, &secOrder, &trackFields,
			); err != nil {
				continue
			}

			if exID.Valid {
				pid := int(exID.Int64)
				l.ExerciseID = &pid
			}
			if exName.Valid && exName.String != "" {
				l.ExerciseName = exName.String
			} else if exRealName.Valid {
				l.ExerciseName = exRealName.String
			} else {
				l.ExerciseName = "Unknown"
			}
			if cat.Valid {
				l.Category = cat.String
			}
			if notesLog.Valid {
				l.Notes = notesLog.String
			}
			if statusLog.Valid {
				l.Status = statusLog.String
			}
			if orderLog.Valid {
				l.Order = int(orderLog.Int64)
			}
			if secName.Valid {
				l.SectionName = secName.String
			}
			if secOrder.Valid {
				l.SectionOrder = int(secOrder.Int64)
			}
			l.TrackingFields = models.JSONStringArray(trackFields)

			allLogs = append(allLogs, l)
			logIDs = append(logIDs, int64(l.ID))
		}

		// Assign logs to map for set linking (requires pointer to element in slice)
		// We'll reconstruct the slice later or use index map.
		// Use simple strategy: Group logs by ScheduleID
		scheduleLogsMap := make(map[int][]models.SessionLog)

		// 3. Fetch Sets if we have logs
		if len(logIDs) > 0 {
			setsQuery := `
				SELECT id, session_log_id, set_number,
					planned_weight_kg, planned_reps, planned_rpe,
					planned_duration_seconds, planned_distance, rest_duration_seconds,
					actual_weight_kg, actual_reps, actual_rpe,
					planned_metadata::text, actual_metadata::text,
					completed
				FROM session_log_sets 
				WHERE session_log_id = ANY($1) 
				ORDER BY set_number ASC`

			setRows, err := r.db.Query(setsQuery, pq.Array(logIDs))
			if err == nil {
				defer setRows.Close()

				// Group Sets by LogID
				setsMap := make(map[int][]models.SessionLogSet)

				for setRows.Next() {
					var st models.SessionLogSet
					var pRpe, aRpe sql.NullFloat64
					var pDur, pRest sql.NullInt64
					var pDist sql.NullFloat64
					var aw sql.NullFloat64
					var ar sql.NullInt64
					var metaJSON, actualMetaJSON sql.NullString

					if err := setRows.Scan(
						&st.ID, &st.SessionLogID, &st.SetNumber,
						&st.PlannedWeightKg, &st.PlannedReps, &pRpe,
						&pDur, &pDist, &pRest,
						&aw, &ar, &aRpe,
						&metaJSON, &actualMetaJSON,
						&st.Completed,
					); err != nil {
						continue
					}

					if aw.Valid {
						st.ActualWeightKg = aw.Float64
					}
					if ar.Valid {
						st.ActualReps = int(ar.Int64)
					}
					if pRpe.Valid {
						st.PlannedRPE = pRpe.Float64
					}
					if aRpe.Valid {
						st.RPE = aRpe.Float64
					}
					if pDur.Valid {
						st.PlannedDurationSeconds = int(pDur.Int64)
					}
					if pDist.Valid {
						st.PlannedDistance = pDist.Float64
					}
					if pRest.Valid {
						st.RestDurationSeconds = int(pRest.Int64)
					}

					if metaJSON.Valid && metaJSON.String != "" {
						json.Unmarshal([]byte(metaJSON.String), &st.PlannedMetadata)
					}
					if st.PlannedMetadata == nil {
						st.PlannedMetadata = make(map[string]interface{})
					}

					if actualMetaJSON.Valid && actualMetaJSON.String != "" {
						json.Unmarshal([]byte(actualMetaJSON.String), &st.ActualMetadata)
					}
					if st.ActualMetadata == nil {
						st.ActualMetadata = make(map[string]interface{})
					}

					setsMap[st.SessionLogID] = append(setsMap[st.SessionLogID], st)
				}

				// Attach Sets to Logs
				for i := range allLogs {
					if sets, ok := setsMap[allLogs[i].ID]; ok {
						allLogs[i].Sets = sets
					}
				}
			}
		}

		// 4. Attach Logs to Schedules
		for _, l := range allLogs {
			scheduleLogsMap[l.ScheduleID] = append(scheduleLogsMap[l.ScheduleID], l)
		}

		for i := range schedules {
			if logs, ok := scheduleLogsMap[schedules[i].ID]; ok {
				schedules[i].Logs = logs
			} else {
				schedules[i].Logs = []models.SessionLog{}
			}
		}
	}

	return schedules, nil
}

func (r *sessionRepository) UpdateScheduleStatus(id int, status string) error {
	query := `UPDATE schedules SET status=$1 WHERE id=$2`
	_, err := r.db.Exec(query, status, id)
	return err
}
func (r *sessionRepository) GetScheduleByID(id int) (*models.Schedule, error) {
	query := `SELECT id, title, trainer_id, client_id, start_time, end_time, status, session_type, location, created_at 
              FROM schedules WHERE id = $1`
	var s models.Schedule
	var sessionType, location sql.NullString
	err := r.db.QueryRow(query, id).Scan(&s.ID, &s.Title, &s.TrainerID, &s.ClientID, &s.StartTime, &s.EndTime, &s.Status, &sessionType, &location, &s.CreatedAt)
	if err != nil {
		return nil, err
	}
	if sessionType.Valid {
		s.Type = sessionType.String
	} else {
		s.Type = "workout"
	}
	if location.Valid {
		s.Location = location.String
	}
	return &s, nil
}

// --- Logs ---

func (r *sessionRepository) CreateSessionLog(log *models.SessionLog) error {
	query := `
		INSERT INTO session_logs (
			schedule_id, exercise_id, exercise_name, category, notes, 
			status, "order", section_name, section_order, tracking_fields
		) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
		RETURNING id, created_at`

	return r.db.QueryRow(
		query,
		log.ScheduleID, log.ExerciseID, log.ExerciseName, log.Category, log.Notes,
		log.Status, log.Order, log.SectionName, log.SectionOrder, pq.Array(log.TrackingFields),
	).Scan(&log.ID, &log.CreatedAt)
}

func (r *sessionRepository) CreateSessionLogSet(set *models.SessionLogSet) error {
	// Marshal metadata maps to JSON
	plannedMetaJSON, _ := json.Marshal(set.PlannedMetadata)
	actualMetaJSON, _ := json.Marshal(set.ActualMetadata)

	query := `
		INSERT INTO session_log_sets (
			session_log_id, set_number, 
			planned_weight_kg, planned_reps, planned_rpe, 
			planned_duration_seconds, planned_distance, rest_duration_seconds,
			actual_weight_kg, actual_reps, actual_rpe,
			planned_metadata, actual_metadata
		) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
		RETURNING id`

	return r.db.QueryRow(
		query,
		set.SessionLogID, set.SetNumber,
		set.PlannedWeightKg, set.PlannedReps, set.PlannedRPE,
		set.PlannedDurationSeconds, set.PlannedDistance, set.RestDurationSeconds,
		set.ActualWeightKg, set.ActualReps, set.RPE,
		plannedMetaJSON, actualMetaJSON,
	).Scan(&set.ID)
}

func (r *sessionRepository) GetLogsByScheduleID(scheduleID int) ([]models.SessionLog, error) {
	query := `SELECT id, schedule_id, exercise_id, notes, created_at FROM session_logs WHERE schedule_id = $1`
	rows, err := r.db.Query(query, scheduleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.SessionLog
	for rows.Next() {
		var l models.SessionLog
		rows.Scan(&l.ID, &l.ScheduleID, &l.ExerciseID, &l.Notes, &l.CreatedAt)
		logs = append(logs, l)
	}
	return logs, nil
}

func (r *sessionRepository) GetAllLogsByTrainerID(trainerID int) ([]models.SessionLogWithDetails, error) {
	query := `
		SELECT 
			sl.id, 
			sl.schedule_id, 
			COALESCE(sl.exercise_name, e.name, 'Unknown Exercise') as exercise_name, 
			c.name as client_name, 
			COALESCE(sl.notes, '') as notes, 
			sl.created_at,
			COALESCE(s.start_time, s.created_at) as date
		FROM session_logs sl
		JOIN schedules s ON sl.schedule_id = s.id
		LEFT JOIN exercises e ON sl.exercise_id = e.id
		JOIN clients c ON s.client_id = c.id
		WHERE s.trainer_id = $1
		ORDER BY sl.created_at DESC
	`
	rows, err := r.db.Query(query, trainerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.SessionLogWithDetails
	var logIDs []int

	for rows.Next() {
		var l models.SessionLogWithDetails
		if err := rows.Scan(&l.ID, &l.ScheduleID, &l.ExerciseName, &l.ClientName, &l.Notes, &l.CreatedAt, &l.Date); err != nil {
			return nil, err
		}
		l.Sets = []models.SessionLogSet{} // Initialize empty sets
		logs = append(logs, l)
		logIDs = append(logIDs, l.ID)
	}

	// Fetch Sets if logs exist
	if len(logIDs) > 0 {
		inClause := ""
		for i, id := range logIDs {
			if i > 0 {
				inClause += ","
			}
			inClause += fmt.Sprintf("%d", id)
		}

		setsQuery := fmt.Sprintf(`
    SELECT id, session_log_id, set_number, 
           planned_weight_kg, planned_reps, planned_rpe,
           actual_weight_kg, actual_reps, actual_rpe,
           actual_metadata::text,
           completed
    FROM session_log_sets
    WHERE session_log_id IN (%s)
    ORDER BY session_log_id, set_number ASC
`, inClause)

		setRows, err := r.db.Query(setsQuery)
		if err == nil {
			defer setRows.Close()

			// Map: LogID -> []Sets
			setsMap := make(map[int][]models.SessionLogSet)

			for setRows.Next() {
				var s models.SessionLogSet
				var pRpe, aRpe sql.NullFloat64
				var aw sql.NullFloat64
				var ar sql.NullInt64
				var actualMetaJSON sql.NullString

				if err := setRows.Scan(&s.ID, &s.SessionLogID, &s.SetNumber,
					&s.PlannedWeightKg, &s.PlannedReps, &pRpe,
					&aw, &ar, &aRpe,
					&actualMetaJSON,
					&s.Completed); err != nil {
					continue
				}

				if aw.Valid {
					s.ActualWeightKg = aw.Float64
				}
				if ar.Valid {
					s.ActualReps = int(ar.Int64)
				}

				if actualMetaJSON.Valid && actualMetaJSON.String != "" {
					json.Unmarshal([]byte(actualMetaJSON.String), &s.ActualMetadata)
				}
				if s.ActualMetadata == nil {
					s.ActualMetadata = make(map[string]interface{})
				}

				if pRpe.Valid {
					s.PlannedRPE = pRpe.Float64
				}
				if aRpe.Valid {
					s.RPE = aRpe.Float64
				}

				setsMap[s.SessionLogID] = append(setsMap[s.SessionLogID], s)
			}

			// Assign sets back to logs
			for i := range logs {
				if sets, ok := setsMap[logs[i].ID]; ok {
					logs[i].Sets = sets
				}
			}
		}
	}

	return logs, nil
}

// Custom Transaction for Updating Session (Status + Notes + Re-creating Logs)
func (r *sessionRepository) UpdateSession(id int, data *models.Schedule, logs []models.SessionLog) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Update Schedule Info (Notes, Status, Summary, Rating, Feedback)
	_, err = tx.Exec(`UPDATE schedules SET notes=$1, status=$2, summary=$3, rating=$4, feedback=$5, updated_at=NOW() WHERE id=$6`,
		data.Notes, data.Status, data.Summary, data.Rating, data.Feedback, id)
	if err != nil {
		return err
	}

	// 2. Delete old exercise_history_summary for this schedule (FK without CASCADE)
	_, err = tx.Exec(`DELETE FROM exercise_history_summary WHERE schedule_id=$1`, id)
	if err != nil {
		return err
	}

	// 3. Delete Old Logs (Cascade will delete sets via ON DELETE CASCADE)
	_, err = tx.Exec(`DELETE FROM session_logs WHERE schedule_id=$1`, id)
	if err != nil {
		return err
	}

	// 3. Insert New Logs & Sets
	for _, log := range logs {
		var logID int
		err = tx.QueryRow(`
			INSERT INTO session_logs (schedule_id, exercise_id, exercise_name, category, notes, status, "order", section_name, section_order, tracking_fields) 
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
			id, log.ExerciseID, log.ExerciseName, log.Category, log.Notes, log.Status, log.Order,
			log.SectionName, log.SectionOrder, pq.Array(log.TrackingFields),
		).Scan(&logID)
		if err != nil {
			return err
		}

		// Insert Sets with all planned fields
		for _, set := range log.Sets {
			// DEBUG: Log incoming actual metadata
			f, _ := os.OpenFile("debug_update_log.txt", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if f != nil {
				metaBytes, _ := json.Marshal(set.ActualMetadata)
				fmt.Fprintf(f, "LogID: %d, Set: %d, ActualMetadata: %s\n", logID, set.SetNumber, string(metaBytes))
				f.Close()
			}

			// Marshal metadata
			// Ensure maps are initialized if nil
			if set.PlannedMetadata == nil {
				set.PlannedMetadata = make(map[string]interface{})
			}
			if set.ActualMetadata == nil {
				set.ActualMetadata = make(map[string]interface{})
			}

			metaJSON, _ := json.Marshal(set.PlannedMetadata)
			actualMetaJSON, _ := json.Marshal(set.ActualMetadata)

			_, err = tx.Exec(`
				INSERT INTO session_log_sets (
					session_log_id, set_number,
					planned_weight_kg, planned_reps, planned_rpe,
					planned_duration_seconds, planned_distance, rest_duration_seconds,
					actual_weight_kg, actual_reps, actual_rpe,
					planned_metadata, actual_metadata,
					completed
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
				logID, set.SetNumber,
				set.PlannedWeightKg, set.PlannedReps, set.PlannedRPE,
				set.PlannedDurationSeconds, set.PlannedDistance, set.RestDurationSeconds,
				set.ActualWeightKg, set.ActualReps, set.RPE,
				metaJSON, actualMetaJSON,
				set.Completed,
			)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (r *sessionRepository) CompleteSession(id int, data *models.Schedule, logs []models.SessionLog) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Calculate Stats (Total Volume)
	totalVolume := 0.0
	completedExercises := 0
	totalExercises := len(logs)

	for _, log := range logs {
		exerciseVolume := 0.0
		isCompleted := false
		if len(log.Sets) > 0 {
			for _, set := range log.Sets {
				if set.Completed {
					isCompleted = true
					exerciseVolume += set.ActualWeightKg * float64(set.ActualReps)
				}
			}
		}
		if isCompleted {
			completedExercises++
		}
		totalVolume += exerciseVolume
	}

	summaryStats := fmt.Sprintf("Volume: %.1f kg | Completed: %d/%d exercises", totalVolume, completedExercises, totalExercises)
	if data.Summary != "" {
		data.Summary += " | " + summaryStats
	} else {
		data.Summary = summaryStats
	}

	// 2. Update Schedule Info
	_, err = tx.Exec(`UPDATE schedules SET notes=$1, status=$2, summary=$3, rating=$4, feedback=$5, updated_at=NOW() WHERE id=$6`,
		data.Notes, "completed", data.Summary, data.Rating, data.Feedback, id)
	if err != nil {
		return err
	}

	// 3. Delete old exercise_history_summary entries for this schedule (FK without CASCADE)
	_, err = tx.Exec(`DELETE FROM exercise_history_summary WHERE schedule_id=$1`, id)
	if err != nil {
		return err
	}

	// 4. Delete Old Logs (session_log_sets cascade via ON DELETE CASCADE)
	_, err = tx.Exec(`DELETE FROM session_logs WHERE schedule_id=$1`, id)
	if err != nil {
		return err
	}

	// 5. Insert New Logs & Sets (Final Data)
	for _, log := range logs {
		var logID int
		err = tx.QueryRow(`
			INSERT INTO session_logs (schedule_id, exercise_id, exercise_name, category, notes, status, "order", section_name, section_order, tracking_fields) 
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
			id, log.ExerciseID, log.ExerciseName, log.Category, log.Notes, "completed", log.Order,
			log.SectionName, log.SectionOrder, pq.Array(log.TrackingFields),
		).Scan(&logID)
		if err != nil {
			return err
		}

		for _, set := range log.Sets {
			// DEBUG: Log incoming actual metadata
			f, _ := os.OpenFile("debug_complete_log.txt", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
			if f != nil {
				metaBytes, _ := json.Marshal(set.ActualMetadata)
				fmt.Fprintf(f, "LogID: %d, Set: %d, ActualMetadata: %s\n", logID, set.SetNumber, string(metaBytes))
				f.Close()
			}

			// Marshal metadata
			// Ensure maps are initialized if nil
			if set.PlannedMetadata == nil {
				set.PlannedMetadata = make(map[string]interface{})
			}
			if set.ActualMetadata == nil {
				set.ActualMetadata = make(map[string]interface{})
			}

			metaJSON, _ := json.Marshal(set.PlannedMetadata)
			actualMetaJSON, _ := json.Marshal(set.ActualMetadata)

			_, err = tx.Exec(`
				INSERT INTO session_log_sets (
					session_log_id, set_number,
					planned_weight_kg, planned_reps, planned_rpe,
					planned_duration_seconds, planned_distance, rest_duration_seconds,
					actual_weight_kg, actual_reps, actual_rpe,
					planned_metadata, actual_metadata,
					completed
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
				logID, set.SetNumber,
				set.PlannedWeightKg, set.PlannedReps, set.PlannedRPE,
				set.PlannedDurationSeconds, set.PlannedDistance, set.RestDurationSeconds,
				set.ActualWeightKg, set.ActualReps, set.RPE,
				metaJSON, actualMetaJSON,
				set.Completed,
			)
			if err != nil {
				return err
			}
		}
	}

	// 6. Trigger Updates (History, Volume, Streak)
	if _, execErr := tx.Exec(`SELECT update_exercise_history_summary($1)`, id); execErr != nil {
		fmt.Printf("Error updating history summary: %v\n", execErr)
	}

	if _, execErr := tx.Exec(`SELECT calculate_workout_volume($1)`, id); execErr != nil {
		fmt.Printf("Error calculating volume: %v\n", execErr)
	}

	if _, execErr := tx.Exec(`SELECT update_client_streak((SELECT client_id FROM schedules WHERE id = $1), (SELECT DATE(start_time) FROM schedules WHERE id = $1))`, id); execErr != nil {
		fmt.Printf("Error updating streak: %v\n", execErr)
	}

	return tx.Commit()
}

func (r *sessionRepository) GetSessionFullDetails(id int) (*models.Schedule, []models.SessionLog, error) {
	// 1. Get Schedule
	query := `SELECT id, title, trainer_id, client_id, start_time, end_time, status, notes, summary, rating, feedback, program_id, program_day_id, session_type, location, created_at 
              FROM schedules WHERE id = $1`

	var s models.Schedule
	var notes, summary, feedback, sessionType, location sql.NullString
	var rating sql.NullInt64
	var pid, pdid sql.NullInt64

	err := r.db.QueryRow(query, id).Scan(&s.ID, &s.Title, &s.TrainerID, &s.ClientID, &s.StartTime, &s.EndTime, &s.Status, &notes, &summary, &rating, &feedback, &pid, &pdid, &sessionType, &location, &s.CreatedAt)
	if err != nil {
		return nil, nil, err
	}
	if notes.Valid {
		s.Notes = notes.String
	}
	if summary.Valid {
		s.Summary = summary.String
	}
	if feedback.Valid {
		s.Feedback = feedback.String
	}
	if rating.Valid {
		i := int(rating.Int64)
		s.Rating = &i
	}
	if pid.Valid {
		i := int(pid.Int64)
		s.ProgramID = &i
	}
	if pdid.Valid {
		i := int(pdid.Int64)
		s.ProgramDayID = &i
	}
	if sessionType.Valid {
		s.Type = sessionType.String
	} else {
		s.Type = "workout"
	}
	if location.Valid {
		s.Location = location.String
	}

	// 2. Get Logs
	logsQuery := `
		SELECT 
			sl.id, sl.schedule_id, sl.exercise_id, sl.exercise_name, sl.category, sl.notes, sl.status, sl."order", sl.created_at,
			e.name as ex_real_name,
			sl.section_name, sl.section_order, sl.tracking_fields
		FROM session_logs sl
		LEFT JOIN exercises e ON sl.exercise_id = e.id
		WHERE sl.schedule_id=$1 
		ORDER BY sl."order" ASC
	`
	rows, err := r.db.Query(logsQuery, id)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var logs []models.SessionLog
	for rows.Next() {
		var l models.SessionLog
		var exID sql.NullInt64
		var exName, cat, notesLog, statusLog, exRealName sql.NullString
		var orderLog sql.NullInt64
		var secName sql.NullString
		var secOrder sql.NullInt64
		var trackFields pq.StringArray

		if err := rows.Scan(
			&l.ID, &l.ScheduleID, &exID, &exName, &cat, &notesLog, &statusLog, &orderLog, &l.CreatedAt, &exRealName,
			&secName, &secOrder, &trackFields,
		); err != nil {
			return nil, nil, err
		}
		if exID.Valid {
			i := int(exID.Int64)
			l.ExerciseID = &i
		}

		if exName.Valid && exName.String != "" {
			l.ExerciseName = exName.String
		} else if exRealName.Valid && exRealName.String != "" {
			l.ExerciseName = exRealName.String
		} else {
			l.ExerciseName = "Unknown Exercise"
		}

		if cat.Valid {
			l.Category = cat.String
		}
		if notesLog.Valid {
			l.Notes = notesLog.String
		}
		if statusLog.Valid {
			l.Status = statusLog.String
		}
		if orderLog.Valid {
			l.Order = int(orderLog.Int64)
		}

		// New Fields
		if secName.Valid {
			l.SectionName = secName.String
		}
		if secOrder.Valid {
			l.SectionOrder = int(secOrder.Int64)
		}
		l.TrackingFields = models.JSONStringArray(trackFields)

		logs = append(logs, l)
	}

	// 2.1 [NEW] If no logs found but we have a Program Day, fetch planned exercises
	if len(logs) == 0 && s.ProgramDayID != nil && *s.ProgramDayID > 0 {
		virtualLogs, err := r.GetProgramDayExercises(*s.ProgramDayID)
		if err == nil && len(virtualLogs) > 0 {
			logs = virtualLogs
			for i := range logs {
				logs[i].ScheduleID = id
			}
		}
	}

	// 3. Get Sets — now including all planned fields
	for i, log := range logs {
		if log.ID == 0 {
			continue
		}

		setsQuery := `SELECT id, session_log_id, set_number,
			planned_weight_kg, planned_reps, planned_rpe,
			planned_duration_seconds, planned_distance, rest_duration_seconds,
			actual_weight_kg, actual_reps, actual_rpe,
			planned_metadata::text, actual_metadata::text,
			completed
			FROM session_log_sets WHERE session_log_id=$1 ORDER BY set_number ASC`
		setRows, err := r.db.Query(setsQuery, log.ID)
		if err != nil {
			continue
		}

		var sets []models.SessionLogSet
		for setRows.Next() {
			var st models.SessionLogSet
			var pRpe, aRpe sql.NullFloat64
			var pDur, pRest sql.NullInt64
			var pDist sql.NullFloat64
			var metaJSON sql.NullString
			var actualMetaJSON sql.NullString
			var aw sql.NullFloat64
			var ar sql.NullInt64

			if err := setRows.Scan(
				&st.ID, &st.SessionLogID, &st.SetNumber,
				&st.PlannedWeightKg, &st.PlannedReps, &pRpe,
				&pDur, &pDist, &pRest,
				&aw, &ar, &aRpe,
				&metaJSON, &actualMetaJSON,
				&st.Completed,
			); err != nil {
				fmt.Printf("DEBUG SET %d: Scan Error: %v\n", st.SetNumber, err)
				continue
			}

			if aw.Valid {
				st.ActualWeightKg = aw.Float64
			}
			if ar.Valid {
				st.ActualReps = int(ar.Int64)
			}

			if metaJSON.Valid && metaJSON.String != "" {
				// DEBUG: Print raw JSON string
				fmt.Printf("DEBUG SET %d: Raw PlannedMetadata: %s\n", st.SetNumber, metaJSON.String)
				if err := json.Unmarshal([]byte(metaJSON.String), &st.PlannedMetadata); err != nil {
					fmt.Printf("DEBUG SET %d: Unmarshal Error: %v\n", st.SetNumber, err)
				}
			} else {
				fmt.Printf("DEBUG SET %d: PlannedMetadata is NULL/Empty\n", st.SetNumber)
			}
			if st.PlannedMetadata == nil {
				st.PlannedMetadata = make(map[string]interface{})
			}
			if actualMetaJSON.Valid && actualMetaJSON.String != "" {
				json.Unmarshal([]byte(actualMetaJSON.String), &st.ActualMetadata)
			}
			if st.ActualMetadata == nil {
				st.ActualMetadata = make(map[string]interface{})
			}

			if pRpe.Valid {
				st.PlannedRPE = pRpe.Float64
			}
			if pDur.Valid {
				st.PlannedDurationSeconds = int(pDur.Int64)
			}
			if pDist.Valid {
				st.PlannedDistance = pDist.Float64
			}
			if pRest.Valid {
				st.RestDurationSeconds = int(pRest.Int64)
			}
			if aRpe.Valid {
				st.RPE = aRpe.Float64
			}

			sets = append(sets, st)
		}
		setRows.Close()
		logs[i].Sets = sets
	}

	return &s, logs, nil
}

// GetSessionEnriched implements the 3-step fetching strategy to return nested JSON structure
func (r *sessionRepository) GetSessionEnriched(id int) (*models.SessionDetailResponse, error) {
	// 1. Fetch Schedule with enriched fields
	query := `
		SELECT 
			s.id, s.client_id, s.trainer_id, u.name as trainer_name, u.username as trainer_username, t.avatar_url as trainer_avatar,
			s.title, s.start_time, s.end_time, s.status, s.notes, s.summary, s.program_id, s.program_day_id, s.session_type, s.location, s.created_at, s.updated_at
		FROM schedules s
		LEFT JOIN users u ON s.trainer_id = u.id
		LEFT JOIN trainers t ON s.trainer_id = t.user_id
		WHERE s.id = $1
	`
	var resp models.SessionDetailResponse
	var title, notes, summary sql.NullString
	var sid, cid, tid int
	var pid, pdid sql.NullInt64
	var tName, tUsername, tAvatar, sessionType, location sql.NullString

	err := r.db.QueryRow(query, id).Scan(
		&sid, &cid, &tid, &tName, &tUsername, &tAvatar,
		&title, &resp.StartTime, &resp.EndTime, &resp.Status, &notes, &summary, &pid, &pdid, &sessionType, &location, &resp.CreatedAt, &resp.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Map fields
	resp.ID = fmt.Sprintf("%d", sid)
	resp.ClientID = fmt.Sprintf("%d", cid)
	resp.TrainerID = fmt.Sprintf("%d", tid)
	if tName.Valid {
		resp.TrainerName = tName.String
	}
	if tUsername.Valid {
		resp.TrainerUsername = tUsername.String
	}
	if tAvatar.Valid {
		resp.TrainerAvatar = tAvatar.String
	}
	if title.Valid {
		resp.Title = title.String
	}
	if notes.Valid {
		resp.Notes = notes.String
	}
	if sessionType.Valid {
		resp.SessionType = sessionType.String
	} else {
		resp.SessionType = "workout"
	}
	if location.Valid {
		resp.Location = models.Location{Name: location.String}
	}

	// Calculate Duration
	resp.Duration = int(resp.EndTime.Sub(resp.StartTime).Minutes())
	resp.Date = resp.StartTime.Format("2006-01-02")

	// 2. Fetch Logs (Exercises)
	logsQuery := `
		SELECT 
			sl.id, sl.exercise_id, sl.exercise_name, sl.category, sl.notes, sl."order",
			e.name as ex_real_name, sl.status,
			sl.section_name, sl.section_order, sl.tracking_fields
		FROM session_logs sl
		LEFT JOIN exercises e ON sl.exercise_id = e.id
		WHERE sl.schedule_id = $1
		ORDER BY sl."order" ASC
	`
	rows, err := r.db.Query(logsQuery, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var exercises []models.SessionExerciseResponse
	var logIDs []int

	for rows.Next() {
		var l models.SessionExerciseResponse
		var lid int
		var exID sql.NullInt64
		var exName, cat, note, exRealName, status sql.NullString
		var secName sql.NullString
		var secOrder sql.NullInt64
		var trackFields pq.StringArray

		rows.Scan(&lid, &exID, &exName, &cat, &note, &l.Order, &exRealName, &status, &secName, &secOrder, &trackFields)

		l.ID = fmt.Sprintf("%d", lid)
		l.SessionID = resp.ID
		if exID.Valid {
			l.ExerciseID = fmt.Sprintf("%d", exID.Int64)
		}

		if exName.Valid && exName.String != "" {
			l.Name = exName.String
		} else if exRealName.Valid {
			l.Name = exRealName.String
		} else {
			l.Name = "Unknown Exercise"
		}

		if cat.Valid {
			l.Category = cat.String
		}
		if note.Valid {
			l.Notes = note.String
		}

		// Map New Fields
		if secName.Valid {
			l.SectionName = secName.String
		}
		if secOrder.Valid {
			l.SectionOrder = int(secOrder.Int64)
		}
		l.TrackingFields = []string(trackFields)

		l.Sets = []models.SessionSetResponse{}

		exercises = append(exercises, l)
		logIDs = append(logIDs, lid)
	}

	// 2.1 [NEW] If empty logs & has Program Day, use virtual logs
	if len(exercises) == 0 && pdid.Valid && pid.Int64 > 0 {
		virtualLogs, err := r.GetProgramDayExercises(int(pdid.Int64))
		if err == nil && len(virtualLogs) > 0 {
			for i, vLog := range virtualLogs {
				ex := models.SessionExerciseResponse{
					ID:             fmt.Sprintf("virtual_%d_%d", vLog.ScheduleID, i),
					SessionID:      resp.ID,
					Order:          vLog.Order,
					Name:           vLog.ExerciseName,
					Category:       vLog.Category,
					Notes:          vLog.Notes,
					SectionName:    vLog.SectionName,
					SectionOrder:   vLog.SectionOrder,
					TrackingFields: []string(vLog.TrackingFields),
					Sets:           []models.SessionSetResponse{},
				}
				if vLog.ExerciseID != nil {
					ex.ExerciseID = fmt.Sprintf("%d", *vLog.ExerciseID)
				}

				// Map Sets with all planned fields
				for _, vSet := range vLog.Sets {
					s := models.SessionSetResponse{
						SetNumber: vSet.SetNumber,
						Completed: false,
					}
					if vSet.PlannedWeightKg > 0 {
						val := vSet.PlannedWeightKg
						s.TargetWeight = &val
					}
					if vSet.PlannedReps > 0 {
						val := vSet.PlannedReps
						s.TargetReps = &val
					}
					if vSet.PlannedRPE > 0 {
						val := vSet.PlannedRPE
						s.TargetRPE = &val
					}
					if vSet.PlannedDurationSeconds > 0 {
						val := vSet.PlannedDurationSeconds
						s.TargetDuration = &val
					}
					if vSet.PlannedDistance > 0 {
						val := vSet.PlannedDistance
						s.TargetDistance = &val
					}
					if vSet.RestDurationSeconds > 0 {
						val := vSet.RestDurationSeconds
						s.RestDuration = &val
					}
					// Pass planned metadata (Time, Speed, HR, etc.)
					if len(vSet.PlannedMetadata) > 0 {
						s.TargetMetadata = vSet.PlannedMetadata
					}
					ex.Sets = append(ex.Sets, s)
				}
				exercises = append(exercises, ex)
			}
		}
	}

	// 3. Fetch Sets — now including all planned fields
	if len(logIDs) > 0 {
		inClause := ""
		for i, id := range logIDs {
			if i > 0 {
				inClause += ","
			}
			inClause += fmt.Sprintf("%d", id)
		}

		setsQuery := fmt.Sprintf(`
			SELECT session_log_id, set_number, 
				planned_weight_kg, planned_reps, planned_rpe,
				planned_duration_seconds, planned_distance, rest_duration_seconds,
				actual_weight_kg, actual_reps, actual_rpe,
				planned_metadata::text, actual_metadata::text,
				completed
			FROM session_log_sets
			WHERE session_log_id IN (%s)
		ORDER BY session_log_id, set_number ASC
		`, inClause)

		setRows, err := r.db.Query(setsQuery)
		if err == nil {
			defer setRows.Close()

			setsMap := make(map[int][]models.SessionSetResponse)

			for setRows.Next() {
				var s models.SessionSetResponse
				var logID int
				var pw, aw sql.NullFloat64
				var pr, ar sql.NullInt64
				var prpe, arpe sql.NullFloat64
				var pDur, pRest sql.NullInt64
				var pDist sql.NullFloat64
				var metaJSON sql.NullString
				var actualMetaJSON sql.NullString

				setRows.Scan(&logID, &s.SetNumber,
					&pw, &pr, &prpe,
					&pDur, &pDist, &pRest,
					&aw, &ar, &arpe,
					&metaJSON, &actualMetaJSON,
					&s.Completed,
				)

				if metaJSON.Valid && metaJSON.String != "" {
					json.Unmarshal([]byte(metaJSON.String), &s.TargetMetadata)
				}
				if s.TargetMetadata == nil {
					s.TargetMetadata = make(map[string]interface{})
				}
				if actualMetaJSON.Valid && actualMetaJSON.String != "" {
					json.Unmarshal([]byte(actualMetaJSON.String), &s.ActualMetadata)
				}
				if s.ActualMetadata == nil {
					s.ActualMetadata = make(map[string]interface{})
				}

				if pw.Valid {
					v := pw.Float64
					s.TargetWeight = &v
				}
				if pr.Valid {
					v := int(pr.Int64)
					s.TargetReps = &v
				}
				if prpe.Valid {
					v := prpe.Float64
					s.TargetRPE = &v
				}

				if pDist.Valid && pDist.Float64 > 0 {
					v := pDist.Float64
					s.TargetDistance = &v
				}
				if pDur.Valid {
					v := int(pDur.Int64)
					s.TargetDuration = &v
				}

				if pRest.Valid {
					v := int(pRest.Int64)
					s.RestDuration = &v
				}

				if aw.Valid {
					v := aw.Float64
					s.ActualWeight = &v
				}
				if ar.Valid {
					v := int(ar.Int64)
					s.ActualReps = &v
				}
				if arpe.Valid {
					v := arpe.Float64
					s.ActualRPE = &v
				}

				setsMap[logID] = append(setsMap[logID], s)
			}

			// Assign sets back to exercises
			for i := range exercises {
				lid, _ := strconv.Atoi(exercises[i].ID)
				if sets, ok := setsMap[lid]; ok {
					exercises[i].Sets = sets
				}
			}
		}
	}

	resp.Exercises = exercises

	// 4. Calculate Summary
	completedSets := 0
	totalSets := 0
	totalVol := 0.0
	completedEx := 0

	for _, ex := range exercises {
		exComplete := false
		for _, s := range ex.Sets {
			totalSets++
			if s.Completed {
				completedSets++
				exComplete = true
				if s.ActualWeight != nil && s.ActualReps != nil {
					totalVol += (*s.ActualWeight) * float64(*s.ActualReps)
				}
			}
		}
		if exComplete {
			completedEx++
		}
	}

	resp.Summary = &models.SessionSummaryResponse{
		TotalExercises:     len(exercises),
		CompletedExercises: completedEx,
		TotalSets:          totalSets,
		CompletedSets:      completedSets,
		TotalVolume:        totalVol,
	}

	return &resp, nil
}

func (r *sessionRepository) UpdateLogSet(logID, setNumber int, actualWeight, actualReps, actualRPE *float64, completed bool, notes string) error {
	// 1. Update the Set
	query := `
		UPDATE session_log_sets 
		SET actual_weight_kg = $1, actual_reps = $2, actual_rpe = $3, completed = $4
		WHERE session_log_id = $5 AND set_number = $6
	`
	_, err := r.db.Exec(query, actualWeight, actualReps, actualRPE, completed, logID, setNumber)
	if err != nil {
		return err
	}

	// 2. Optional: Update Parent Log Notes if provided
	if notes != "" {
		_, err = r.db.Exec(`UPDATE session_logs SET notes = $1 WHERE id = $2`, notes, logID)
		if err != nil {
			return err
		}
	}

	return nil
}

// Helper: Fetch exercises from Program Day to populate virtual logs
// Now reads from JSONB arrays for per-set planned values
func (r *sessionRepository) GetProgramDayExercises(programDayID int) ([]models.SessionLog, error) {
	query := `
		SELECT 
			pe.id,
			pe.exercise_id,
			e.name as exercise_name,
			e.category,
			ps.name as section_name,
			pe."order",
			pe.sets,
			pe.reps_min,
			pe.reps_max,
			pe.weight_kg,
			pe.weight_percentage,
			pe.is_bodyweight,
			pe.duration_seconds,
			pe.rest_seconds,
			pe.rpe_target,
			pe.notes,
			pe.reps,
			pe.weight,
			pe.rpe,
			pe.duration,
			pe.distance,
			pe.rest,
			pe.speed, pe.cadence, pe.watts, pe.heart_rate, pe.hr_zone,
			pe.distance_long, pe.distance_short, pe.one_rm, pe.rir, pe.rpm, pe.rounds,
			pe.time, pe.hold_time, pe.tempo, pe.side, pe.pace,
			pe.tracking_fields
		FROM program_exercises pe
		JOIN program_sections ps ON pe.program_section_id = ps.id
		JOIN exercises e ON pe.exercise_id = e.id
		WHERE ps.program_day_id = $1
		ORDER BY ps."order" ASC, pe."order" ASC
	`

	rows, err := r.db.Query(query, programDayID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.SessionLog

	for rows.Next() {
		var l models.SessionLog
		var peID, sets int
		var exID sql.NullInt64

		var repsMin, repsMax sql.NullInt64
		var weightKg sql.NullFloat64
		var weightPct sql.NullFloat64
		var isBW sql.NullBool
		var durationSec, restSec sql.NullFloat64
		var rpeTarget sql.NullFloat64
		var exerciseName, category, sectionName sql.NullString
		var notesRaw sql.NullString
		var order int
		var trackFields pq.StringArray

		// JSONB array columns (raw bytes)
		var repsJSON, weightJSON, rpeJSON, durationJSON, distanceJSON, restJSON []byte
		var speedJSON, cadenceJSON, wattsJSON, hrJSON, hrZoneJSON []byte
		var distLongJSON, distShortJSON, oneRmJSON, rirJSON, rpmJSON, roundsJSON []byte
		var timeJSON, holdTimeJSON, tempoJSON, sideJSON, paceJSON []byte

		err := rows.Scan(
			&peID, &exID, &exerciseName, &category, &sectionName,
			&order, &sets,
			&repsMin, &repsMax,
			&weightKg, &weightPct, &isBW,
			&durationSec, &restSec, &rpeTarget,
			&notesRaw,
			&repsJSON, &weightJSON, &rpeJSON, &durationJSON, &distanceJSON, &restJSON,
			&speedJSON, &cadenceJSON, &wattsJSON, &hrJSON, &hrZoneJSON,
			&distLongJSON, &distShortJSON, &oneRmJSON, &rirJSON, &rpmJSON, &roundsJSON,
			&timeJSON, &holdTimeJSON, &tempoJSON, &sideJSON, &paceJSON,
			&trackFields,
		)
		if err != nil {
			return nil, err
		}

		// Populate SessionLog
		l.ID = 0 // Virtual log
		l.ScheduleID = 0
		if exID.Valid {
			id := int(exID.Int64)
			l.ExerciseID = &id
		}
		if exerciseName.Valid {
			l.ExerciseName = exerciseName.String
		}
		if category.Valid {
			l.Category = category.String
		}
		if notesRaw.Valid {
			l.Notes = notesRaw.String
		}
		l.Status = "pending"
		l.Order = order
		l.TrackingFields = models.JSONStringArray(trackFields)

		// Parse JSONB arrays
		var repsArr []interface{}
		var weightArr []float64
		var rpeArr []float64
		var durationArr []interface{}
		var distanceArr []interface{}
		var restArr []float64

		// Advanced numeric arrays
		var speedArr, cadenceArr, wattsArr, hrArr, hrZoneArr []float64
		var distLongArr, distShortArr, oneRmArr, rirArr, rpmArr, roundsArr []float64

		// Advanced string arrays
		var timeArr, holdTimeArr, tempoArr, sideArr, paceArr []string

		// Unmarshal Helpers
		unmarshalFloat := func(b []byte, v *[]float64) {
			if b != nil {
				json.Unmarshal(b, v)
			}
		}
		unmarshalInterface := func(b []byte, v *[]interface{}) {
			if b != nil {
				json.Unmarshal(b, v)
			}
		}
		unmarshalString := func(b []byte, v *[]string) {
			if b != nil {
				json.Unmarshal(b, v)
			}
		}

		unmarshalInterface(repsJSON, &repsArr)
		unmarshalFloat(weightJSON, &weightArr)
		unmarshalFloat(rpeJSON, &rpeArr)
		unmarshalInterface(durationJSON, &durationArr)
		unmarshalInterface(distanceJSON, &distanceArr)
		unmarshalFloat(restJSON, &restArr)

		unmarshalFloat(speedJSON, &speedArr)
		unmarshalFloat(cadenceJSON, &cadenceArr)
		unmarshalFloat(wattsJSON, &wattsArr)
		unmarshalFloat(hrJSON, &hrArr)
		unmarshalFloat(hrZoneJSON, &hrZoneArr)
		unmarshalFloat(distLongJSON, &distLongArr)
		unmarshalFloat(distShortJSON, &distShortArr)
		unmarshalFloat(oneRmJSON, &oneRmArr)
		unmarshalFloat(rirJSON, &rirArr)
		unmarshalFloat(rpmJSON, &rpmArr)
		unmarshalFloat(roundsJSON, &roundsArr)

		unmarshalString(timeJSON, &timeArr)
		unmarshalString(holdTimeJSON, &holdTimeArr)
		unmarshalString(tempoJSON, &tempoArr)
		unmarshalString(sideJSON, &sideArr)
		unmarshalString(paceJSON, &paceArr)

		// Legacy fallback values
		legacyReps := 0
		if repsMin.Valid {
			legacyReps = int(repsMin.Int64)
		}
		if legacyReps == 0 && repsMax.Valid {
			legacyReps = int(repsMax.Int64)
		}
		legacyWeight := 0.0
		if weightKg.Valid {
			legacyWeight = weightKg.Float64
		}
		legacyRPE := 0.0
		if rpeTarget.Valid {
			legacyRPE = rpeTarget.Float64
		}
		legacyDuration := 0
		if durationSec.Valid {
			legacyDuration = int(durationSec.Float64)
		}
		legacyRest := 0
		if restSec.Valid {
			legacyRest = int(restSec.Float64)
		}

		// Create virtual sets with per-set values from JSONB arrays
		l.Sets = make([]models.SessionLogSet, sets)
		for i := 0; i < sets; i++ {
			set := models.SessionLogSet{
				ID:           0,
				SessionLogID: 0,
				SetNumber:    i + 1,
				Completed:    false,
			}

			// Reps from JSONB array
			pReps := legacyReps
			if i < len(repsArr) {
				switch v := repsArr[i].(type) {
				case float64:
					pReps = int(v)
				case string:
					if parsed, err := strconv.Atoi(v); err == nil {
						pReps = parsed
					}
				}
			}
			set.PlannedReps = pReps

			// Weight from JSONB array
			pWeight := legacyWeight
			if i < len(weightArr) && weightArr[i] > 0 {
				pWeight = weightArr[i]
			}
			set.PlannedWeightKg = pWeight

			// RPE from JSONB array
			pRPE := legacyRPE
			if i < len(rpeArr) && rpeArr[i] > 0 {
				pRPE = rpeArr[i]
			}
			set.PlannedRPE = pRPE

			// Duration from JSONB array
			pDuration := legacyDuration
			if i < len(durationArr) {
				switch v := durationArr[i].(type) {
				case float64:
					pDuration = int(v)
				case string:
					if parsed, err := strconv.Atoi(v); err == nil {
						pDuration = parsed
					}
				}
			}
			set.PlannedDurationSeconds = pDuration

			// Distance from JSONB array
			pDistance := 0.0
			if i < len(distanceArr) {
				switch v := distanceArr[i].(type) {
				case float64:
					pDistance = v
				case string:
					if parsed, err := strconv.ParseFloat(v, 64); err == nil {
						pDistance = parsed
					}
				}
			}
			set.PlannedDistance = pDistance

			// Rest from JSONB array
			pRest := legacyRest
			if i < len(restArr) && restArr[i] > 0 {
				pRest = int(restArr[i])
			}
			set.RestDurationSeconds = pRest

			// ✅ Populate PlannedMetadata with advanced fields
			metadata := make(map[string]interface{})
			addFloat := func(key string, arr []float64) {
				if i < len(arr) {
					metadata[key] = arr[i]
				}
			}
			addString := func(key string, arr []string) {
				if i < len(arr) && arr[i] != "" {
					metadata[key] = arr[i]
				}
			}

			addFloat("speed", speedArr)
			addFloat("cadence", cadenceArr)
			addFloat("watts", wattsArr)
			addFloat("heart_rate", hrArr)
			addFloat("hr_zone", hrZoneArr)
			addFloat("distance_long", distLongArr)
			addFloat("distance_short", distShortArr)
			addFloat("one_rm", oneRmArr)
			addFloat("rir", rirArr)
			addFloat("rpm", rpmArr)
			addFloat("rounds", roundsArr)

			addString("time", timeArr)
			addString("hold_time", holdTimeArr)
			addString("tempo", tempoArr)
			addString("side", sideArr)
			addString("pace", paceArr)

			set.PlannedMetadata = metadata

			l.Sets[i] = set
		}

		logs = append(logs, l)
	}

	return logs, nil
}

// BackfillHistory triggers recalculation for all completed sessions
func (r *sessionRepository) BackfillHistory() error {
	// 1. Get all completed schedule IDs
	rows, err := r.db.Query(`SELECT id, client_id FROM schedules WHERE status = 'completed'`)
	if err != nil {
		return err
	}
	defer rows.Close()

	// Store data in memory to avoid holding rows connection while executing updates
	type scheduleData struct {
		ID       int
		ClientID int
	}
	var schedules []scheduleData

	for rows.Next() {
		var s scheduleData
		if err := rows.Scan(&s.ID, &s.ClientID); err != nil {
			continue
		}
		schedules = append(schedules, s)
	}

	if len(schedules) == 0 {
		return nil
	}

	// 2. Process each schedule
	for i, s := range schedules {
		fmt.Printf("[Backfill] Processing Schedule ID: %d (%d/%d)\n", s.ID, i+1, len(schedules))

		// Update History
		_, err = r.db.Exec(`SELECT update_exercise_history_summary($1)`, s.ID)
		if err != nil {
			fmt.Printf("Error updating history for %d: %v\n", s.ID, err)
		}

		// Calculate Volume
		_, err = r.db.Exec(`SELECT calculate_workout_volume($1)`, s.ID)
		if err != nil {
			fmt.Printf("Error calculating volume for %d: %v\n", s.ID, err)
		}

		// Update Streak
		_, err = r.db.Exec(`SELECT update_client_streak($1)`, s.ClientID)
		if err != nil {
			fmt.Printf("Error updating streak for client %d: %v\n", s.ClientID, err)
		}
	}

	return nil
}

// InspectHistory returns debugging data for a client
func (r *sessionRepository) InspectHistory(clientID int) (map[string]interface{}, error) {
	result := make(map[string]interface{})

	// 1. Check if client exists
	var exists bool
	_ = r.db.QueryRow("SELECT EXISTS(SELECT 1 FROM clients WHERE id=$1)", clientID).Scan(&exists)
	result["client_exists"] = exists

	// 2. Count Completed Schedules
	var completedSchedules int
	_ = r.db.QueryRow("SELECT COUNT(*) FROM schedules WHERE client_id=$1 AND status='completed'", clientID).Scan(&completedSchedules)
	result["completed_schedules_count"] = completedSchedules

	// 3. Count History Entries
	var historyCount int
	_ = r.db.QueryRow("SELECT COUNT(*) FROM exercise_history_summary WHERE client_id=$1", clientID).Scan(&historyCount)
	result["history_summary_count"] = historyCount

	// 4. Sample History Entries
	// Use COALESCE to handle potentially NULL values if any schema mismatch exists
	rows, err := r.db.Query(`
		SELECT exercise_name, date, 
		       COALESCE(total_reps, 0), COALESCE(total_sets, 0), COALESCE(max_weight_kg, 0) 
		FROM exercise_history_summary 
		WHERE client_id=$1 
		ORDER BY date DESC 
		LIMIT 5`, clientID)

	if err == nil {
		defer rows.Close()
		var samples []map[string]interface{}
		for rows.Next() {
			var name string
			var date string
			var reps, sets int
			var weight float64
			if err := rows.Scan(&name, &date, &reps, &sets, &weight); err == nil {
				samples = append(samples, map[string]interface{}{
					"name":   name,
					"date":   date,
					"reps":   reps,
					"sets":   sets,
					"weight": weight,
				})
			}
		}
		result["history_samples"] = samples
	} else {
		result["history_error"] = err.Error()
	}

	// 5. Check Raw Session Sets (Source of Truth) for one completed session
	// Find a completed schedule id
	var schedID int
	err = r.db.QueryRow("SELECT id FROM schedules WHERE client_id=$1 AND status='completed' LIMIT 1", clientID).Scan(&schedID)
	if err == nil {
		var setCompletedCount int
		_ = r.db.QueryRow("SELECT COUNT(*) FROM session_log_sets sls JOIN session_logs sl ON sls.session_log_id = sl.id WHERE sl.schedule_id = $1 AND sls.completed = true", schedID).Scan(&setCompletedCount)
		result["sample_schedule_id"] = schedID
		result["sample_schedule_completed_sets"] = setCompletedCount
	}

	return result, nil
}
