package controllers

import (
	"io"
	"net/http"
	"nido-backend/database"
	"nido-backend/models"

	"github.com/gin-gonic/gin"
)

func getUserFromContext(c *gin.Context) (models.User, error) {
	username := c.GetString("username")
	var user models.User
	err := database.DB.Where("username = ?", username).First(&user).Error
	return user, err
}

func GetTasks(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	var tasks []models.Task
	database.DB.Where("family_id = ?", user.FamilyID).Find(&tasks)
	c.JSON(http.StatusOK, tasks)
}

type CreateTaskRequest struct {
	Title       string  `json:"title" binding:"required"`
	Description string  `json:"description"`
	DueDate     *string `json:"dueDate"`
}

func CreateTask(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	var req CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	task := models.Task{
		Title:         req.Title,
		Description:   req.Description,
		DueDate:       req.DueDate,
		Status:        "TODO",
		CreatedByName: user.DisplayName,
		FamilyID:      user.FamilyID,
	}

	database.DB.Create(&task)
	c.JSON(http.StatusCreated, task)
}

func UpdateTaskStatus(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	taskId := c.Param("id")
	status := c.Query("status")
	if status == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Estado es requerido"})
		return
	}

	var task models.Task
	if err := database.DB.Where("id = ? AND family_id = ?", taskId, user.FamilyID).First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tarea no encontrada"})
		return
	}

	task.Status = status
	if status == "IN_PROGRESS" {
		task.InProgressByName = user.DisplayName
	} else if status == "DONE" {
		task.CompletedByName = user.DisplayName
	}

	database.DB.Save(&task)
	c.JSON(http.StatusOK, task)
}

func UpdateTaskDueDate(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	taskId := c.Param("id")
	dueDate := c.Query("dueDate")

	var task models.Task
	if err := database.DB.Where("id = ? AND family_id = ?", taskId, user.FamilyID).First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tarea no encontrada"})
		return
	}

	if dueDate == "" {
		task.DueDate = nil
	} else {
		task.DueDate = &dueDate
	}

	database.DB.Save(&task)
	c.JSON(http.StatusOK, task)
}

func UpdateTaskDescription(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	taskId := c.Param("id")
	
	// Leer el body como raw string (text/plain)
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Error al leer la descripción"})
		return
	}
	description := string(bodyBytes)

	var task models.Task
	if err := database.DB.Where("id = ? AND family_id = ?", taskId, user.FamilyID).First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tarea no encontrada"})
		return
	}

	task.Description = description
	database.DB.Save(&task)
	
	c.JSON(http.StatusOK, task)
}

func DeleteTask(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	taskId := c.Param("id")
	if err := database.DB.Where("id = ? AND family_id = ?", taskId, user.FamilyID).Delete(&models.Task{}).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tarea no encontrada"})
		return
	}

	c.Status(http.StatusNoContent)
}
