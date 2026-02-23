package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetUserID safely retrieves the user_id from the Gin context, handling float64, int, and string types.
func GetUserID(c *gin.Context) (int, bool) {
	val, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}

	switch v := val.(type) {
	case float64:
		return int(v), true
	case int:
		return v, true
	case string:
		id, err := strconv.Atoi(v)
		if err == nil {
			return id, true
		}
	}
	return 0, false
}
