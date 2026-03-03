package models

// DashboardStats สถิติรวมสำหรับหน้า Dashboard
type DashboardStats struct {
	TotalClients         int `json:"total_clients"`
	ActivePrograms       int `json:"active_programs"`
	UpcomingSession      int `json:"upcoming_sessions"`
	MonthlySessions      int `json:"monthly_sessions"`
	TotalMonthlySessions int `json:"total_monthly_sessions"`
	CompletedSessions    int `json:"completed_sessions"`

	// Complex Stats
	SessionHistory []DailySessionStats `json:"session_history"`
	ClientGoals    []ClientGoalStats   `json:"client_goals"`
}

type DailySessionStats struct {
	Date           string `json:"date"`
	CompletedCount int    `json:"completed_count"`
	ScheduledCount int    `json:"scheduled_count"`
}

type ClientGoalStats struct {
	Goal  string `json:"goal"`
	Count int    `json:"count"`
}
