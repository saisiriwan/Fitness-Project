package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"users/internal/config"
	"users/internal/models"

	_ "github.com/lib/pq"
)

// UserRepository interface ตามหลัก DIP
type UserRepository interface {
	GetAll() ([]models.User, error)
	GetByID(id int) (*models.User, error)
	Create(name, email string) (*models.User, error)
	Update(id int, name, username, email, phoneNumber string, settings string) (*models.User, error)
	Delete(id int) error

	// (เพิ่มฟังก์ชันสำหรับ Auth)
	CreateUser(user models.User, hashedPassword string) (*models.User, error)
	GetUserByEmail(email string) (*models.User, error)
	UpdateAvatar(id int, avatarURL string) error
	SearchClients(query string, trainerID int) ([]models.Client, error)
	SearchPrograms(query string, trainerID int) ([]models.Program, error)
}

type userRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
	return &userRepository{db: db}
}

func ConnectDB(cfg config.Config) (*sql.DB, error) {
	// (DSN) Data Source Name คือ String ที่ใช้ระบุข้อมูลการเชื่อมต่อกับฐานข้อมูล
	// การใช้งาน DSN จะขึ้นอยู่กับ Library หรือ Framework ที่ใช้งาน
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}
	// ตั้งค่า Connection Pool
	db.SetMaxOpenConns(25)                 // จำนวน Connection สูงสุดที่สามารถเปิดได้
	db.SetMaxIdleConns(10)                 // จำนวน Connection สูงสุดที่สามารถอยู่ใน Idle State
	db.SetConnMaxLifetime(5 * time.Minute) // อายุการใช้งานสูงสุดของ Connection

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

func CheckDBConnection(db *sql.DB) error {
	return db.Ping()
}

func (r *userRepository) GetAll() ([]models.User, error) {
	rows, err := r.db.Query("SELECT id, name, email, avatar_url, created_at, updated_at FROM users ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.AvatarURL, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *userRepository) GetByID(id int) (*models.User, error) {
	var u models.User
	// Join with trainers and clients to get phone_number
	query := `
		SELECT 
			u.id, u.name, u.username, u.email, u.role, u.avatar_url, u.settings, u.created_at, u.updated_at,
			COALESCE(t.phone_number, c.phone_number) as phone_number
		FROM users u
		LEFT JOIN trainers t ON u.id = t.user_id AND u.role = 'trainer'
		LEFT JOIN clients c ON u.id = c.user_id AND u.role = 'trainee'
		WHERE u.id = $1
	`
	err := r.db.QueryRow(query, id).
		Scan(&u.ID, &u.Name, &u.Username, &u.Email, &u.Role, &u.AvatarURL, &u.Settings, &u.CreatedAt, &u.UpdatedAt, &u.PhoneNumber)

	if err == sql.ErrNoRows {
		return nil, errors.New("user not found")
	} else if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepository) Create(name, email string) (*models.User, error) {
	var u models.User
	err := r.db.QueryRow(
		"INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at, updated_at",
		name, email,
	).Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt, &u.UpdatedAt)

	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepository) Update(id int, name, username, email, phoneNumber string, settings string) (*models.User, error) {
	// Start Transaction
	tx, err := r.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// 1. Update Users Table
	var u models.User
	var role string
	var settingsVal interface{} = settings
	if settings == "" {
		settingsVal = nil
	}

	err = tx.QueryRow(
		`UPDATE users 
		 SET name=$1, username=$2, email=$3, settings=$4, updated_at=now() 
		 WHERE id=$5 
		 RETURNING id, name, username, email, role, settings, created_at, updated_at`,
		name, username, email, settingsVal, id,
	).Scan(&u.ID, &u.Name, &u.Username, &u.Email, &role, &u.Settings, &u.CreatedAt, &u.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, errors.New("not found")
	} else if err != nil {
		return nil, err
	}
	u.Role = role // Set role for return

	// 2. Update Profile Table based on Role
	if role == "trainer" {
		// Update Trainer Profile
		_, err = tx.Exec(`
			INSERT INTO trainers (user_id, phone_number) 
			VALUES ($1, $2)
			ON CONFLICT (user_id) 
			DO UPDATE SET phone_number = $2, updated_at = now()
		`, id, phoneNumber)
	} else if role == "trainee" {
		// Update Client Profile
		_, err = tx.Exec(`
			UPDATE clients 
			SET phone_number = $2, updated_at = now() 
			WHERE user_id = $1
		`, id, phoneNumber)
	}

	if err != nil {
		return nil, err
	}

	// Commit Transaction
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// Assign phone number to return object
	u.PhoneNumber = &phoneNumber
	return &u, nil
}

func (r *userRepository) UpdateAvatar(id int, avatarURL string) error {
	res, err := r.db.Exec("UPDATE users SET avatar_url=$1, updated_at=now() WHERE id=$2", avatarURL, id)
	if err != nil {
		return err
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return errors.New("user not found")
	}
	return nil
}

