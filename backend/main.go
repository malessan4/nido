package main

import (
	"log"
	"nido-backend/controllers"
	"nido-backend/cron"
	"nido-backend/database"
	"nido-backend/middleware"
	"nido-backend/models"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Cargar variables de entorno
	if err := godotenv.Load(); err != nil {
		log.Println("No se pudo cargar el archivo .env, se usarán las variables del sistema")
	}

	// Configurar Zona Horaria (Buenos Aires)
	loc, err := time.LoadLocation("America/Argentina/Buenos_Aires")
	if err != nil {
		log.Println("No se pudo cargar la zona horaria, usando Local por defecto:", err)
	} else {
		time.Local = loc
		log.Println("Zona horaria configurada a:", time.Local.String())
	}

	// Conectar a la base de datos
	database.ConnectDB()

	// Auto-Migración: GORM creará/actualizará las tablas automáticamente
	err = database.DB.AutoMigrate(
		&models.Family{},
		&models.User{},
		&models.Task{},
		&models.Message{},
		&models.PushSubscription{},
	)
	if err != nil {
		log.Fatal("Error al migrar la base de datos:", err)
	}

	// Iniciar CRON de Tareas Vencidas
	cron.StartScheduler()

	// Configurar router Gin
	r := gin.Default()

	// Configurar CORS
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true // Permitir todo para desarrollo
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	r.Use(cors.New(config))

	// Grupo de rutas API
	api := r.Group("/api")
	{
		// Rutas públicas (Auth)
		auth := api.Group("/auth")
		{
			auth.POST("/register", controllers.Register)
			auth.POST("/login", controllers.Login)
		}

		// Rutas protegidas (Requieren JWT)
		protected := api.Group("")
		protected.Use(middleware.JWTAuthMiddleware())
		{
			// Tareas
			tasks := protected.Group("/tasks")
			{
				tasks.GET("", controllers.GetTasks)
				tasks.POST("", controllers.CreateTask)
				tasks.PATCH("/:id/status", controllers.UpdateTaskStatus)
				tasks.PATCH("/:id/due-date", controllers.UpdateTaskDueDate)
				tasks.PATCH("/:id/description", controllers.UpdateTaskDescription)
				tasks.DELETE("/:id", controllers.DeleteTask)
			}

			// Mensajes
			messages := protected.Group("/messages")
			{
				messages.GET("", controllers.GetMessages)
				messages.POST("/send", controllers.SendMessage)
			}

			// Notificaciones
			notifications := protected.Group("/notifications")
			{
				notifications.POST("/subscribe", controllers.SubscribeToPush)
			}
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Servidor corriendo en el puerto %s\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Error al iniciar el servidor:", err)
	}
}
