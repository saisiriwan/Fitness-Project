package repository

import (
	"database/sql"
	"users/internal/models"
)

type DashboardRepository interface {
	GetDashboardStats(trainerID int) (*models.DashboardStats, error)
}

type dashboardRepository struct {
	db *sql.DB
}

func NewDashboardRepository(db *sql.DB) DashboardRepository {
	return &dashboardRepository{db: db}
}

func (r *dashboardRepository) GetDashboardStats(trainerID int) (*models.DashboardStats, error) {
	stats := &models.DashboardStats{}

	// 1. Basic Counts
	// Total Clients
	err := r.db.QueryRow(`SELECT COUNT(*) FROM clients WHERE trainer_id = $1`, trainerID).Scan(&stats.TotalClients)
	if err != nil {
		return nil, err
	}

	// Active Programs
	err = r.db.QueryRow(`SELECT COUNT(*) FROM programs WHERE trainer_id = $1`, trainerID).Scan(&stats.ActivePrograms)
	if err != nil {
		return nil, err
	}

	// Upcoming Sessions (Scheduled & Future)
	err = r.db.QueryRow(`
		SELECT COUNT(*) FROM schedules 
		WHERE trainer_id = $1 AND status = 'scheduled' AND start_time > NOW()
	`, trainerID).Scan(&stats.UpcomingSession)
	if err != nil {
		return nil, err
	}

	// Monthly Sessions (Completed this month)
	err = r.db.QueryRow(`
		SELECT COUNT(*) FROM schedules 
		WHERE trainer_id = $1 
		AND status = 'completed'
		AND EXTRACT(MONTH FROM start_time) = EXTRACT(MONTH FROM CURRENT_DATE)
		AND EXTRACT(YEAR FROM start_time) = EXTRACT(YEAR FROM CURRENT_DATE)
	`, trainerID).Scan(&stats.MonthlySessions)
	if err != nil {
		return nil, err
	}

	// Total Monthly Sessions (All statuses this month EXCEPT cancelled)
	err = r.db.QueryRow(`
		SELECT COUNT(*) FROM schedules 
		WHERE trainer_id = $1 
		AND status != 'cancelled'
		AND EXTRACT(MONTH FROM start_time) = EXTRACT(MONTH FROM CURRENT_DATE)
		AND EXTRACT(YEAR FROM start_time) = EXTRACT(YEAR FROM CURRENT_DATE)
	`, trainerID).Scan(&stats.TotalMonthlySessions)
	if err != nil {
		return nil, err
	}

	// Total Sessions All-Time (excl. cancelled)
	err = r.db.QueryRow(`
		SELECT COUNT(*) FROM schedules 
		WHERE trainer_id = $1 AND status != 'cancelled'
	`, trainerID).Scan(&stats.CompletedSessions)
	if err != nil {
		return nil, err
	}

	// 2. Client Goals Distribution
	rows, err := r.db.Query(`
		SELECT COALESCE(goal, 'Unspecified') as goal_name, COUNT(*) 
		FROM clients 
		WHERE trainer_id = $1 
		GROUP BY goal
	`, trainerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var g models.ClientGoalStats
		if err := rows.Scan(&g.Goal, &g.Count); err != nil {
			continue
		}
		stats.ClientGoals = append(stats.ClientGoals, g)
	}

	// 3. Last 7 Days History (using generate_series for gaps)
	// PostgreSQL specific query
	historyQuery := `
		WITH dates AS (
			SELECT generate_series(
				CURRENT_DATE - INTERVAL '6 days', 
				CURRENT_DATE, 
				'1 day'::interval
			)::date AS day
		)
		SELECT 
			TO_CHAR(d.day, 'YYYY-MM-DD') as date_label,
			COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed,
			COUNT(CASE WHEN s.status = 'scheduled' THEN 1 END) as scheduled
		FROM dates d
		LEFT JOIN schedules s ON DATE(s.start_time) = d.day AND s.trainer_id = $1
		GROUP BY d.day
		ORDER BY d.day ASC
	`
	hRows, err := r.db.Query(historyQuery, trainerID)
	if err != nil {
		return nil, err
	}
	defer hRows.Close()

	for hRows.Next() {
		var s models.DailySessionStats
		if err := hRows.Scan(&s.Date, &s.CompletedCount, &s.ScheduledCount); err != nil {
			continue
		}
		stats.SessionHistory = append(stats.SessionHistory, s)
	}

	return stats, nil
}
