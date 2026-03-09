//go:build ignore

package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	db, err := sql.Open("postgres", "postgres://postgres:1234@localhost:5432/postgres?sslmode=disable")
	if err != nil {
		log.Fatal(err)
	}

	// GET max schedule id
	var maxSchId int
	err = db.QueryRow("SELECT max(id) FROM schedules").Scan(&maxSchId)
	if err == nil {
		fmt.Printf("Max Schedule ID: %d\n", maxSchId)
		// Get logs for it
		rows, err := db.Query("SELECT id, schedule_id, exercise_id, exercise_name FROM session_logs WHERE schedule_id = $1", maxSchId)
		if err == nil {
			for rows.Next() {
				var id, schID, exID int
				var exName string
				rows.Scan(&id, &schID, &exID, &exName)
				fmt.Printf("Log - ID: %d, SchID: %d, ExID: %d, Name: %s\n", id, schID, exID, exName)
			}
			rows.Close()
		} else {
			fmt.Printf("Error querying logs: %v\n", err)
		}
	}

	fmt.Println("--- 10 Latest Session Logs ---")
	rows, err := db.Query("SELECT id, schedule_id, exercise_name FROM session_logs ORDER BY id DESC LIMIT 10")
	if err == nil {
		for rows.Next() {
			var id, schID int
			var exName sql.NullString
			rows.Scan(&id, &schID, &exName)
			fmt.Printf("Log - ID: %d, ScheduleID: %d, Name: %s\n", id, schID, exName.String)
		}
		rows.Close()
	}
}
