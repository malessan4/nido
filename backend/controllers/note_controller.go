package controllers

import (
	"net/http"
	"nido-backend/database"
	"nido-backend/models"

	"github.com/gin-gonic/gin"
)

func GetNotes(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	var notes []models.Note
	// Ordenar por ID descendente para que los nuevos salgan arriba
	database.DB.Where("family_id = ?", user.FamilyID).Order("id desc").Find(&notes)
	c.JSON(http.StatusOK, notes)
}

type CreateNoteRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content" binding:"required"`
}

func CreateNote(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	var req CreateNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	note := models.Note{
		Title:    req.Title,
		Content:  req.Content,
		FamilyID: user.FamilyID,
	}

	if err := database.DB.Create(&note).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar la nota"})
		return
	}

	c.JSON(http.StatusCreated, note)
}

func UpdateNote(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	noteId := c.Param("id")
	var note models.Note

	if err := database.DB.Where("id = ? AND family_id = ?", noteId, user.FamilyID).First(&note).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Nota no encontrada"})
		return
	}

	var req CreateNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	note.Title = req.Title
	note.Content = req.Content
	database.DB.Save(&note)

	c.JSON(http.StatusOK, note)
}

func DeleteNote(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	noteId := c.Param("id")
	if err := database.DB.Where("id = ? AND family_id = ?", noteId, user.FamilyID).Delete(&models.Note{}).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Nota no encontrada"})
		return
	}

	c.Status(http.StatusNoContent)
}
