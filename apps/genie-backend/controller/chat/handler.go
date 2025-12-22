package chat

import (
	"fmt"
	shared "libs/shared"

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

func (h *handler) Execute(c echo.Context) error {

	origin := c.Request().Header.Get("Origin")
	if origin == "" {
		return shared.RespFailure(c, "Origin is required in headers", nil)
	}
	metaData := shared.ApiMetaData{}
	shared.JsonMarshaller(c.Get("metaData"), &metaData)
	var data ExecuteRequestDto
	err := c.Bind(&data)

	if err != nil {
		fmt.Println("error in binding request body", err)
		return shared.RespFailure(c, "Invalid request body", err.Error())
	}

	// serviceResponse, err := h.service.Execute(metaData, data)
	serviceResponse, err := h.service.Execute(metaData, data, "GENERATE_IMAGE")
	if err != nil {
		fmt.Println("error in executing chat", err)
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}

	return shared.RespSuccess(c, "Chat executed successfully", serviceResponse)
}

func (h *handler) GetConversations(c echo.Context) error {
	origin := c.Request().Header.Get("Origin")
	if origin == "" {
		return shared.RespFailure(c, "Origin is required in headers", nil)
	}
	metaData := shared.ApiMetaData{}
	shared.JsonMarshaller(c.Get("metaData"), &metaData)

	serviceResponse, err := h.service.GetConversations(metaData)
	if err != nil {
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}

	return shared.RespSuccess(c, "Conversations fetched successfully", serviceResponse)
}

func (h *handler) GetChatHistory(c echo.Context) error {
	origin := c.Request().Header.Get("Origin")
	if origin == "" {
		return shared.RespFailure(c, "Origin is required in headers", nil)
	}
	metaData := shared.ApiMetaData{}
	shared.JsonMarshaller(c.Get("metaData"), &metaData)

	serviceResponse, err := h.service.GetChatHistory(metaData, c.Param("conversation_id"))
	if err != nil {
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}

	return shared.RespSuccess(c, "Chat history fetched successfully", serviceResponse)
}

func (h *handler) FileUpload(c echo.Context) error {
	origin := c.Request().Header.Get("Origin")
	if origin == "" {
		return shared.RespFailure(c, "Origin is required in headers", nil)
	}
	metaData := shared.ApiMetaData{}
	shared.JsonMarshaller(c.Get("metaData"), &metaData)

	return shared.RespSuccess(c, "File uploaded successfully", nil)
}

func (h *handler) RenameConversation(c echo.Context) error {
	origin := c.Request().Header.Get("Origin")
	if origin == "" {
		return shared.RespFailure(c, "Origin is required in headers", nil)
	}
	metaData := shared.ApiMetaData{}
	shared.JsonMarshaller(c.Get("metaData"), &metaData)
	var data RenameConversationRequestDto
	err := c.Bind(&data)

	if err != nil {
		fmt.Println("error in binding request body", err)
		return shared.RespFailure(c, "Invalid request body", err.Error())
	}

	serviceResponse, err := h.service.RenameConversation(metaData, data)
	if err != nil {
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}

	return shared.RespSuccess(c, "Conversation renamed successfully", serviceResponse)
}

func (h *handler) DeleteConversation(c echo.Context) error {
	origin := c.Request().Header.Get("Origin")
	if origin == "" {
		return shared.RespFailure(c, "Origin is required in headers", nil)
	}
	metaData := shared.ApiMetaData{}
	shared.JsonMarshaller(c.Get("metaData"), &metaData)

	serviceResponse, err := h.service.DeleteConversation(metaData, c.Param("conversation_id"))
	if err != nil {
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}

	return shared.RespSuccess(c, "Conversation deleted successfully", serviceResponse)
}

func (h *handler) GenerateImage(c echo.Context) error {

	var metaData shared.ApiMetaData
	shared.JsonMarshaller(c.Get("metaData"), &metaData)
	var data GenerateImageDto
	err := c.Bind(&data)
	if err != nil {
		fmt.Println("error in binding request body", err)
		return shared.RespFailure(c, "Invalid request body", err.Error())
	}

	serviceResponse, err := h.service.GenerateImage(metaData, data)
	if err != nil {
		fmt.Println("error in executing chat", err)
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}

	return shared.RespSuccess(c, "Chat executed successfully", serviceResponse)
}

func (h *handler) GetGeneratedImages(c echo.Context) error {

	var metaData shared.ApiMetaData
	shared.JsonMarshaller(c.Get("metaData"), &metaData)

	serviceResponse, err := h.service.GetGeneratedImages(metaData)
	if err != nil {
		fmt.Println("error in geting images", err)
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}

	return shared.RespSuccess(c, "Generated Images Fetch Successful", serviceResponse)

}
