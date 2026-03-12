package chats

import (
	env "apps/genie-backend/config"
	"apps/genie-backend/controller/chats/models"
	"fmt"
	"libs/shared"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
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

	var data models.ExecuteRequestDto
	if req, ok := c.Get("executeRequest").(*models.ExecuteRequestDto); ok {
		data = *req
	} else {
		return shared.RespFailure(c, "Invalid request body", "Could not retrieve parsed request from context")
	}

	serviceResponse, err := h.service.Execute(metaData, data)
	if err != nil {
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}
	return shared.RespSuccess(c, "Chat executed successfully", serviceResponse.Data)
}

func (h *handler) GetConversationHistory(c echo.Context) error {
	origin := c.Request().Header.Get("Origin")
	if origin == "" {
		return shared.RespFailure(c, "Origin is required in headers", nil)
	}
	metaData := shared.ApiMetaData{}
	shared.JsonMarshaller(c.Get("metaData"), &metaData)

	serviceResponse, err := h.service.GetConversationHistory(metaData)
	if err != nil {
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}
	return shared.RespSuccess(c, "Conversation history retrieved successfully", serviceResponse)
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
	return shared.RespSuccess(c, "Chat history retrieved successfully", serviceResponse)
}

func (h *handler) RenameConversation(c echo.Context) error {
	origin := c.Request().Header.Get("Origin")
	if origin == "" {
		return shared.RespFailure(c, "Origin is required in headers", nil)
	}
	metaData := shared.ApiMetaData{}
	shared.JsonMarshaller(c.Get("metaData"), &metaData)

	serviceResponse, err := h.service.RenameConversation(metaData, c.Param("conversation_id"))
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

func (h *handler) FileUpload(c echo.Context) error {
	origin := c.Request().Header.Get("Origin")
	if origin == "" {
		return shared.RespFailure(c, "Origin is required in headers", nil)
	}
	metaData := shared.ApiMetaData{}
	shared.JsonMarshaller(c.Get("metaData"), &metaData)

	form, err := c.MultipartForm()
	if err != nil {
		return shared.RespFailure(c, "Failed to parse multipart form", err.Error())
	}

	files := form.File["files"]
	if len(files) == 0 {
		return shared.RespFailure(c, "No files provided", "Please upload at least one file using the 'files' field")
	}

	serviceAccountURL := fmt.Sprintf("%v", env.GlobalEnv["GOOGLE_SERVICE_ACCOUNT_URL"])
	bucketName := fmt.Sprintf("%v", env.GlobalEnv["GOOGLE_CLOUD_STORAGE_BUCKET_NAME"])

	uploadedFiles := []models.File{}

	for _, fileHeader := range files {
		src, err := fileHeader.Open()
		if err != nil {
			return shared.RespFailure(c, "Failed to open uploaded file", err.Error())
		}
		defer src.Close()

		ext := filepath.Ext(fileHeader.Filename)
		fileId := uuid.New().String()
		destinationName := fmt.Sprintf("uploads/%d/%s%s", metaData.UserId, fileId, ext)

		blobURL, size, err := shared.UploadToGCS(serviceAccountURL, bucketName, src, fileHeader.Header.Get("Content-Type"), destinationName)
		if err != nil {
			return shared.RespFailure(c, "Failed to upload file to cloud storage", err.Error())
		}

		uploadedFiles = append(uploadedFiles, models.File{
			Name: fileHeader.Filename,
			Path: blobURL,
			Type: fileHeader.Header.Get("Content-Type"),
			Size: size,
			Id:   fileId,
		})
	}

	return shared.RespSuccess(c, "Files uploaded successfully", uploadedFiles)
}
