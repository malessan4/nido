package controllers

import (
	"io"
	"net/http"
	"nido-backend/database"
	"nido-backend/models"

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

func SendMessage(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Error al leer el mensaje"})
		return
	}
	content := string(bodyBytes)

	if content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El mensaje no puede estar vacío"})
		return
	}

	message := models.Message{
		Content:  content,
		FamilyID: user.FamilyID,
		SenderID: user.ID,
	}

	database.DB.Create(&message)
	// Para devolver la respuesta correcta, necesitamos cargar el Sender
	database.DB.Preload("Sender").First(&message, message.ID)

	c.JSON(http.StatusOK, message)
}
