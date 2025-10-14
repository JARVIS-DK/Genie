package user

import (
	shared "libs/shared"

	"github.com/labstack/echo/v4"
)

func UserRegisterValidation(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		var data UserRegisterRequestDto
		err := c.Bind(&data)
		if err != nil {
			validationErr := shared.BindErrorStructure(err)
			return shared.RespValidationFailure(c, "Invalid request body", validationErr)
		}
		return next(c)
	}
}

func UserLoginValidation(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		var data UserLoginRequestDto
		err := c.Bind(&data)
		if err != nil {
			validationErr := shared.BindErrorStructure(err)
			return shared.RespValidationFailure(c, "Invalid request body", validationErr)
		}
		return next(c)
	}
}

func UserGetAccessTokenValidation(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		var data UserGetAccessTokenRequestDto
		err := c.Bind(&data)
		if err != nil {
			validationErr := shared.BindErrorStructure(err)
			return shared.RespValidationFailure(c, "Invalid request body", validationErr)
		}
		return next(c)
	}
}
