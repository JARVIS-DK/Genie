package main

import (
	"fmt"
	"net/http"
	"os"

	"apps/genie-backend/config"
	backend "apps/genie-backend/controller"
	shared "libs/shared"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {

	e := echo.New()

	e.Use(
		middleware.Logger(),
		middleware.Recover(),
		middleware.CORSWithConfig(middleware.CORSConfig{
			AllowOrigins: []string{"*"},
			AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete},
		}),
		middleware.LoggerWithConfig(middleware.LoggerConfig{
			Format:           fmt.Sprintf("Genie : | ${host} | ${time_custom} | ${status} | ${latency_human} | ${remote_ip} | ${method} | ${uri} "),
			CustomTimeFormat: "2006-01-02 15:04:05",
			Output:           os.Stdout,
		}),
	)

	e.HTTPErrorHandler = shared.ErrorHandler
	// e.Validator = shared.NewValidator()
	e.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "Hello, World!")
	})

	e.GET("/health", func(c echo.Context) error {
		return c.String(http.StatusOK, "OK")
	})

	backend.Init(e.Group("/api/v1"))

	// Catch-all routes for unmatched requests (must be last)
	e.Any("*", func(c echo.Context) error {
		return shared.RespPageNotFound(c, "Page Not Found", "Page Not Found")
	})

	e.Logger.Fatal(e.Start(":" + config.GlobalEnv["PORT"].(string)))

}
