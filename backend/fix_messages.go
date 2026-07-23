package main

import (
	"encoding/json"
	"fmt"
	"log"
	"nido-backend/database"
	"nido-backend/models"
	"strings"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No env file")
	}

	database.ConnectDB()

	var messages []models.Message
	database.DB.Find(&messages)

	count := 0
	for _, msg := range messages {
		// Si el mensaje arranca con {"content": asume que es el JSON mal parseado
		if strings.HasPrefix(msg.Content, `{"content"`) {
			var parsed map[string]interface{}
			if err := json.Unmarshal([]byte(msg.Content), &parsed); err == nil {
				if contentRaw, ok := parsed["content"]; ok {
					if contentStr, ok := contentRaw.(string); ok {
						msg.Content = contentStr
						database.DB.Save(&msg)
						count++
					}
				}
			}
		}
	}

	fmt.Printf("¡Se arreglaron %d mensajes feos en la base de datos!\n", count)
}
