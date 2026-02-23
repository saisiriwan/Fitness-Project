package main

import (
	"database/sql"
	"fmt"
	"log"
	"users/internal/config"
	"users/internal/repository"

	_ "github.com/lib/pq"
)

func main() {
	log.Println("--- Database Diagnostic Tool ---")

	cfg := config.LoadConfig()
	db, err := repository.ConnectDB(cfg)
	if err != nil {
		log.Fatalf("Fatal: Could not connect to DB: %v", err)
	}
	defer db.Close()

	checkConstraint(db, "clients_user_id_key")
	checkConstraint(db, "unique_user_trainer")

	log.Println("--- End Diagnostic ---")
}

func checkConstraint(db *sql.DB, constraintName string) {
	query := `
		SELECT count(*)
		FROM information_schema.table_constraints
		WHERE constraint_name = $1 AND table_name = 'clients';
	`
	var count int
	err := db.QueryRow(query, constraintName).Scan(&count)
	if err != nil {
		log.Printf("Error checking constraint '%s': %v", constraintName, err)
		return
	}

	if count > 0 {
		fmt.Printf("[X] Constraint FOUND: %s\n", constraintName)
	} else {
		fmt.Printf("[ ] Constraint NOT FOUND: %s\n", constraintName)
	}
}
