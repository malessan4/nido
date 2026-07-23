package controllers

import (
	"net/http"
	"nido-backend/database"
	"nido-backend/models"

	"github.com/gin-gonic/gin"
)

type PushSubscriptionRequest struct {
	Endpoint string `json:"endpoint" binding:"required"`
	Keys     struct {
		P256dh string `json:"p256dh" binding:"required"`
		Auth   string `json:"auth" binding:"required"`
	} `json:"keys" binding:"required"`
}

func SubscribeToPush(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	var req PushSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	var existing models.PushSubscription
	// Verificar si ya existe este endpoint exacto
	if err := database.DB.Where("endpoint = ?", req.Endpoint).First(&existing).Error; err == nil {
		// Ya existe
		if existing.UserID != user.ID {
			// Si por alguna razón cambió de usuario, lo actualizamos
			existing.UserID = user.ID
			existing.P256dh = req.Keys.P256dh
			existing.Auth = req.Keys.Auth
			database.DB.Save(&existing)
		}
		c.JSON(http.StatusOK, gin.H{"message": "Suscripción actualizada"})
		return
	}

	newSub := models.PushSubscription{
		UserID:   user.ID,
		Endpoint: req.Endpoint,
		P256dh:   req.Keys.P256dh,
		Auth:     req.Keys.Auth,
	}

	if err := database.DB.Create(&newSub).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar suscripción"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Suscripción guardada"})
}
