package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// ตัวแปรสำหรับเก็บ Secret Key
var jwtSecret []byte

// getJWTSecret อ่าน JWT_SECRET แบบ lazy (ครั้งแรกที่ใช้)
func getJWTSecret() []byte {
	if jwtSecret == nil {
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			log.Println("WARNING: JWT_SECRET is not set in middleware. Using default (unsafe) secret.")
			jwtSecret = []byte("your_very_secret_key_should_be_long")
		} else {
			jwtSecret = []byte(secret)
		}
	}
	return jwtSecret
}

func JWTCookieAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. ดึง Token จาก Cookie ที่ชื่อ "access_token"
		tokenString, err := c.Cookie("access_token")
		if err != nil {
			// ถ้าไม่มี Cookie, ลองเช็ค Header (เผื่อไว้)
			authHeader := c.GetHeader("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid token"})
				return
			}
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}

		if tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Missing token"})
			return
		}

		// 2. ตรวจสอบและ Parse Token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return getJWTSecret(), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		// 3. ถ้า Token ถูกต้อง, ดึงข้อมูล (Claims) ออกมา
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			// เช็ควันหมดอายุ
			if exp, ok := claims["exp"].(float64); ok {
				if int64(exp) < time.Now().Unix() {
					c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token expired"})
					return
				}
			}
			// (สำคัญ) ส่งต่อข้อมูลผู้ใช้ไปยัง Handler ตัวถัดไป
			c.Set("user_id", claims["user_id"])
			c.Set("role", claims["role"])
		} else {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}

		// 4. ไปยัง Handler ตัวถัดไป
		c.Next()
	}
}
