package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv" // (เพิ่ม import นี้ สำหรับ GetUserByID)
	"strings"
	"time"

	"users/internal/models"
	"users/internal/repository" // Add import
	"users/internal/service"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// (ตัวแปร global สำหรับเก็บ Config)
var (
	googleOauthConfig *oauth2.Config
	// (ย้าย JWT_SECRET มาไว้ที่นี่ และอ่านจาก .env)
	JWT_SECRET        []byte
	configInitialized bool
)

// initConfig จะถูกเรียกครั้งแรกที่ต้องใช้ (lazy init)
func ensureConfigInit() {
	if configInitialized {
		return
	}
	configInitialized = true

	// 1. ตั้งค่า Google OAuth
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	redirectURL := os.Getenv("GOOGLE_REDIRECT_URL")

	if clientID == "" || clientSecret == "" {
		log.Println("WARNING: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set. Google OAuth will not work.")
	}

	googleOauthConfig = &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
		Endpoint:     google.Endpoint,
	}

	// 2. ตั้งค่า JWT Secret (จาก .env)
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Println("WARNING: JWT_SECRET is not set. Using default (unsafe) secret.")
		JWT_SECRET = []byte("your_very_secret_key_should_be_long")
	} else {
		JWT_SECRET = []byte(secret)
	}
}

type UserHandler struct {
	userService service.UserService
	clientRepo  repository.ClientRepository // Inject ClientRepository
}

func NewUserHandler(us service.UserService, cr repository.ClientRepository) *UserHandler {
	return &UserHandler{
		userService: us,
		clientRepo:  cr,
	}
}

// ----------------------------------------------------
// (แก้ไข) ฟังก์ชัน CRUD เดิม (เติม Logic ให้สมบูรณ์)
// ----------------------------------------------------

func (h *UserHandler) GetAllUsers(c *gin.Context) {
	users, err := h.userService.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

func (h *UserHandler) GetUserByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	user, err := h.userService.GetUserByID(id)
	if err != nil {
		if err.Error() == "user not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
		}
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	var req struct {
		Name  string `json:"name" binding:"required"`
		Email string `json:"email" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// (หมายเหตุ: ฟังก์ชัน CreateUser เก่านี้ ไม่มีการ Hash Password)
	// (เราควรใช้ RegisterUser แทน)
	user, err := h.userService.CreateUser(req.Name, req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, user)
}

func (h *UserHandler) UpdateUser(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req struct {
		Name        string                 `json:"name" binding:"required"`
		Username    string                 `json:"username"`
		Email       string                 `json:"email" binding:"required"`
		PhoneNumber string                 `json:"phone_number"`
		Settings    map[string]interface{} `json:"settings"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// Prepare settings string
	var settingsStr string
	if req.Settings != nil {
		bytes, err := json.Marshal(req.Settings)
		if err == nil {
			settingsStr = string(bytes)
		} else {
			// Log error but proceed? Or fail? Let's proceed with empty settings or log warning.
			log.Printf("Failed to marshal settings: %v", err)
			// Decide: if marshalling fails, we might want to return error.
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process settings"})
			return
		}
	}

	user, err := h.userService.UpdateUser(id, req.Name, req.Username, req.Email, req.PhoneNumber, settingsStr)
	if err != nil {
		if err.Error() == "user not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) UploadAvatar(c *gin.Context) {
	// 1. Get User ID from Context (set by JWT middleware)
	userID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// 2. Retrieve file from form-data
	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No avatar file provided"})
		return
	}

	// 3. Validate file (optional: check extension, size)
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only jpg, jpeg, and png profiles are allowed"})
		return
	}

	// 4. Create directory if not exists
	uploadDir := "./uploads/avatars"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}

	// 5. Generate a unique filename: userID_timestamp.ext
	filename := fmt.Sprintf("%d_%d%s", userID, time.Now().Unix(), ext)
	filepathStr := filepath.Join(uploadDir, filename)

	// 6. Save the file
	if err := c.SaveUploadedFile(file, filepathStr); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// 7. Construct URL (Absolute path for frontend to access)
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	// Use Host from request (e.g. localhost:8080)
	baseURL := fmt.Sprintf("%s://%s", scheme, c.Request.Host)
	avatarURL := fmt.Sprintf("%s/uploads/avatars/%s", baseURL, filename)

	// 8. Update User in DB
	updatedUser, err := h.userService.UpdateAvatar(userID, avatarURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user avatar in database"})
		return
	}

	c.JSON(http.StatusOK, updatedUser)
}

