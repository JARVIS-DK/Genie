package chat

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	env "apps/opsMatrix-backend/config"
	audioGeneration "apps/opsMatrix-backend/controller/chat/agents/audio_generation"
	imageGeneration "apps/opsMatrix-backend/controller/chat/agents/image_generation"
	prompt_generator "apps/opsMatrix-backend/controller/chat/agents/prompt_generator"
	videoGeneration "apps/opsMatrix-backend/controller/chat/agents/video_generation"
	shared "libs/shared"
	model "libs/shared/db_connectors/model"

	"go.mongodb.org/mongo-driver/mongo"
)

type Service interface {
	Execute(metaData shared.ApiMetaData, data ExecuteRequestDto) (interface{}, error)
	GetConversations(metaData shared.ApiMetaData) (interface{}, error)
	GetChatHistory(metaData shared.ApiMetaData, conversationId string) (interface{}, error)
	RenameConversation(metaData shared.ApiMetaData, data RenameConversationRequestDto) (interface{}, error)
	DeleteConversation(metaData shared.ApiMetaData, conversationId string) (interface{}, error)
	GenerateImage(metaData shared.ApiMetaData, data GenerateImageDto) (interface{}, error)
	GetGeneratedImages(metaData shared.ApiMetaData) (interface{}, error)
	GenerateVideo(metaData shared.ApiMetaData, data GenerateVideoDto) (interface{}, error)
	GetGeneratedVideos(metaData shared.ApiMetaData) (interface{}, error)
	GenerateAudio(metaData shared.ApiMetaData, data GenerateAudioDto) (interface{}, error)
	GetGeneratedAudios(metaData shared.ApiMetaData) (interface{}, error)
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

func (s *service) Execute(metaData shared.ApiMetaData, data ExecuteRequestDto) (interface{}, error) {

	var response ExecuteResponseDto

	apiKeyCollectionName := model.CollectionName["API_KEYS"]
	apiKeyFilterQuery := map[string]interface{}{
		"code": "GENERAL_CHAT_BOT",
	}

	dbResp, err := s.db.GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], apiKeyCollectionName, apiKeyFilterQuery)
	if err != nil {
		return nil, err
	}
	var dbRespMap map[string]interface{}
	shared.JsonMarshaller(dbResp, &dbRespMap)
	apiKey := dbRespMap["api_key"].(string)

	resp, err := prompt_generator.Gemini(data.Query, "GENERAL_CHAT_BOT", apiKey)
	if err != nil {
		return nil, err
	}

	jsonResp := map[string]interface{}{}
	err = json.Unmarshal([]byte(resp), &jsonResp)
	if err != nil {
		return nil, err
	}
	if isGeneral, ok := jsonResp["is_greeting"].(bool); ok && isGeneral {
		if msg, ok := jsonResp["message"].(string); ok && msg != "" {
			response.Message = msg
		} else {
			response.Message = "Super Agent not able to respond. Please try again later."
		}
	} else {

		selectedAgents := DecomposeAgentSelection(data.Query, data.OptionalAgent, s.db)
		if selectedAgents == nil {
			return nil, err
		}

		agentsExecutedResults, err := ExecuteAgents(data.Query, selectedAgents, s.db, metaData)
		if err != nil {
			return nil, err
		}

		mergeResponseQuery := fmt.Sprintf("User Query: %s \n Agents Selected: %s \n Executed Agents Results: %s", data.Query, strings.Join(selectedAgents, ", "), agentsExecutedResults)
		mergeResponseResults, err := MergeResponses(mergeResponseQuery, s.db, metaData)
		if err != nil {
			fmt.Println("mergeResp", err)
			return nil, err
		}

		response.Message = mergeResponseResults

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

func (s *service) GenerateAudio(metaData shared.ApiMetaData, data GenerateAudioDto) (interface{}, error) {

	agentReq := audioGeneration.GoogleAudioGenerationRequest{
		Query: data.Query,
	}
	resp, err := audioGeneration.GoogleAudioGeneration(agentReq, s.db, metaData)
	if err != nil {
		return nil, err
	}
	if !resp.Status {
		if resp.Error != nil {
			return nil, resp.Error
		}
		return nil, errors.New("audio generation failed")
	}

	return resp, nil
}

func (s *service) GetGeneratedAudios(metaData shared.ApiMetaData) (interface{}, error) {

	generatedVideoHistoryCollectionName := model.CollectionName["AUDIO_GENERATION_HISTORY"]

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
	req.Header.Set("User-Agent", "opsMatrix-Download-Proxy/1.0")

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
