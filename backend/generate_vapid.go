package main

import (
	"fmt"
	"os"

	"github.com/SherClockHolmes/webpush-go"
)

func main() {
	privateKey, publicKey, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		panic(err)
	}

	f, err := os.OpenFile(".env", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		panic(err)
	}
	defer f.Close()

	if _, err := f.WriteString(fmt.Sprintf("\nVAPID_PUBLIC_KEY=\"%s\"\nVAPID_PRIVATE_KEY=\"%s\"\n", publicKey, privateKey)); err != nil {
		panic(err)
	}

	fmt.Printf("VAPID Keys generated and appended to .env\nPublic: %s\n", publicKey)
}
