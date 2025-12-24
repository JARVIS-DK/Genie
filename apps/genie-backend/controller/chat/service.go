package chat

import (
	"errors"
	"fmt"
	"time"
	"net/http"
	"io"
	"regexp"
	"strings"

	env "apps/genie-backend/config"
	imageGeneration "apps/genie-backend/controller/chat/agents/image_generation"
	videoGeneration "apps/genie-backend/controller/chat/agents/video_generation"
	shared "libs/shared"
	model "libs/shared/db_connectors/model"

	"go.mongodb.org/mongo-driver/mongo"
)

type Service interface {
	Execute(metaData shared.ApiMetaData, data ExecuteRequestDto, QueryParam string) (interface{}, error)
	GetConversations(metaData shared.ApiMetaData) (interface{}, error)
	GetChatHistory(metaData shared.ApiMetaData, conversationId string) (interface{}, error)
	RenameConversation(metaData shared.ApiMetaData, data RenameConversationRequestDto) (interface{}, error)
	DeleteConversation(metaData shared.ApiMetaData, conversationId string) (interface{}, error)
	GenerateImage(metaData shared.ApiMetaData, data GenerateImageDto) (interface{}, error)
	GetGeneratedImages(metaData shared.ApiMetaData) (interface{}, error)
	GenerateVideo(metaData shared.ApiMetaData, data GenerateVideoDto) (interface{}, error)
	GetGeneratedVideos(metaData shared.ApiMetaData) (interface{}, error)
	// ProxyDownload fetches a remote resource and returns its bytes, content type and filename
	ProxyDownload(metaData shared.ApiMetaData, url string) ([]byte, string, string, error)
}

type service struct {
	db shared.MongoRepositoryFunctions
}

var newServiceObj *service

func NewService() *service {
	if newServiceObj != nil {
		return newServiceObj
	}

	new_db := shared.MongoRepository()

	newServiceObj = &service{new_db}
	return newServiceObj
}

func (s *service) Execute(metaData shared.ApiMetaData, data ExecuteRequestDto, QueryParam string) (interface{}, error) {

	var response ExecuteResponseDto
	if QueryParam == "GENERATE_IMAGE" {
		imageUrl, err := GoogleTextToImage(data.Query, s.db)
		if err != nil {
			fmt.Println("error in generating image", err)
			return nil, err
		}
		response.Message = fmt.Sprintf("![image](%s)", imageUrl)
	} else if QueryParam == "GENERATE_CODE" {
		// code, err := GoogleTextToCode(data.Query)
		// if err != nil {
		// 	return nil, err
		// }
		// response.Message = code
	}

	go UpdateConversation(metaData, data, response)
	go UpdateChatHistory(metaData, data, response)

	return response, nil
}

func toAgentsExecutedResults(arr []interface{}) []AgentsExecutedResults {
	results := make([]AgentsExecutedResults, 0, len(arr))
	for _, v := range arr {
		m, ok := v.(map[string]interface{})
		if !ok {
			continue
		}
		res := AgentsExecutedResults{
			AgentId:         fmt.Sprint(m["agent_id"]),
			AgentName:       fmt.Sprint(m["agent_name"]),
			AgentType:       fmt.Sprint(m["agent_type"]),
			AgentStatus:     fmt.Sprint(m["agent_status"]),
			Query:           fmt.Sprint(m["query"]),
			ResponseMessage: fmt.Sprint(m["response_message"]),
			ResponseError:   fmt.Sprint(m["response_error"]),
			StartedAt:       parseTime(m["started_at"]),
			CompletedAt:     parseTime(m["completed_at"]),
		}
		results = append(results, res)
	}
	return results
}

func parseTime(v interface{}) time.Time {
	s, ok := v.(string)
	if !ok || s == "" {
		return time.Time{}
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t
	}
	return time.Time{}
}

func (s *service) GetConversations(metaData shared.ApiMetaData) (interface{}, error) {
	ConversationCollectionName := model.CollectionName["CONVERSATION_HISTORY"]
	filterQuery := map[string]interface{}{
		"user_id":    metaData.UserId,
		"is_deleted": false,
	}

	existingRecord, err := s.db.GetMany(env.GlobalEnv["MONGO_CREDENTIAL"], ConversationCollectionName, filterQuery)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		fmt.Println("error in getting conversation", err)
		return nil, fmt.Errorf("failed to get conversation: %v", err.Error())
	}

	if existingRecord == nil {
		return nil, nil
	}
	return existingRecord, nil
}

func (s *service) GetChatHistory(metaData shared.ApiMetaData, conversationId string) (interface{}, error) {
	ChatHistoryCollectionName := model.CollectionName["CHAT_HISTORY"]
	filterQuery := map[string]interface{}{
		"user_id":         metaData.UserId,
		"conversation_id": conversationId,
	}

	existingRecord, err := s.db.GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], ChatHistoryCollectionName, filterQuery)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return nil, fmt.Errorf("failed to get chat history: %v", err.Error())
	}

	if existingRecord == nil {
		return nil, nil
	}

	return existingRecord, nil
}

