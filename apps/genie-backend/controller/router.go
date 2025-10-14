package controller

import (
	user "apps/genie-backend/controller/user"
	"net/http"

	"github.com/labstack/echo/v4"
)

func Init(g *echo.Group) {
	g.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "Hello, World!")
	})

	user.NewHandler().Route(g.Group("/user"))
}
