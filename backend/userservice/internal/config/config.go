package config

import (
	"bufio"
	"log"
	"os"
	"strings"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	APIToken   string
	APIPORT    string
}

// loadEnvFile reads a .env file and sets environment variables
func loadEnvFile() {
	file, err := os.Open(".env")
	if err != nil {
		log.Println("No .env file found, using default values")
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Split on first '='
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(strings.TrimRight(parts[0], "\r"))
		value := strings.TrimSpace(strings.TrimRight(parts[1], "\r"))

		// Only set if not already set (env vars take precedence)
		if os.Getenv(key) == "" {
			os.Setenv(key, value)
		}
	}
	log.Println(".env file loaded successfully")
}

func LoadConfig() Config {
	// Load .env file first
	loadEnvFile()

	return Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres123"),
		DBName:     getEnv("DB_NAME", "postgres"),
		APIToken:   getEnv("API_TOKEN", "fjwfji3399"),
		APIPORT:    getEnv("API_PORT", "8080"),
	}
}

func getEnv(key, fallback string) string {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	return v
}
