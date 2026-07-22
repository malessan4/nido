package controllers

import (
	"net/http"
	"nido-backend/database"
	"nido-backend/models"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type RegisterRequest struct {
	Username    string `json:"username" binding:"required"`
	Password    string `json:"password" binding:"required"`
	DisplayName string `json:"displayName" binding:"required"`
	FamilyName  string `json:"familyName"`
	SecretCode  string `json:"secretCode"` // Can be new code or existing code to join
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func generateToken(username string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": username,
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(time.Hour * 24).Unix(),
	})
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Datos inválidos"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Error al encriptar contraseña"})
		return
	}

	var family models.Family
	db := database.DB

	if req.FamilyName != "" {
		if req.SecretCode == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "El código secreto es obligatorio para crear una familia"})
			return
		}
		
		var count int64
		db.Model(&models.Family{}).Where("code = ?", req.SecretCode).Count(&count)
		if count > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"message": "El código familiar ya está en uso"})
			return
		}

		family = models.Family{
			Name: req.FamilyName,
			Code: req.SecretCode,
		}
		if err := db.Create(&family).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Error al crear familia"})
			return
		}
	} else {
		if err := db.Where("code = ?", req.SecretCode).First(&family).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Código familiar incorrecto o no existe"})
			return
		}
	}

	user := models.User{
		Username:    req.Username,
		DisplayName: req.DisplayName,
		Password:    string(hashedPassword),
		Role:        "MEMBER",
		FamilyID:    family.ID,
	}

	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "El usuario ya existe o hubo un error"})
		return
	}

	token, _ := generateToken(user.Username)

	c.JSON(http.StatusCreated, gin.H{
		"token":       token,
		"username":    user.Username,
		"displayName": user.DisplayName,
		"familyName":  family.Name,
		"familyCode":  family.Code,
	})
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Datos inválidos"})
		return
	}

	var user models.User
	if err := database.DB.Preload("Family").Where("username = ?", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"message": "Credenciales inválidas"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"message": "Credenciales inválidas"})
		return
	}

	token, _ := generateToken(user.Username)

	c.JSON(http.StatusOK, gin.H{
		"token":       token,
		"username":    user.Username,
		"displayName": user.DisplayName,
		"familyName":  user.Family.Name,
		"familyCode":  user.Family.Code,
	})
}