func (s *service) RenameConversation(metaData shared.ApiMetaData, data RenameConversationRequestDto) (interface{}, error) {
	ConversationCollectionName := model.CollectionName["CONVERSATION_HISTORY"]
	filterQuery := map[string]interface{}{
		"user_id":         metaData.UserId,
		"conversation_id": data.ConversationId,
	}
	updateQuery := map[string]interface{}{
		"conversation_name": data.Name,
	}

	existingRecord, err := s.db.UpdateOne(env.GlobalEnv["MONGO_CREDENTIAL"], ConversationCollectionName, updateQuery, filterQuery)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return nil, fmt.Errorf("failed to rename conversation: %v", err.Error())
	}

	if existingRecord == nil {
		return nil, nil
	}

	var response = map[string]interface{}{
		"message": "Conversation renamed successfully!",
	}

	return response, nil
}

func (s *service) DeleteConversation(metaData shared.ApiMetaData, conversationId string) (interface{}, error) {
	ConversationCollectionName := model.CollectionName["CONVERSATION_HISTORY"]
	filterQuery := map[string]interface{}{
		"user_id":         metaData.UserId,
		"conversation_id": conversationId,
	}
	updateQuery := map[string]interface{}{
		"is_deleted": true,
	}

	existingRecord, err := s.db.UpdateOne(env.GlobalEnv["MONGO_CREDENTIAL"], ConversationCollectionName, updateQuery, filterQuery)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return nil, fmt.Errorf("failed to delete conversation: %v", err.Error())
	}

	if existingRecord == nil {
		return nil, nil
	}

	var response = map[string]interface{}{
		"message": "Conversation deleted successfully!",
	}

	return response, nil
}

func (s *service) GenerateImage(metaData shared.ApiMetaData, data GenerateImageDto) (interface{}, error) {
	agentReq := imageGeneration.GeminiImageGenerationRequest{
		Query:          data.Query,
		ImageModel:     data.ImageModel,
		ImageSize:      data.ImageSize,
		AspectRatio:    data.AspectRatio,
		NumberofImages: data.NumberofImages,
		ImageUrls:      data.ImageUrls,
	}

	resp, err := imageGeneration.GeminiImageGeneration(agentReq, s.db, metaData)
	if err != nil {
		return nil, err
	}
	if !resp.Status {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, errors.New("image generation failed")
	}

	return resp, nil
}

func (s *service) GetGeneratedImages(metaData shared.ApiMetaData) (interface{}, error) {

	generatedImageHistoryCollectionName := model.CollectionName["IMAGE_GENERATION_HISTORY"]

	filterQuery := map[string]interface{}{
		"user_id": metaData.UserId,
	}

	existingRecord, err := s.db.GetMany(env.GlobalEnv["MONGO_CREDENTIAL"], generatedImageHistoryCollectionName, filterQuery)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return nil, fmt.Errorf("failed to get chat history: %v", err.Error())
	}

	if existingRecord == nil {
		return nil, nil
	}

	return existingRecord, nil

}

func (s *service) GenerateVideo(metaData shared.ApiMetaData, data GenerateVideoDto) (interface{}, error) {

	agentReq := videoGeneration.GoogleVideoGenerationRequest{
		Query:      data.Query,
		VideoModel: data.VideoModel,
	}

	resp, err := videoGeneration.GoogleVideoGeneration(agentReq, s.db, metaData)

	if err != nil {
		return nil, err
	}
	if !resp.Status {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, errors.New("image generation failed")
	}

	return resp, nil

}

func (s *service) GetGeneratedVideos(metaData shared.ApiMetaData) (interface{}, error) {

	generatedVideoHistoryCollectionName := model.CollectionName["VIDEO_GENERATION_HISTORY"]

	filterQuery := map[string]interface{}{
		"user_id": metaData.UserId,
	}

	existingRecord, err := s.db.GetMany(env.GlobalEnv["MONGO_CREDENTIAL"], generatedVideoHistoryCollectionName, filterQuery)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return nil, fmt.Errorf("failed to get chat history: %v", err.Error())
	}

	if existingRecord == nil {
		return nil, nil
	}

	return existingRecord, nil

}

// ProxyDownload fetches a remote resource and returns its bytes, content type and filename
func (s *service) ProxyDownload(metaData shared.ApiMetaData, url string) ([]byte, string, string, error) {
	// HTTP GET the remote URL
	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, "", "", err
	}
	// Set a sensible user agent
	req.Header.Set("User-Agent", "Genie-Download-Proxy/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, "", "", fmt.Errorf("remote server returned status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", "", err
	}

	contentType := resp.Header.Get("Content-Type")
	contentDisposition := resp.Header.Get("Content-Disposition")
	filename := deriveFilenameFromHeadersOrUrl(contentDisposition, url)

	if filename == "" {
		filename = fmt.Sprintf("download_%d", time.Now().Unix())
	}

	return data, contentType, filename, nil
}

func deriveFilenameFromHeadersOrUrl(contentDisposition, url string) string {
	// Try to parse filename from Content-Disposition if present
	if contentDisposition != "" {
		// naive parse: look for filename="..."
		re := regexp.MustCompile(`filename\*?=\"?([^;\"]+)\"?`)
		m := re.FindStringSubmatch(contentDisposition)
		if len(m) > 1 {
			return strings.Trim(m[1], `"`)
		}
	}

	// Fallback to filename from URL path
	parts := strings.Split(url, "/")
	if len(parts) > 0 {
		last := parts[len(parts)-1]
		if last != "" {
			return last
		}
	}
	return ""
}
