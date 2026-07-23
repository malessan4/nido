package controllers

import (
	"io"
	"net/http"
	"nido-backend/database"
	"nido-backend/models"
	"nido-backend/services"

	"github.com/gin-gonic/gin"
)

func GetMessages(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	var messages []models.Message
	database.DB.Preload("Sender").Where("family_id = ?", user.FamilyID).Order("timestamp asc").Find(&messages)

	// En Go, el serializador a veces incluye el campo de Foreign Key en la respuesta.
	// Pero ya le pusimos `json:"-"` a SenderID y FamilyID en models.go, 
	// así que el JSON saldrá limpio y exacto al de Java.
	c.JSON(http.StatusOK, messages)
}

type SendMessageRequest struct {
	Content        string `json:"content" binding:"required"`
	SenderUsername string `json:"senderUsername"`
}

func SendMessage(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Mensaje inválido"})
		return
	}

	message := models.Message{
		Content:  req.Content,
		FamilyID: user.FamilyID,
		SenderID: user.ID,
	}

	database.DB.Create(&message)
	// Para devolver la respuesta correcta, necesitamos cargar el Sender
	database.DB.Preload("Sender").First(&message, message.ID)

	// --- Lógica de Notificaciones Push ---
	// Buscar a todos los usuarios de esta familia (excepto el que envía el mensaje) y sus tokens push
	var familyUsers []models.User
	database.DB.Preload("PushTokens").Where("family_id = ? AND id != ?", user.FamilyID, user.ID).Find(&familyUsers)

	pushMsg := services.PushMessage{
		Title: "Nuevo mensaje de " + user.DisplayName,
		Body:  message.Content,
		Url:   "/dashboard",
		Icon:  "/android-chrome-192x192.png",
	}

	for _, famUser := range familyUsers {
		for _, token := range famUser.PushTokens {
			// Enviar en background para no frenar la respuesta HTTP
			go services.SendPushNotification(token, pushMsg)
		}
	}
	// -------------------------------------

	c.JSON(http.StatusOK, message)
}
