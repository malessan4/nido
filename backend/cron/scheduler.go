package cron

import (
	"log"
	"nido-backend/database"
	"nido-backend/models"
	"nido-backend/services"
	"time"

	"github.com/robfig/cron/v3"
)

func StartScheduler() {
	// Configurar CRON para usar la zona horaria local (que setearemos a Buenos Aires en main.go)
	c := cron.New(cron.WithLocation(time.Local))

	// Ejecutar a las 6:00 AM todos los días
	_, err := c.AddFunc("0 6 * * *", func() {
		checkTasksDueToday()
	})

	if err != nil {
		log.Println("Error al programar el CRON:", err)
		return
	}

	c.Start()
	log.Println("⏰ Scheduler CRON iniciado (6:00 AM BUE)")
}

func checkTasksDueToday() {
	log.Println("Ejecutando revisión de tareas que vencen hoy...")

	// Buscar todas las tareas que vencen "hoy" y no están terminadas
	today := time.Now().Format("2006-01-02")
	var tasks []models.Task

	// En PostgreSQL, podemos comparar la cadena de fecha YYYY-MM-DD
	if err := database.DB.Preload("Family.Users.PushTokens").
		Where("due_date = ? AND status != 'DONE'", today).Find(&tasks).Error; err != nil {
		log.Println("Error al buscar tareas que vencen hoy:", err)
		return
	}

	for _, task := range tasks {
		msg := services.PushMessage{
			Title: "¡Tarea por vencer hoy!",
			Body:  "La tarea '" + task.Title + "' vence hoy. ¡No te olvides!",
			Url:   "/dashboard",
			Icon:  "/android-chrome-192x192.png", // Icono del frontend
		}

		// Avisar a todos los usuarios de la familia de esta tarea
		for _, user := range task.Family.Users {
			for _, token := range user.PushTokens {
				go services.SendPushNotification(token, msg)
			}
		}
	}
}
