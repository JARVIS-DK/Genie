package user

import (
	"github.com/labstack/echo/v4"
)

func (h *handler) Route(g *echo.Group) {

	g.POST("/register", h.Register, UserRegisterValidation)
	g.POST("/login", h.Login, UserLoginValidation)
	g.POST("/get-access-token", h.GetAccessToken, UserGetAccessTokenValidation)
	g.POST("/update-password", h.UpdatePassword)

}
