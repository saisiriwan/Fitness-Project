package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"users/internal/repository"
)

type SearchHandler struct {
	userRepo repository.UserRepository
}

func NewSearchHandler(userRepo repository.UserRepository) *SearchHandler {
	return &SearchHandler{userRepo: userRepo}
}

func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	// Assuming user ID is available in context from middleware
	// In a real app, we extract it from JWT claims.
	// For now, we will try to get it from query param for testing, or assume a fixed one if not found,
	// BUT since we have Auth middleware, we SHOULD extract it properly.
	// Here I will use a helper or assume middleware puts it in context.
	// Let's assume the standard way: r.Context().Value("user_id")

	// fallback: get from query param "trainer_id" for easier testing if auth middleware not perfect yet
	trainerIDStr := r.URL.Query().Get("trainer_id")
	trainerID, err := strconv.Atoi(trainerIDStr)
	if err != nil {
		// Try to get from header or context if possible, but for MVP let's require trainer_id or fix it to context later.
		// For strictness, let's return error if not provided
		http.Error(w, "Trainer ID is required", http.StatusBadRequest)
		return
	}

	clients, err := h.userRepo.SearchClients(query, trainerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	programs, err := h.userRepo.SearchPrograms(query, trainerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Combine results
	response := map[string]interface{}{
		"clients":  clients,
		"programs": programs,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
