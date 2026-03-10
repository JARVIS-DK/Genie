package middleware

import (
	"fmt"
	"libs/shared/utils/helpers"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type metaData struct {
	RequestId     string `json:"request_id"`
	Host          string `json:"host"`
	Name          string `json:"name"`
	Token         string `json:"token"`
	UserId        int    `json:"user_id"`
	Email         string `json:"email"`
	Phone         string `json:"phone"`
	RequestedPath string `json:"requested_path"`
	UserAgent     string `json:"user_agent"`
}

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

func AuthorizationCheck(jwtKey string, mongo_credientials interface{}) echo.MiddlewareFunc {

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authToken := c.Request().Header.Get("Authorization")
			if authToken == "" {
				return RespUnathourized(c, "Authorization Required", "Authorization Required")
			}

			splitToken := strings.Split(authToken, " ")

			if len(splitToken) != 2 {
				return RespUnathourized(c, "Invalid authorization", "Invalid authorization")
			}

			token, err := jwt.Parse(splitToken[1], func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
				return []byte(jwtKey), nil
			})

			if err != nil || !token.Valid {
				return RespUnathourized(c, "Invalid authorization", "Invalid authorization")
			}

			requestId := uuid.New().String()
			userId := fmt.Sprintf("%v", token.Claims.(jwt.MapClaims)["id"])
			email := fmt.Sprintf("%v", token.Claims.(jwt.MapClaims)["email"])
			name := fmt.Sprintf("%v", token.Claims.(jwt.MapClaims)["name"])
			phone := fmt.Sprintf("%v", token.Claims.(jwt.MapClaims)["phone"])

			tokenUserId, _ := strconv.Atoi(userId)

			var metaData = metaData{
				RequestId:     requestId,
				Host:          c.Request().Host,
				UserId:        tokenUserId,
				Email:         email,
				Phone:         phone,
				Name:          name,
				Token:         c.Request().Header.Get("Authorization"),
				RequestedPath: c.Request().URL.Path,
				UserAgent:     c.Request().Header.Get("User-Agent"),
			}

			c.Set("metaData", metaData)

			helpers.PrettyPrint("metaData", metaData)

			return next(c)
		}
	}
}
