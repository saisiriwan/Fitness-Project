package service

import (
	"errors"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"users/internal/models"
	"users/internal/repository"
)

// Structs สำหรับรับข้อมูลจาก Handler (Data Transfer Objects)
type RegisterRequest struct {
	FirstName string `json:"firstName" binding:"required"`
	LastName  string `json:"lastName" binding:"required"`
	Email     string `json:"email" binding:"required"`
	Password  string `json:"password" binding:"required"`
	Role      string `json:"role"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password"`
}

type UserService interface {
	GetAllUsers() ([]models.User, error)
	GetUserByID(id int) (*models.User, error)
	CreateUser(name, email string) (*models.User, error)
	UpdateUser(id int, name, username, email, phoneNumber string, settings string) (*models.User, error)
	UpdateAvatar(id int, avatarURL string) (*models.User, error) // New method
	DeleteUser(id int) error

	// Auth Methods
	RegisterUser(req RegisterRequest) (*models.User, error)
	LoginUser(req LoginRequest) (string, error)
	GetUserByEmail(email string) (*models.User, error)
}

type userService struct {
	repo      repository.UserRepository
	jwtSecret []byte
}

// NewUserService สร้าง Service ใหม่ พร้อมรับ JWT Secret
// (ในโค้ดจริงควรอ่าน JWT_SECRET จาก Config แต่นี่เรา Hardcode ไว้ก่อนเพื่อความง่าย)
func NewUserService(repo repository.UserRepository) UserService {
	// อ่านค่า JWT_SECRET จาก Environment Variable
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "your_very_secret_key_should_be_long"
	}

	return &userService{
		repo:      repo,
		jwtSecret: []byte(secret), // ใช้ค่าที่ได้จาก .env
	}
}

func (s *userService) GetAllUsers() ([]models.User, error) {
	return s.repo.GetAll()
}

func (s *userService) GetUserByID(id int) (*models.User, error) {
	return s.repo.GetByID(id)
}

func (s *userService) CreateUser(name, email string) (*models.User, error) {
	if strings.TrimSpace(name) == "" || strings.TrimSpace(email) == "" {
		return nil, errors.New("name and email are required")
	}
	user, err := s.repo.Create(name, email)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (s *userService) UpdateUser(id int, name, username, email, phoneNumber string, settings string) (*models.User, error) {
	if strings.TrimSpace(name) == "" || strings.TrimSpace(email) == "" {
		return nil, errors.New("name and email are required")
	}
	return s.repo.Update(id, name, username, email, phoneNumber, settings)
}

func (s *userService) UpdateAvatar(id int, avatarURL string) (*models.User, error) {
	err := s.repo.UpdateAvatar(id, avatarURL)
	if err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

func (s *userService) DeleteUser(id int) error {
	return s.repo.Delete(id)
}

// ---------------------------------------------------------
// Auth Methods (ใหม่)
// ---------------------------------------------------------

func (s *userService) RegisterUser(req RegisterRequest) (*models.User, error) {
	// 1. Hash รหัสผ่าน
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	if err != nil {
		return nil, errors.New("failed to hash password")
	}

	// 2. เตรียมข้อมูล User
	// Use Email prefix as Username
	parts := strings.Split(req.Email, "@")
	username := req.Email
	if len(parts) > 0 {
		username = parts[0]
	}

	// 3. บันทึกลง DB
	role := "trainee" // Default fallback
	if req.Role == "trainer" || req.Role == "trainee" {
		role = req.Role
	}

	newUser := models.User{
		Name:     req.FirstName + " " + req.LastName,
		Username: username,
		Email:    req.Email,
		Role:     role,
	}

	// 3. บันทึกลง DB
	createdUser, err := s.repo.CreateUser(newUser, string(hashedPassword))
	if err != nil {
		// เช็ค Error ว่า Email ซ้ำหรือไม่ (ขึ้นอยู่กับ Driver ของ DB)
		// เพื่อความง่าย เราจะส่ง error กลับไปเลย
		return nil, errors.New("failed to create user (email might already exist)")
	}

	return createdUser, nil
}

func (s *userService) GetUserByEmail(email string) (*models.User, error) {
	return s.repo.GetUserByEmail(email)
}

func (s *userService) LoginUser(req LoginRequest) (string, error) {
	// 1. ดึง User จาก DB
	user, err := s.repo.GetUserByEmail(req.Email)
	if err != nil {
		return "", errors.New("invalid email or password")
	}

	// 2. เทียบรหัสผ่าน
	// กรณีที่ 1: Login ปกติ (มี Password ส่งมา) -> ต้องเช็ค bcrypt
	if req.Password != "" {
		err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
		if err != nil {
			return "", errors.New("invalid email or password")
		}
	}
	// กรณีที่ 2: Google Login (Password เป็น "") -> ข้ามการเช็ค (ถือว่า Google ยืนยันมาแล้ว)

	// 3. สร้าง Access Token (JWT)
	accessClaims := jwt.MapClaims{
		"user_id": user.ID,
		"name":    user.Name,
		"role":    user.Role,
		"exp":     time.Now().Add(time.Hour * 24).Unix(), // หมดอายุใน 24 ชั่วโมง
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)

	// ใช้ s.jwtSecret ที่อ่านมาจาก .env ใน NewUserService
	accessString, err := accessToken.SignedString(s.jwtSecret)
	if err != nil {
		return "", errors.New("failed to create access token")
	}

	return accessString, nil
}
