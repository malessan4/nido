package services

import (
	"encoding/json"
	"log"
	"nido-backend/models"
	"os"

	"github.com/SherClockHolmes/webpush-go"
)

type PushMessage struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Icon  string `json:"icon"`
	Url   string `json:"url"`
}

func SendPushNotification(sub models.PushSubscription, message PushMessage) error {
	payload, err := json.Marshal(message)
	if err != nil {
		return err
	}

	subOptions := &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys: webpush.Keys{
			P256dh: sub.P256dh,
			Auth:   sub.Auth,
		},
	}

	resp, err := webpush.SendNotification(payload, subOptions, &webpush.Options{
		Subscriber:      "mailto:nido@example.com",
		VAPIDPublicKey:  os.Getenv("VAPID_PUBLIC_KEY"),
		VAPIDPrivateKey: os.Getenv("VAPID_PRIVATE_KEY"),
		TTL:             30,
	})

	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == 410 || resp.StatusCode == 404 {
		// La suscripción expiró o ya no existe, deberíamos borrarla de la BD
		log.Printf("Suscripción %s ya no es válida. Debería eliminarse.", sub.Endpoint)
		// Aquí idealmente borraríamos la suscripción de la base de datos
	}

	return nil
}
