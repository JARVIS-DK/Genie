package user

import (
	"strings"

	shared "libs/shared"

	model "libs/shared/db_connectors/model"

	echo "github.com/labstack/echo/v4"
)

type Handler interface {
}

type handler struct {
	service Service
}

var newHandlerObj *handler

func NewHandler() *handler {
	if newHandlerObj != nil {
		return newHandlerObj
	}
	newHandlerObj = &handler{
		service: NewService(),
	}
	return newHandlerObj
}

func (h *handler) Register(c echo.Context) error {

	var data UserRegisterRequestDto

	origin := c.Request().Header.Get("Origin")
	if origin == "" {
		return shared.RespFailure(c, "Origin is required in headers", nil)
	}

	metaData := shared.ApiMetaData{}
	shared.JsonMarshaller(c.Get("meta_data"), &metaData)
	err := c.Bind(&data)
	if err != nil {
		validationErr := shared.BindErrorStructure(err)
		return shared.RespValidationFailure(c, "Invalid request body", validationErr)
	}

	email := strings.ToLower(data.Email)
	email_filterQuery := map[string]interface{}{
		"email": email,
	}

	user_email_response, err := h.service.GetUser(metaData, email_filterQuery)

	if user_email_response != nil {
		var apiResp = "Email Already Exists!"
		shared.JsonMarshaller(user_email_response, &apiResp)

		return shared.RespFailure(c, apiResp, apiResp)
	}

	phone_filterQuery := map[string]interface{}{
		"phone": data.Phone,
	}

	user_phone_response, err := h.service.GetUser(metaData, phone_filterQuery)
	// if err != nil {
	// 	return shared.RespFailure(c, "Phone Number Already Exists!", err.Error())
	// }
	if user_phone_response != nil {
		var apiResp = "Phone Already Exists!"
		shared.JsonMarshaller(user_phone_response, &apiResp)
		return shared.RespFailure(c, apiResp, apiResp)
	}

	serviceResponse, err := h.service.Register(data, metaData)
	if err != nil {
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}

	return shared.RespSuccess(c, "User registered successfully", serviceResponse)
}

func (h *handler) Login(c echo.Context) error {

	origin := c.Request().Header.Get("Origin")
	if origin == "" {
		return shared.RespFailure(c, "Origin is required in headers", nil)
	}

	metaData := shared.ApiMetaData{}
	shared.JsonMarshaller(c.Get("meta_data"), &metaData)

	var data UserLoginRequestDto
	err := c.Bind(&data)
	if err != nil {
		return shared.RespFailure(c, "Invalid request body", err.Error())
	}
	email := strings.ToLower(data.Email)
	email_filterQuery := map[string]interface{}{
		"email": email,
	}
	serviceResponse, err := h.service.Login(metaData, data, email_filterQuery)
	if err != nil {
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}

	return shared.RespSuccess(c, "User logged in successfully", serviceResponse)
}

func (h *handler) GenerateAccessToken(c echo.Context) error {
	origin := c.Request().Header.Get("Origin")
	if origin == "" {
		return shared.RespFailure(c, "Origin is required in headers", nil)
	}
	metaData := shared.ApiMetaData{}
	shared.JsonMarshaller(c.Get("meta_data"), &metaData)
	var data UserGenerateAccessTokenRequestDto
	err := c.Bind(&data)
	if err != nil {
		return shared.RespFailure(c, "Invalid request body", err.Error())
	}

	email := strings.ToLower(data.Email)
	email_filterQuery := map[string]interface{}{
		"email": email,
	}

	userData, _ := h.service.GetUser(metaData, email_filterQuery)
	if userData == nil {
		return shared.RespFailure(c, "User not found", nil)
	}
	user := model.User{}
	shared.JsonMarshaller(userData, &user)
	serviceResponse, err := h.service.GenerateAccessToken(metaData, user)
	if err != nil {
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}

	response := map[string]interface{}{
		"access_token": serviceResponse,
	}

	return shared.RespSuccess(c, "Token refreshed successfully", response)
}

func (h *handler) UpdatePassword(c echo.Context) error {
	return shared.RespSuccess(c, "Password updated successfully", nil)
}
