package controllers

import (
	"net/http"
	"nido-backend/database"
	"nido-backend/models"

	"github.com/gin-gonic/gin"
)

func GetShoppingItems(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	var items []models.ShoppingItem
	// Ordenar por ID descendente para que los nuevos salgan arriba
	database.DB.Where("family_id = ?", user.FamilyID).Order("id desc").Find(&items)
	c.JSON(http.StatusOK, items)
}

type CreateShoppingItemRequest struct {
	Name string `json:"name" binding:"required"`
}

func CreateShoppingItem(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	var req CreateShoppingItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	item := models.ShoppingItem{
		Name:        req.Name,
		IsCompleted: false,
		FamilyID:    user.FamilyID,
	}

	if err := database.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al guardar el ítem"})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func ToggleShoppingItem(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	itemId := c.Param("id")
	var item models.ShoppingItem

	if err := database.DB.Where("id = ? AND family_id = ?", itemId, user.FamilyID).First(&item).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ítem no encontrado"})
		return
	}

	// Toggle
	item.IsCompleted = !item.IsCompleted
	database.DB.Save(&item)

	c.JSON(http.StatusOK, item)
}

func UpdateShoppingItem(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	itemId := c.Param("id")
	var item models.ShoppingItem

	if err := database.DB.Where("id = ? AND family_id = ?", itemId, user.FamilyID).First(&item).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ítem no encontrado"})
		return
	}

	var req CreateShoppingItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	item.Name = req.Name
	database.DB.Save(&item)

	c.JSON(http.StatusOK, item)
}

func DeleteShoppingItem(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	itemId := c.Param("id")
	if err := database.DB.Where("id = ? AND family_id = ?", itemId, user.FamilyID).Delete(&models.ShoppingItem{}).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ítem no encontrado"})
		return
	}

	c.Status(http.StatusNoContent)
}
