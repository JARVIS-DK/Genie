package controller

import (
	chat "apps/genie-backend/controller/chat"
	chats "apps/genie-backend/controller/chats"
	user "apps/genie-backend/controller/user"

	"net/http"

	"github.com/labstack/echo/v4"
)

func Init(g *echo.Group) {
	g.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "GET request received")
	})
	g.POST("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "POST request received")
	})

	user.NewHandler().Route(g.Group("/user"))
	chat.NewHandler().Route(g.Group("/chat"))
	chats.NewHandler().Route(g.Group("/chats"))
}