func (h *UserHandler) DeleteUser(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	err = h.userService.DeleteUser(id)
	if err != nil {
		if err.Error() == "user not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

// Helper to create a Client profile for a new Trainee
func (h *UserHandler) createClientProfile(user *models.User) error {
	// 0. Update: Try to link existing "unlinked" client profile by Email first
	if err := h.clientRepo.LinkUserByEmail(user.Email, user.ID); err != nil {
		log.Printf("Failed to auto-link client profile for user %d: %v", user.ID, err)
	}

	// 1. Check if Client Profile already exists (linked via Email in Repository)
	_, err := h.clientRepo.GetClientByUserID(user.ID)
	if err == nil {
		// Found existing profile (linked successfully), no need to create new one
		// We might want to ensure names match or update fields, but for now just return.
		return nil
	}

	// 2. Create a new Client profile linked to this User
	newClient := &models.Client{
		UserID: &user.ID,
		Name:   user.Name,
		Email:  &user.Email,
		// Optional: Set default values
		TargetWeight:            new(float64), // 0.0
		WorkoutFrequencyPerWeek: new(int),     // 0
	}

	// Save to DB
	if err := h.clientRepo.CreateClient(newClient); err != nil {
		log.Printf("Failed to create client profile for user %d: %v", user.ID, err)
		return err
	}
	return nil
}

// ----------------------------------------------------
// (ฟังก์ชัน Auth ที่มี Logic จริง)
// ----------------------------------------------------

func (h *UserHandler) Register(c *gin.Context) {
	var req service.RegisterRequest // (ใช้ service.RegisterRequest)
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// เรียก Service (Logic การ Hash อยู่ใน Service แล้ว)
	user, err := h.userService.RegisterUser(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// [NEW] If Role is 'trainee', automatically create a Client Profile
	if user.Role == "trainee" {
		if err := h.createClientProfile(user); err != nil {
			// Note: User is created but Client profile failed.
			// Ideally we should rollback, but for now we log and warn.
			log.Printf("WARNING: User %d created but Client Profile failed: %v", user.ID, err)
			// Optional: return error? Or just let them log in and fix profile later?
			// Let's return error so they know something went wrong
			c.JSON(http.StatusInternalServerError, gin.H{"error": "User created but failed to initialize profile"})
			return
		}
	}

	c.JSON(http.StatusCreated, user) // ส่ง User ที่สร้างเสร็จกลับไป
}

func (h *UserHandler) Login(c *gin.Context) {
	var req service.LoginRequest // (ใช้ service.LoginRequest)
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// +++ เพิ่มส่วนนี้เพื่อความปลอดภัยสูงสุด +++
	// ป้องกันกรณีคนพยายาม Login บัญชี Google โดยไม่ใส่รหัสผ่าน
	if req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password is required"})
		return
	}
	// ++++++++++++++++++++++++++++++++++++++

	// เรียก Service
	accessToken, err := h.userService.LoginUser(req)
	if err != nil {
		// (ปรับ Error Message ให้ผู้ใช้เข้าใจง่ายขึ้น ไม่ควรส่ง raw error)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// ตั้งค่า httpOnly Cookie (จากเอกสาร Auth Part 1)
	cookieDomain := os.Getenv("COOKIE_DOMAIN")
	c.SetCookie("access_token", accessToken, 86400, "/", cookieDomain, false, true)

	c.JSON(http.StatusOK, gin.H{"message": "Login successful"})
}

func (h *UserHandler) Logout(c *gin.Context) {
	// ล้าง Cookie
	c.SetCookie("access_token", "", -1, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{"message": "Logout successful"})
}

// (Logic ให้ GoogleLogin)
func (h *UserHandler) GoogleLogin(c *gin.Context) {
	ensureConfigInit()

	// Clone config to modify redirect URL if necessary
	conf := *googleOauthConfig
	// 💥 [CRITICAL FIX] บังคับให้เป็น localhost เสมอ เพื่อให้ Google Cloud ยอมรับ
	conf.RedirectURL = "http://localhost:8080/auth/google/callback"

	role := c.Query("role")
	if role == "" {
		role = "trainee"
	}
	state := "random-state-string-for-csrf-protection|" + role
	url := conf.AuthCodeURL(state)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// (Logic ให้ GoogleCallback)
func (h *UserHandler) GoogleCallback(c *gin.Context) {
	ensureConfigInit()

	// Clone config to match the redirect URL used in GoogleLogin
	conf := *googleOauthConfig
	conf.RedirectURL = "http://localhost:8080/auth/google/callback"

	code := c.Query("code")

	// 2. นำ "code" ไปแลกเป็น "Google Token"
	token, err := conf.Exchange(context.Background(), code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange token: " + err.Error()})
		return
	}

	// 3. นำ "Google Token" ไปขอข้อมูลโปรไฟล์ผู้ใช้
	response, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + token.AccessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
		return
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read user info"})
		return
	}

	// 4. (Flow 3) ค้นหา หรือ สร้าง User
	var googleUser struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	json.Unmarshal(body, &googleUser)

	// Retrieve role from state parameter
	stateReturn := c.Query("state")
	parts := strings.Split(stateReturn, "|")
	targetRole := "trainee" // Default fallback
	if len(parts) > 1 && (parts[1] == "trainer" || parts[1] == "trainee") {
		targetRole = parts[1]
	}

	// (a) ค้นหา User ด้วย Email
	user, err := h.userService.GetUserByEmail(googleUser.Email)
	if err != nil {
		// (b) ถ้า "ไม่เจอ" (Sign Up) -> สร้าง User ใหม่
		if err.Error() == "user not found" {
			// สร้าง User ใหม่ด้วย Role ที่ได้รับมา (หรือ default)
			createdUser, err := h.userService.RegisterUser(service.RegisterRequest{
				FirstName: googleUser.Name,
				LastName:  "", // (Google อาจจะไม่ได้แยกชื่อมาให้)
				Email:     googleUser.Email,
				Password:  "google_user_placeholder_password",
				Role:      targetRole, // ใช้ Role ที่ถูกต้อง
			})
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create new user via Google"})
				return
			}
			user = createdUser

			// [NEW] Automatically create Client Profile for new Trainee via Google
			if user.Role == "trainee" {
				if err := h.createClientProfile(user); err != nil {
					log.Printf("WARNING: Google User %d created but Client Profile failed: %v", user.ID, err)
					// Proceed anyway for Google login? Or fail?
					// Ideally proceed, user can contact support.
				}
			}

		} else {
			// ถ้า Error อื่น (เช่น DB ล่ม)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error on user lookup"})
			return
		}
	}

	// (c) ถ้า "เจอ" (Log In) -> เราได้ `user` มาแล้ว

	// [NEW] Auto-link Client Profile (Reverse Mapping)
	if user != nil {
		if err := h.clientRepo.LinkUserByEmail(user.Email, user.ID); err != nil {
			log.Printf("Warning: Failed to auto-link client profile: %v", err)
		}
	}

	// 5. สร้าง JWT Token และตั้ง Cookie (เหมือน `Login` Handler)
	accessToken, err := h.userService.LoginUser(service.LoginRequest{
		Email:    user.Email,
		Password: "", // (ส่ง Password ว่างเปล่าไป)
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to log in user after Google auth"})
		return
	}

	// 6. ตั้งค่า httpOnly Cookie
	cookieDomain := os.Getenv("COOKIE_DOMAIN")
	c.SetCookie("access_token", accessToken, 86400, "/", cookieDomain, false, true)

	// 7. (สำคัญ) Redirect กลับไปหน้า Frontend ตาม Role ที่ User เลือกล็อกอินเข้ามา (Target Role)
	// เพื่อให้สามารถเข้าใช้งานได้ทั้งสองฝั่ง (Trainer/Client) โดยไม่ถูก Force Redirect
	baseIP := "localhost"
	if strings.Contains(c.Request.Host, "10.0.2.2") {
		baseIP = "10.0.2.2"
	}

	clientURL := os.Getenv("FRONTEND_CLIENT_URL")
	if clientURL == "" {
		clientURL = fmt.Sprintf("http://%s:5173", baseIP) // Default Client Dashboard
	}

	trainerURL := os.Getenv("FRONTEND_TRAINER_URL")
	if trainerURL == "" {
		trainerURL = fmt.Sprintf("http://%s:3000/dashboard", baseIP)
	}

	redirectURL := clientURL

	// ใช้ targetRole (จาก state param) เป็นตัวตัดสินว่าจะส่งกลับไป port ไหน
	if targetRole == "trainer" {
		redirectURL = trainerURL
	}

	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

func (h *UserHandler) CheckAuth(c *gin.Context) {
	// ดึง userID จาก Context (ที่ Middleware ใส่ไว้ให้)
	userID, ok := GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Fetch full user details
	user, err := h.userService.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	// Return full user object (Frontend expects this structure)
	c.JSON(http.StatusOK, user)
}
