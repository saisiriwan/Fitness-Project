package repository

import (
	"context"
	"database/sql"
	"users/internal/models"
)

type NotificationRepository interface {
	GetByUserID(ctx context.Context, userID int) ([]models.Notification, error)
	MarkAsRead(ctx context.Context, id int) error
	Create(ctx context.Context, n *models.Notification) error
	CountUnread(ctx context.Context, userID int) (int, error)
}

type notificationRepository struct {
	db *sql.DB
}

func NewNotificationRepository(db *sql.DB) NotificationRepository {
	return &notificationRepository{db: db}
}

func (r *notificationRepository) GetByUserID(ctx context.Context, userID int) ([]models.Notification, error) {
	query := `
		SELECT id, user_id, type, title, message, is_read, link, created_at
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 50
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifications []models.Notification
	for rows.Next() {
		var n models.Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Message, &n.IsRead, &n.Link, &n.CreatedAt); err != nil {
			return nil, err
		}
		notifications = append(notifications, n)
	}
	return notifications, nil
}

func (r *notificationRepository) MarkAsRead(ctx context.Context, id int) error {
	query := `UPDATE notifications SET is_read = TRUE WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *notificationRepository) Create(ctx context.Context, n *models.Notification) error {
	query := `
		INSERT INTO notifications (user_id, type, title, message, is_read, link)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`
	return r.db.QueryRowContext(ctx, query, n.UserID, n.Type, n.Title, n.Message, n.IsRead, n.Link).
		Scan(&n.ID, &n.CreatedAt)
}

func (r *notificationRepository) CountUnread(ctx context.Context, userID int) (int, error) {
	query := `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`
	var count int
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&count)
	return count, err
}
