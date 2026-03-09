package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"

	"users/internal/config"
	"users/internal/handler"
	"users/internal/middleware"
	"users/internal/repository"
	"users/internal/service"
	"users/internal/websocket"
)

func main() {
	cfg := config.LoadConfig()

	// เชื่อมต่อ Database
	db, err := repository.ConnectDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}
	defer db.Close()

	userRepo := repository.NewUserRepository(db)
	clientRepo := repository.NewClientRepository(db)
	userService := service.NewUserService(userRepo)
	userHandler := handler.NewUserHandler(userService, clientRepo)

	// สร้าง Dependencies ใหม่
	trainingRepo := repository.NewTrainingRepository(db)
	trainingHandler := handler.NewTrainingHandler(trainingRepo, userRepo)

	// --- Init Dashboard Components
	dashboardRepo := repository.NewDashboardRepository(db)
	dashboardHandler := handler.NewDashboardHandler(dashboardRepo)

	// Notification Component
	notificationRepo := repository.NewNotificationRepository(db)
	notificationService := service.NewNotificationService(notificationRepo)
	notificationHandler := handler.NewNotificationHandler(notificationService)

	// Search Component
	searchHandler := handler.NewSearchHandler(userRepo)

	// clientHandler initialization moved down because it needs programRepo and exerciseRepo

	// Init HealthMetricHandler (reuses clientRepo)
	healthMetricHandler := handler.NewHealthMetricHandler(clientRepo)

	sessionRepo := repository.NewSessionRepository(db)

	// Init WebSocket Hub
	hub := websocket.NewHub()
	go hub.Run()

	sessionHandler := handler.NewSessionHandler(sessionRepo, clientRepo, hub)

	programRepo := repository.NewProgramRepository(db)
	programHandler := handler.NewProgramHandler(programRepo)

	calendarNoteRepo := repository.NewCalendarNoteRepository(db)
	calendarNoteHandler := handler.NewCalendarNoteHandler(calendarNoteRepo)

	exerciseRepo := repository.NewExerciseRepository(db)
	exerciseHandler := handler.NewExerciseHandler(exerciseRepo)

	// Now we can init clientHandler as dependencies are ready
	clientHandler := handler.NewClientHandler(clientRepo, userService, programRepo, exerciseRepo)

	r := gin.Default()
	// ----------------------------------------------------
	// 2. ใช้งาน CORS Middleware (ต้องอยู่ก่อน Routes)
	// ----------------------------------------------------

	r.Use(cors.New(cors.Config{
		// 💥 [CRITICAL FIX] ยอมรับทุก Origin แบบไดนามิก เพื่อแก้ปัญหา CORS ของ Emulator 10.0.2.2 ครอบจักรวาล
		AllowOriginFunc: func(origin string) bool {
			return true
		},
		// อนุญาต Methods (ท่า) ที่ Frontend ใช้
		AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		// อนุญาต Headers ที่ Frontend ส่งมา
		AllowHeaders: []string{"Origin", "Content-Type", "Authorization", "x-role", "Accept"},
		// (สำคัญมาก!) อนุญาตให้ส่ง Cookie (JWT Token) ไปด้วย
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/health", func(c *gin.Context) {
		if err := repository.CheckDBConnection(db); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"detail": "Database connection failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "database": "connected"})
	})

	// Google OAuth Callback Route (ต้องอยู่นอก /api/v1 เพื่อให้ตรงกับ Google Cloud Console)
	r.GET("/auth/google/callback", userHandler.GoogleCallback)

	// WebSocket Route
	r.GET("/ws", func(c *gin.Context) {
		websocket.ServeWs(hub, c)
	})

	// Static files for uploads
	r.Static("/uploads", "./uploads")

	// API v1 Routes
	apiV1 := r.Group("/api/v1")
	{
		// ----------------------------------------------------
		// 1. Public Routes (No Auth)
		// ----------------------------------------------------
		authRoutes := apiV1.Group("/auth")
		{
			authRoutes.POST("/register", userHandler.Register)
			authRoutes.POST("/login", userHandler.Login)
			authRoutes.POST("/logout", userHandler.Logout)
			authRoutes.GET("/google/login", userHandler.GoogleLogin)
		}

		// Debug Routes
		debugRoutes := apiV1.Group("/debug")
		{
			debugRoutes.GET("/history-backfill", sessionHandler.BackfillHistory)
			debugRoutes.GET("/check-data", sessionHandler.InspectHistory)
		}

		// ----------------------------------------------------
		// 2. Protected Routes (Authenticated)
		// ----------------------------------------------------
		protected := apiV1.Group("")
		protected.Use(middleware.JWTCookieAuth())
		{
			// 2.1 Shared Routes (Both Trainer & Trainee)
			protected.GET("/auth/me", userHandler.CheckAuth)
			protected.POST("/users/upload-avatar", userHandler.UploadAvatar)
			protected.PUT("/users/:id", userHandler.UpdateUser) // Self-update ideally, or check ownership

			// Notifications (Shared)
			protected.GET("/notifications", notificationHandler.GetNotifications)
			protected.GET("/notifications/unread-count", notificationHandler.GetUnreadCount)
			protected.POST("/notifications/:id/read", notificationHandler.MarkAsRead)

			// ----------------------------------------------------
			// 2.2 Trainer Routes (Role: trainer)
			// ----------------------------------------------------
			trainerRoutes := protected.Group("")
			trainerRoutes.Use(middleware.RoleMiddleware("trainer"))
			{
				// User Management
				trainerRoutes.GET("/users", userHandler.GetAllUsers)
				trainerRoutes.GET("/users/:id", userHandler.GetUserByID)
				trainerRoutes.DELETE("/users/:id", userHandler.DeleteUser)

				// Client Management
				trainerRoutes.GET("/clients", clientHandler.GetAllClients)
				trainerRoutes.POST("/clients", clientHandler.CreateClient)
				trainerRoutes.GET("/clients/:id", clientHandler.GetClient)
				trainerRoutes.PUT("/clients/:id", clientHandler.UpdateClient)
				trainerRoutes.DELETE("/clients/:id", clientHandler.DeleteClient)

				// Client Notes
				trainerRoutes.GET("/clients/:id/notes", clientHandler.GetClientNotes)
				trainerRoutes.POST("/clients/:id/notes", clientHandler.CreateClientNote)
				trainerRoutes.PUT("/notes/:id", clientHandler.UpdateClientNote)
				trainerRoutes.DELETE("/notes/:id", clientHandler.DeleteClientNote)

				// Client Metrics & Programs (Trainer View)
				trainerRoutes.GET("/clients/:id/metrics", healthMetricHandler.GetClientMetrics)
				trainerRoutes.POST("/clients/:id/metrics", healthMetricHandler.CreateClientMetrics)
				trainerRoutes.GET("/clients/:id/programs/current", clientHandler.GetCurrentProgram)
				trainerRoutes.GET("/clients/:id/exercises/history", clientHandler.GetExerciseHistory)
				trainerRoutes.GET("/clients/:id/programs/current/statistics", clientHandler.GetProgramStatistics)

				// Scheduling & Sessions
				trainerRoutes.GET("/schedules", trainingHandler.GetSchedules)
				trainerRoutes.POST("/schedules", trainingHandler.CreateSchedule)
				trainerRoutes.PUT("/schedules/:id", trainingHandler.UpdateSchedule)
				trainerRoutes.DELETE("/schedules/:id", trainingHandler.DeleteSchedule)

				trainerRoutes.GET("/assignments", trainingHandler.GetAssignments)
				trainerRoutes.POST("/assignments", trainingHandler.CreateAssignment)
				trainerRoutes.PUT("/assignments/:id", trainingHandler.UpdateAssignment)
				trainerRoutes.DELETE("/assignments/:id", trainingHandler.DeleteAssignment)

				trainerRoutes.GET("/dashboard/stats", dashboardHandler.GetDashboardStats)

				// Programs
				trainerRoutes.GET("/programs", programHandler.GetPrograms)
				trainerRoutes.POST("/programs", programHandler.CreateProgram)
				trainerRoutes.POST("/programs/:id/exercises", programHandler.AddExercise)
				trainerRoutes.PUT("/programs/:id", programHandler.UpdateProgram)
				trainerRoutes.POST("/programs/:id/assign", programHandler.AssignProgram)
				trainerRoutes.POST("/programs/:id/clone", programHandler.CloneProgram)
				trainerRoutes.DELETE("/programs/:id", programHandler.DeleteProgram)

				// Program Builder
				trainerRoutes.POST("/program-days", programHandler.CreateProgramDay)
				trainerRoutes.DELETE("/program-days/:id", programHandler.DeleteProgramDay)
				trainerRoutes.PATCH("/program-days/:id", programHandler.UpdateProgramDay)
				trainerRoutes.POST("/program-sections", programHandler.CreateProgramSection)
				trainerRoutes.DELETE("/program-sections/:id", programHandler.DeleteProgramSection)
				trainerRoutes.POST("/program-exercises", programHandler.AddExercise)
				trainerRoutes.PUT("/program-exercises/:id", programHandler.UpdateExercise)
				trainerRoutes.DELETE("/program-exercises/:id", programHandler.DeleteExercise)

				// Exercise Library (Write operations - Trainer only)
				trainerRoutes.POST("/exercises", exerciseHandler.CreateExercise)
				trainerRoutes.PUT("/exercises/:id", exerciseHandler.UpdateExercise)
				trainerRoutes.DELETE("/exercises/:id", exerciseHandler.DeleteExercise)

				// Calendar Notes
				trainerRoutes.GET("/calendar/notes", calendarNoteHandler.GetNotes)
				trainerRoutes.POST("/calendar/notes", calendarNoteHandler.CreateNote)
				trainerRoutes.DELETE("/calendar/notes/:id", calendarNoteHandler.DeleteNote)
			}

			// ----------------------------------------------------
			// 2.3 Trainee Routes (Role: trainee)
			// ----------------------------------------------------
			traineeRoutes := protected.Group("/trainee")
			traineeRoutes.Use(middleware.RoleMiddleware("trainee"))
			{
				// Profile
				traineeRoutes.GET("/me", clientHandler.GetMe) // Return full ClientProfile

				// My Program
				traineeRoutes.GET("/program/current", clientHandler.GetMyCurrentProgram)
				traineeRoutes.GET("/program/current/statistics", clientHandler.GetMyProgramStatistics)
				traineeRoutes.GET("/exercises/history", clientHandler.GetMyExerciseHistory)

				// My Sessions
				traineeRoutes.GET("/sessions", sessionHandler.GetMySessions)
				traineeRoutes.GET("/sessions/:id", sessionHandler.GetMySessionDetail)
			}

			// ----------------------------------------------------
			// 2.4 Hybrid/Legacy Routes (Need cleanup or specific checks)
			// ----------------------------------------------------
			// Search (Trainer only? or Shared?)
			protected.GET("/search", func(c *gin.Context) {
				searchHandler.Search(c.Writer, c.Request)
			})

			// Client Metrics (For Trainee Dashboard? Reuse handler but with self-check?)
			protected.GET("/client-metrics", healthMetricHandler.GetAllHealthMetrics)

			// Shared Session Logic?
			protected.POST("/sessions", sessionHandler.CreateSession) // Trainer or Trainee (Self-start)?
			protected.GET("/sessions/:id", sessionHandler.GetSession)
			protected.PUT("/sessions/:id", sessionHandler.UpdateSession)
			protected.PATCH("/sessions/:id", sessionHandler.RescheduleSession) // [NEW] Reschedule
			protected.POST("/sessions/:id/complete", sessionHandler.CompleteSession)
			protected.DELETE("/sessions/:id", trainingHandler.DeleteSchedule)

			protected.GET("/clients/:id/sessions", sessionHandler.GetClientSessions)
			protected.GET("/clients/:id/sessions/:session_id", sessionHandler.GetClientSessionDetail)
			protected.POST("/sessions/:id/logs", sessionHandler.CreateLog)
			protected.GET("/session-logs", sessionHandler.GetAllSessionLogs)

			// Update Set (Used by Trainee to log sets)
			// Ensure handler checks if user is allowed to edit this session
			protected.PATCH("/clients/:client_id/sessions/:session_id/exercises/:exercise_id/sets/:set_number", sessionHandler.UpdateExerciseSet)

			// Exercise Library (Read-only, shared between trainer and trainee)
			protected.GET("/exercises", exerciseHandler.GetExercises)

			// Shared read access to Program Details
			protected.GET("/programs/:id", programHandler.GetProgramDetail)
		}
	}

	r.Run(":8080")
}
