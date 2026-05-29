package main

import (
	"context"
	"log"
	"os"
	"time"

	"gin-auth-supabase/src/auth"
	"gin-auth-supabase/src/db"
	headCountLog "gin-auth-supabase/src/head_count_log"
	"gin-auth-supabase/src/snapshots"
	"gin-auth-supabase/src/sources"
	websock "gin-auth-supabase/src/websocket"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Notice: No .env file found. Relying on system environment variables.")
	}

	pool, err := pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal("Unable to connect to database:", err)
	}
	defer pool.Close()

	wsHub := websock.NewWSHub()
	go wsHub.Run()

	queries := db.New(pool)
	authService := auth.NewService(queries)
	SourcesService := sources.NewService(queries, pool)
	headCountLogService := headCountLog.NewService(queries)
	snapshotsService := snapshots.NewService(queries)
	// auditLogService := auditLog.NewService(queries)

	authHandler := auth.NewHandler(authService)
	SourcesHandler := sources.NewHandler(SourcesService)
	headCountLogHandler := headCountLog.NewHandler(headCountLogService, wsHub)
	snapshotsHandler := snapshots.NewHandler(snapshotsService)
	// auditLogHandler := auditLog.NewHandler(auditLogService)

	r := gin.Default()

	origins := []string{}
	if fe := os.Getenv("FE_URL"); fe != "" {
		origins = append(origins, fe)
	}
	if ai := os.Getenv("BE_AI_URL"); ai != "" {
		origins = append(origins, ai)
	}

	r.Use(cors.New(cors.Config{
		// AllowAllOrigins: true,
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		AllowWebSockets:  true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/ws", websock.HandleWS(wsHub))

	r.Static("public/snapshots", "./public/snapshots/")

	Api := r.Group("/api")
	{
		authApi := Api.Group("/auth")
		{
			authApi.POST("/register", authHandler.HandleRegister)
			authApi.POST("/login", authHandler.HandleLogin)
			authApi.POST("/forgot-password", authHandler.HandleForgotPassword)
			authApi.POST("/reset-password", authHandler.VerifyForgotPasswordToken)
		}

		SourcesApi := Api.Group("/sources")
		SourcesApi.GET("", SourcesHandler.HandleRequest)
		SourcesApi.Use(auth.AuthMiddleware())
		{
			SourcesApi.POST("", SourcesHandler.HandleAdd)
			SourcesApi.GET("/:id", SourcesHandler.HandleRequestById)
			SourcesApi.PUT("/:id", SourcesHandler.HandleUpdateById)
			SourcesApi.PUT("/status/:id", SourcesHandler.HandleStatusUpdateById)
			SourcesApi.DELETE("/:id", SourcesHandler.HandleDeleteById)
		}

		headCountLogApi := Api.Group("/logs")
		{
			headCountLogApi.POST("", headCountLogHandler.HandleAdd)
			// headCountLogApi.GET("/:sourceName", headCountLogHandler.HandleRequestBySource)
		}

		snapshotsApi := Api.Group("/snapshots")
		snapshotsApi.POST("", snapshotsHandler.HandleAdd)
		snapshotsApi.Use(auth.AuthMiddleware())
		{
			snapshotsApi.GET("", snapshotsHandler.HandleRequest)
			// snapshotsApi.GET("/:sourceId/:snapshotId", snapshotsHandler.HandleRequestById)
			// snapshotsApi.DELETE("/:sourceId/:snapshotId", snapshotsHandler.HandleDeleteById)
		}

		// auditLogApi := Api.Group("/crudlogs")
		// {
		// 	auditLogApi.GET("", auditLogHandler.HandleRequest)
		// 	auditLogApi.GET("/:userId", auditLogHandler.HandleRequestByUserId)
		// }
	}

	r.Run(":8080")
}
