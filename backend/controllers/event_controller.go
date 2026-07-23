package controllers

import (
	"net/http"
	"nido-backend/database"
	"nido-backend/models"

	"github.com/gin-gonic/gin"
)

func GetEvents(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	var events []models.Event
	database.DB.Where("family_id = ?", user.FamilyID).Find(&events)
	c.JSON(http.StatusOK, events)
}

type CreateEventRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	StartTime   string `json:"startTime" binding:"required"`
	EndTime     string `json:"endTime" binding:"required"`
}

func CreateEvent(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	var req CreateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	// Como startTime y endTime vienen como string desde el Frontend (YYYY-MM-DDTHH:MM:SS),
	// los guardamos directamente mapeando usando json en el struct local y luego copiando
	// o convirtiendo a time.Time. Como el Request viene en formato ISO, GORM lo parsea directo.

	event := models.Event{
		Title:       req.Title,
		Description: req.Description,
		FamilyID:    user.FamilyID,
	}

	// Parche rápido para guardar el struct directamente
	// (Usaremos raw binding para evitar problemas de parseo manual de fechas)
	var rawEvent struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		StartTime   string `json:"startTime"`
		EndTime     string `json:"endTime"`
	}
	
	if err := c.ShouldBindJSON(&rawEvent); err == nil {
		// Lo hacemos con map a la BD para no lidiar con conversiones manuales en este ejemplo
	}

	// Mejor: Gorm parsea automáticamente si usamos una variable con el modelo real
	var eventModel models.Event
	if err := c.ShouldBindJSON(&eventModel); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Error de fecha"})
		return
	}
	
	eventModel.FamilyID = user.FamilyID

	database.DB.Create(&eventModel)
	c.JSON(http.StatusCreated, eventModel)
}

func DeleteEvent(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	eventId := c.Param("id")
	if err := database.DB.Where("id = ? AND family_id = ?", eventId, user.FamilyID).Delete(&models.Event{}).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Evento no encontrado"})
		return
	}

	c.Status(http.StatusNoContent)
}