func (r *userRepository) Delete(id int) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Get user role to determine cleanup strategy
	var role string
	err = tx.QueryRow(`SELECT role FROM users WHERE id=$1`, id).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows {
			return errors.New("user not found")
		}
		return err
	}

	if role == "trainer" {
		// For trainers: We need to handle clients, programs, schedules, exercises

		// 1. Clean up calendar_notes and notifications
		_, err = tx.Exec(`DELETE FROM calendar_notes WHERE trainer_id IN (SELECT id FROM trainers WHERE user_id = $1)`, id)
		if err != nil {
			return err
		}
		_, err = tx.Exec(`DELETE FROM notifications WHERE user_id = $1`, id)
		if err != nil {
			return err
		}

		// 2. Unlink clients (set trainer_id to NULL instead of deleting)
		_, err = tx.Exec(`UPDATE clients SET trainer_id = NULL WHERE trainer_id = $1`, id)
		if err != nil {
			return err
		}

		// 3. Remove client_active_programs referencing trainer's programs (FK without CASCADE)
		_, err = tx.Exec(`DELETE FROM client_active_programs WHERE program_id IN (SELECT id FROM programs WHERE trainer_id = $1)`, id)
		if err != nil {
			return err
		}

		// 4. Unlink exercise_history_summary from trainer's schedules
		_, err = tx.Exec(`UPDATE exercise_history_summary SET schedule_id = NULL WHERE schedule_id IN (SELECT id FROM schedules WHERE trainer_id = $1)`, id)
		if err != nil {
			return err
		}

		// 5. Unlink schedules (preserve history)
		_, err = tx.Exec(`UPDATE schedules SET trainer_id = NULL WHERE trainer_id = $1`, id)
		if err != nil {
			return err
		}

		// 6. Delete programs created by this trainer (cascades to days→sections→exercises via ON DELETE CASCADE)
		_, err = tx.Exec(`DELETE FROM programs WHERE trainer_id = $1`, id)
		if err != nil {
			return err
		}

		// 7. Delete trainer profile
		_, err = tx.Exec(`DELETE FROM trainers WHERE user_id = $1`, id)
		if err != nil {
			return err
		}
	}

	// For both roles: Delete the user
	res, err := tx.Exec(`DELETE FROM users WHERE id=$1`, id)
	if err != nil {
		return err
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return errors.New("user not found")
	}

	return tx.Commit()
}

// CreateUser (สำหรับ Register)
func (r *userRepository) CreateUser(user models.User, hashedPassword string) (*models.User, error) {
	var u models.User

	// 1. Transaction Start (Recommended for atomicity, but keeping it simple with direct queries for now)
	// (แก้ไข SQL ให้ INSERT ลงคอลัมน์ใหม่ด้วย)
	err := r.db.QueryRow(
		"INSERT INTO users (name, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, username, email, role, created_at, updated_at",
		user.Name, user.Username, user.Email, hashedPassword, user.Role,
	).Scan(&u.ID, &u.Name, &u.Username, &u.Email, &u.Role, &u.CreatedAt, &u.UpdatedAt)

	if err != nil {
		return nil, err
	}

	// 2. Add Auto-Link Logic: If a client exists with this email, update their user_id
	if u.Role == "trainee" {
		linkQuery := `UPDATE clients SET user_id = $1 WHERE email = $2 AND user_id IS NULL`
		_, _ = r.db.Exec(linkQuery, u.ID, u.Email)
		// We ignore errors here because it's not critical if no client is found,
		// and we don't want to fail the registration if connection hiccups on this secondary step
	}

	return &u, nil
}

// GetUserByEmail (สำหรับ Login)
func (r *userRepository) GetUserByEmail(email string) (*models.User, error) {
	var u models.User

	// (แก้ไข SQL ให้ SELECT คอลัมน์ใหม่มาด้วย)
	err := r.db.QueryRow("SELECT id, name, username, email, password_hash, role, avatar_url, settings, created_at, updated_at FROM users WHERE email=$1", email).
		Scan(&u.ID, &u.Name, &u.Username, &u.Email, &u.PasswordHash, &u.Role, &u.AvatarURL, &u.Settings, &u.CreatedAt, &u.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, errors.New("user not found")
	} else if err != nil {
		return nil, err
	}
	return &u, nil
}

// SearchClients implementation
func (r *userRepository) SearchClients(query string, trainerID int) ([]models.Client, error) {
	sqlQuery := `
		SELECT id, name, email, avatar_url, goal, status
		FROM clients
		WHERE trainer_id = $1 AND (name ILIKE '%' || $2 || '%' OR email ILIKE '%' || $2 || '%')
		ORDER BY name ASC
		LIMIT 10
	`
	rows, err := r.db.Query(sqlQuery, trainerID, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clients []models.Client
	for rows.Next() {
		var c models.Client
		if err := rows.Scan(&c.ID, &c.Name, &c.Email, &c.AvatarURL, &c.Goal, &c.Status); err != nil {
			return nil, err
		}
		clients = append(clients, c)
	}
	return clients, nil
}

// SearchPrograms implementation
func (r *userRepository) SearchPrograms(query string, trainerID int) ([]models.Program, error) {
	sqlQuery := `
		SELECT id, name, description, duration_weeks, days_per_week
		FROM programs
		WHERE trainer_id = $1 AND is_template = TRUE AND name ILIKE '%' || $2 || '%'
		ORDER BY name ASC
		LIMIT 10
	`
	rows, err := r.db.Query(sqlQuery, trainerID, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var programs []models.Program
	for rows.Next() {
		var p models.Program
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.DurationWeeks, &p.DaysPerWeek); err != nil {
			return nil, err
		}
		programs = append(programs, p)
	}
	return programs, nil
}
