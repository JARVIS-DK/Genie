package chats

import (
	env "apps/genie-backend/config"
	"fmt"
	"libs/shared"
	"net/http"

	"github.com/labstack/echo/v4"
)

func (h *handler) Route(g *echo.Group) {
	jwtKey := fmt.Sprintf("%v", env.GlobalEnv["JWT_ACCESS_TOKEN_KEY"])
	mongoCredential := env.GlobalEnv["MONGO_CREDENTIAL"]

	g.GET("", func(c echo.Context) error {
		return c.String(http.StatusOK, "GET request received in /chats API")
	})
	g.POST("", func(c echo.Context) error {
		return c.String(http.StatusOK, "POST request received in /chats API")
	})

	// execute agents
	g.POST("/execute", h.Execute, shared.AuthorizationCheck(jwtKey, mongoCredential), ValidateExecute)
	g.POST("/execute/browser-use", h.ExecuteBrowserUse, shared.AuthorizationCheck(jwtKey, mongoCredential), ValidateExecute)
	g.POST("/execute/browser-use-cancel", h.ExecuteBrowserUseCancel, shared.AuthorizationCheck(jwtKey, mongoCredential))

	// file upload
	g.POST("/file-upload", h.FileUpload, shared.AuthorizationCheck(jwtKey, mongoCredential))

	// conversations
	g.GET("/get-conversation-history", h.GetConversationHistory, shared.AuthorizationCheck(jwtKey, mongoCredential), ValidateGetConversations)
	g.GET("/get-chat-history/:conversation_id", h.GetChatHistory, shared.AuthorizationCheck(jwtKey, mongoCredential), ValidateGetChatHistory)
	g.POST("/rename-conversation", h.RenameConversation, shared.AuthorizationCheck(jwtKey, mongoCredential), ValidateRenameConversation)
	g.GET("/delete-conversation/:conversation_id", h.DeleteConversation, shared.AuthorizationCheck(jwtKey, mongoCredential), ValidateDeleteConversation)

	// g.POST("/execute", h.Execute, shared.AuthorizationCheck(authKey, mongoCredential))
	// // g.POST("/file-upload", h.FileUpload, shared.AuthorizationCheck(authKey, mongoCredential))

	// g.POST("/execute/generate-image", h.GenerateImage, shared.AuthorizationCheck(authKey, mongoCredential))
	// g.GET("/get-generated-images", h.GetGeneratedImages, shared.AuthorizationCheck(authKey, mongoCredential))
	// g.POST("/execute/generate-video", h.GenerateVideo, shared.AuthorizationCheck(authKey, mongoCredential))
	// g.GET("/get-generated-videos", h.GetGeneratedVideos, shared.AuthorizationCheck(authKey, mongoCredential))

	// // Proxy download endpoint to avoid CORS issues when clients download remote images
	// g.POST("/download-proxy", h.DownloadProxy, shared.AuthorizationCheck(authKey, mongoCredential))
	// g.POST("/execute/generate-audio", h.GenerateAudio, shared.AuthorizationCheck(authKey, mongoCredential))
	// g.GET("/get-generated-audios", h.GetGeneratedAudios, shared.AuthorizationCheck(authKey, mongoCredential))
}
