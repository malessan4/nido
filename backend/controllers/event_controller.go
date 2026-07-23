package controllers

import (
	"net/http"
	"nido-backend/database"
	"nido-backend/models"
	"time"

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

	// Frontend sends format like: "2026-07-22T09:00:00"
	layout := "2006-01-02T15:04:05"
	startTime, err := time.ParseInLocation(layout, req.StartTime, time.Local)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Formato de startTime inválido"})
		return
	}

	endTime, err := time.ParseInLocation(layout, req.EndTime, time.Local)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Formato de endTime inválido"})
		return
	}

	event := models.Event{
		Title:       req.Title,
		Description: req.Description,
		StartTime:   startTime,
		EndTime:     endTime,
		FamilyID:    user.FamilyID,
	}

	if err := database.DB.Create(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar el evento"})
		return
	}

	c.JSON(http.StatusCreated, event)
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
