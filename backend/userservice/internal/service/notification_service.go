package service

import (
	"context"
	"users/internal/models"
	"users/internal/repository"
)

type NotificationService interface {
	GetNotifications(ctx context.Context, userID int) ([]models.Notification, error)
	MarkAsRead(ctx context.Context, id int) error
	CreateNotification(ctx context.Context, userID int, title, message, notifType, link string) error
	GetUnreadCount(ctx context.Context, userID int) (int, error)
}

type notificationService struct {
	repo repository.NotificationRepository
}

func NewNotificationService(repo repository.NotificationRepository) NotificationService {
	return &notificationService{repo: repo}
}

func (s *notificationService) GetNotifications(ctx context.Context, userID int) ([]models.Notification, error) {
	return s.repo.GetByUserID(ctx, userID)
}

func (s *notificationService) MarkAsRead(ctx context.Context, id int) error {
	return s.repo.MarkAsRead(ctx, id)
}

func (s *notificationService) CreateNotification(ctx context.Context, userID int, title, message, notifType, link string) error {
	notification := &models.Notification{
		UserID:  userID,
		Title:   title,
		Message: message,
		Type:    notifType,
		Link:    link,
		IsRead:  false,
	}
	return s.repo.Create(ctx, notification)
}

func (s *notificationService) GetUnreadCount(ctx context.Context, userID int) (int, error) {
	return s.repo.CountUnread(ctx, userID)
}
