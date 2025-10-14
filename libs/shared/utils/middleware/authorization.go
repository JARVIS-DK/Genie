package middleware

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

func GenerateJWT(payload map[string]interface{}, expTime time.Duration, jwtKey string) (string, error) {
	// Add expiration time to the payload
	payload["exp"] = time.Now().Add(expTime).Unix()

	// Create a new token object with specified signing method and claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims(payload))

	// Sign the token with the provided key
	tokenString, err := token.SignedString([]byte(jwtKey))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}
