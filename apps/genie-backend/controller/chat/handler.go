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

	return shared.RespSuccess(c, "Image generated successfully", serviceResponse)
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

func (h *handler) GenerateVideo(c echo.Context) error {

	var metaData shared.ApiMetaData
	shared.JsonMarshaller(c.Get("metaData"), &metaData)
	var data GenerateVideoDto
	err := c.Bind(&data)
	if err != nil {
		fmt.Println("error in binding request body", err)
		return shared.RespFailure(c, "Invalid request body", err.Error())
	}

	serviceResponse, err := h.service.GenerateVideo(metaData, data)
	if err != nil {
		fmt.Println("error in executing chat", err)
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}

	return shared.RespSuccess(c, "Video generated successfully", serviceResponse)
}

func (h *handler) GetGeneratedVideos(c echo.Context) error {

	var metaData shared.ApiMetaData
	shared.JsonMarshaller(c.Get("metaData"), &metaData)

	serviceResponse, err := h.service.GetGeneratedVideos(metaData)
	if err != nil {
		fmt.Println("error in geting images", err)
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}

	return shared.RespSuccess(c, "Generated Images Fetch Successful", serviceResponse)

}

func (h *handler) GenerateAudio(c echo.Context) error {

	var metaData shared.ApiMetaData
	shared.JsonMarshaller(c.Get("metaData"), &metaData)
	var data GenerateAudioDto
	err := c.Bind(&data)
	if err != nil {
		fmt.Println("error in binding request body", err)
		return shared.RespFailure(c, "Invalid request body", err.Error())
	}

	serviceResponse, err := h.service.GenerateAudio(metaData, data)
	if err != nil {
		fmt.Println("error in executing chat", err)
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}

	return shared.RespSuccess(c, "Audio generated successfully", serviceResponse)
}

func (h *handler) GetGeneratedAudios(c echo.Context) error {

	var metaData shared.ApiMetaData
	shared.JsonMarshaller(c.Get("metaData"), &metaData)

	serviceResponse, err := h.service.GetGeneratedAudios(metaData)
	if err != nil {
		fmt.Println("error in geting audios", err)
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}

	return shared.RespSuccess(c, "Generated Audios Fetch Successful", serviceResponse)

}

// DownloadProxy streams a remote image through the backend so front-end can trigger a direct download without CORS restrictions.
func (h *handler) DownloadProxy(c echo.Context) error {
	var body struct {
		Url string `json:"url"`
	}
	if err := c.Bind(&body); err != nil {
		return shared.RespFailure(c, "Invalid request body", err.Error())
	}
	if body.Url == "" {
		return shared.RespFailure(c, "url is required", nil)
	}

	var metaData shared.ApiMetaData
	shared.JsonMarshaller(c.Get("metaData"), &metaData)

	content, contentType, filename, err := h.service.ProxyDownload(metaData, body.Url)
	if err != nil {
		fmt.Println("error in proxy download", err)
		return shared.RespFailure(c, "Failed to fetch remote resource", err.Error())
	}

	// Set attachment header so browser downloads the file
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	return c.Blob(200, contentType, content)
}
