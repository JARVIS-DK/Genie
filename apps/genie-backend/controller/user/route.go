package user

import (
	env "apps/genie-backend/config"

	"fmt"

	"github.com/labstack/echo/v4"

	shared "libs/shared"
)

func (h *handler) Route(g *echo.Group) {

	authKey := fmt.Sprintf("%s", env.GlobalEnv["JWT_ACCESS_TOKEN_KEY"])
	mongoCredentials := env.GlobalEnv["MONGO_CREDENTIAL"]

	g.POST("/register", h.Register)
	g.POST("/login", h.Login)
	g.POST("/get-access-token", h.GetAccessToken)
	g.POST("/update-password", h.UpdatePassword, shared.AuthorizationCheck(authKey, mongoCredentials))

}
