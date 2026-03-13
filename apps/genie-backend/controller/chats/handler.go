package chats

import (
	env "apps/genie-backend/config"
	"apps/genie-backend/controller/chats/models"
	"fmt"
	"libs/shared"
	"net/http"
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

	// Branch: streaming vs normal
	if c.QueryParam("is_stream") == "true" {
		return h.executeStream(c, metaData, data)
	}

	serviceResponse, err := h.service.Execute(metaData, data)
	if err != nil {
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}
	return shared.RespSuccess(c, "Chat executed successfully", serviceResponse.Data)
}

func (h *handler) executeStream(c echo.Context, metaData shared.ApiMetaData, data models.ExecuteRequestDto) error {
	c.Response().Header().Set("Content-Type", "text/event-stream")
	c.Response().Header().Set("Cache-Control", "no-cache")
	c.Response().Header().Set("Connection", "keep-alive")
	c.Response().Header().Set("X-Accel-Buffering", "no")
	c.Response().WriteHeader(http.StatusOK)

	flusher, ok := c.Response().Writer.(http.Flusher)
	if !ok {
		return shared.RespFailure(c, "Streaming not supported", nil)
	}
	flusher.Flush()

	sw := &models.StreamWriter{
		Writer:  c.Response().Writer,
		Flusher: flusher,
	}

	err := h.service.ExecuteStream(metaData, data, sw)
	if err != nil {
		sw.Send(models.StreamChunk{
			AgentName: "orchestrator",
			Message:   err.Error(),
			Status:    "COMPLETED",
		})
	}

	return nil
}

func (h *handler) ExecuteBrowserUse(c echo.Context) error {
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

	serviceResponse, err := h.service.ExecuteBrowserUse(metaData, data)
	if err != nil {
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}
	return shared.RespSuccess(c, "Chat executed successfully", serviceResponse.Data)
}


func (h *handler) ExecuteBrowserUseCancel(c echo.Context) error {
	origin := c.Request().Header.Get("Origin")
	if origin == "" {
		return shared.RespFailure(c, "Origin is required in headers", nil)
	}
	metaData := shared.ApiMetaData{}
	shared.JsonMarshaller(c.Get("metaData"), &metaData)

	var reqBody struct {
		TaskId         string `json:"task_id"`
		ConversationId string `json:"conversation_id"`
		Message        string `json:"message"`
	}
	if err := c.Bind(&reqBody); err != nil {
		return shared.RespFailure(c, "Invalid request body", err.Error())
	}

	if reqBody.TaskId == "" {
		return shared.RespFailure(c, "Task ID is required", nil)
	}

	data := models.ExecuteRequestDto{
		Message:        reqBody.Message,
		ConversationId: reqBody.ConversationId,
		OptionalAgent:  "browser_use",
	}

	serviceResponse, err := h.service.ExecuteBrowserUseCancel(metaData, data, reqBody.TaskId)
	if err != nil {
		return shared.RespFailure(c, "Internal Server Error", err.Error())
	}
	return shared.RespSuccess(c, "Browser use task cancelled successfully", serviceResponse.Data)
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
