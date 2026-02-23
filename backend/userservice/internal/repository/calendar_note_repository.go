package repository

import (
	"database/sql"
	"users/internal/models"
)

type CalendarNoteRepository interface {
	CreateNote(note *models.CalendarNote) error
	GetNotesByTrainerID(trainerID int, startDate, endDate string) ([]models.CalendarNote, error)
	DeleteNote(id int) error
}

type calendarNoteRepository struct {
	db *sql.DB
}

func NewCalendarNoteRepository(db *sql.DB) CalendarNoteRepository {
	return &calendarNoteRepository{db: db}
}

func (r *calendarNoteRepository) CreateNote(note *models.CalendarNote) error {
	query := `
		INSERT INTO calendar_notes (trainer_id, date, type, title, content)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	return r.db.QueryRow(
		query,
		note.TrainerID,
		note.Date,
		note.Type,
		note.Title,
		note.Content,
	).Scan(&note.ID, &note.CreatedAt)
}

func (r *calendarNoteRepository) GetNotesByTrainerID(trainerID int, startDate, endDate string) ([]models.CalendarNote, error) {
	// startDate and endDate should be in YYYY-MM-DD format
	query := `
		SELECT id, trainer_id, date, type, title, content, created_at
		FROM calendar_notes
		WHERE trainer_id = $1 AND date >= $2 AND date <= $3
		ORDER BY date ASC
	`
	rows, err := r.db.Query(query, trainerID, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []models.CalendarNote
	for rows.Next() {
		var n models.CalendarNote
		if err := rows.Scan(&n.ID, &n.TrainerID, &n.Date, &n.Type, &n.Title, &n.Content, &n.CreatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	return notes, nil
}

func (r *calendarNoteRepository) DeleteNote(id int) error {
	query := `DELETE FROM calendar_notes WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}
