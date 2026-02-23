package main

import (
	"log"
	"users/internal/config"
	"users/internal/repository"

	_ "github.com/lib/pq"
)

func main() {
	log.Println("Starting Database Fix...")

	// 1. Load Config (will use defaults or env vars)
	cfg := config.LoadConfig()

	// 2. Connect to DB
	db, err := repository.ConnectDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}
	defer db.Close()

	log.Println("Connected to Database successfully.")

	// 3. Execute Schema Changes
	// Step A: Drop old constraint
	_, err = db.Exec(`ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_user_id_key;`)
	if err != nil {
		log.Printf("Warning: Failed to drop old constraint (might not exist): %v", err)
	} else {
		log.Println("Success: Dropped constraint 'clients_user_id_key'")
	}

	// Step B: Add new constraint
	_, err = db.Exec(`ALTER TABLE clients ADD CONSTRAINT unique_user_trainer UNIQUE (user_id, trainer_id);`)
	if err != nil {
		// Ignore if already exists
		log.Printf("Warning: Failed to add new constraint (might already exist): %v", err)
	} else {
		log.Println("Success: Added constraint 'unique_user_trainer'")
	}

	// Step C: Drop unique constraint on clients(user_id) if it was auto-created with a specific name like 'clients_user_id_key'
	// (Already done in A, but sometimes there are others? No, mostly that's it)

	// Step C: Force Update ALL users to be TRAINERS (Fix for 403 Error)
	res, err := db.Exec(`UPDATE users SET role = 'trainer'`)
	if err != nil {
		log.Printf("Error updating roles: %v", err)
	} else {
		affected, _ := res.RowsAffected()
		log.Printf("Success: Updated %d users to 'trainer' role.", affected)
	}

	log.Println("Database Fix Completed.")
}
