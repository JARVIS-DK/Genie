package chat

import (
	env "apps/genie-backend/config"
	"fmt"
	"libs/shared"

	"github.com/labstack/echo/v4"
)

func (h *handler) Route(g *echo.Group) {
	authKey := fmt.Sprintf("%v", env.GlobalEnv["JWT_ACCESS_TOKEN_KEY"])
	mongoCredential := env.GlobalEnv["MONGO_CREDENTIAL"]

	g.POST("/execute", h.Execute, shared.AuthorizationCheck(authKey, mongoCredential))
	g.GET("/get-conversations", h.GetConversations, shared.AuthorizationCheck(authKey, mongoCredential))
	g.GET("/get-chat-history/:conversation_id", h.GetChatHistory, shared.AuthorizationCheck(authKey, mongoCredential))
	g.POST("/rename-conversation", h.RenameConversation, shared.AuthorizationCheck(authKey, mongoCredential))
	g.GET("/delete-conversation/:conversation_id", h.DeleteConversation, shared.AuthorizationCheck(authKey, mongoCredential))
	// g.POST("/file-upload", h.FileUpload, shared.AuthorizationCheck(authKey, mongoCredential))

	g.POST("/execute/generate-image", h.GenerateImage, shared.AuthorizationCheck(authKey, mongoCredential))
	g.GET("/get-generated-images", h.GetGeneratedImages, shared.AuthorizationCheck(authKey, mongoCredential))
	g.POST("/execute/generate-video", h.GenerateVideo, shared.AuthorizationCheck(authKey, mongoCredential))
	g.GET("/get-generated-videos", h.GetGeneratedVideos, shared.AuthorizationCheck(authKey, mongoCredential))

	// g.POST("execute/deep-search")
}
