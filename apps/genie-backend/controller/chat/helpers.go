package chat

import (
	env "apps/opsMatrix-backend/config"
	"apps/opsMatrix-backend/controller/chat/agents"
	"apps/opsMatrix-backend/controller/chat/agents/audio_generation"
	"apps/opsMatrix-backend/controller/chat/agents/deep_research"
	image_generation "apps/opsMatrix-backend/controller/chat/agents/image_generation"
	prompt_generator "apps/opsMatrix-backend/controller/chat/agents/prompt_generator"
	"apps/opsMatrix-backend/controller/chat/agents/video_generation"
	"encoding/json"
	"errors"
	"fmt"
	"libs/shared"
	"libs/shared/db_connectors/model"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
)

func UpdateConversation(metaData shared.ApiMetaData, request ExecuteRequestDto, response ExecuteResponseDto) error {

	fmt.Println("\n\nUpdateConversation Start")
	// get current time
	Time := time.Now().UTC()

	ConversationCollectionName := model.CollectionName["CONVERSATION_HISTORY"]

	fmt.Println("Meata Data in UpdateConversation: ", metaData)
	filterQuery := map[string]interface{}{
		"user_id":         metaData.UserId,
		"conversation_id": request.ConversationId,
		"is_deleted":      false,
	}
	fmt.Println("Filter Query in UpdateConversation: ", filterQuery)

	existingRecord, err := shared.MongoRepository().GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], ConversationCollectionName, filterQuery)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return fmt.Errorf("failed to get conversation: %v", err.Error())
	}

	// If no record exists, create a new one
	if existingRecord == nil {

		createPayload := map[string]interface{}{
			"user_id":           metaData.UserId,
			"conversation_id":   request.ConversationId,
			"conversation_name": "Untitled Conversation",
			"created_at":        Time,
			"updated_at":        Time,
			"is_deleted":        false,
		}

		_, err := shared.MongoRepository().CreateOne(env.GlobalEnv["MONGO_CREDENTIAL"], ConversationCollectionName, createPayload)
		if err != nil {
			return fmt.Errorf("failed to create conversation: %v", err.Error())
		}
	} else {
		updatePayload := map[string]interface{}{
			"updated_at": Time,
		}
		_, err := shared.MongoRepository().UpdateOne(env.GlobalEnv["MONGO_CREDENTIAL"], ConversationCollectionName, updatePayload, filterQuery)
		if err != nil {
			return fmt.Errorf("failed to update conversation: %v", err.Error())
		}
	}

	fmt.Println("\n\nUpdateConversation End\n\n")
	return nil
}

func UpdateChatHistory(metaData shared.ApiMetaData, request ExecuteRequestDto, response ExecuteResponseDto) error {
	fmt.Println("\n\nUpdateChatHistory Start")
	// get current time
	Time := time.Now().UTC()

	UserMessage := ChatMessage{
		Message:               request.Query,
		AgentsExecutedResults: nil,
		Role:                  "user",
		Files:                 request.Files,
		CreatedAt:             Time,
		UpdatedAt:             Time,
	}

	BotMessage := ChatMessage{
		Message:               response.Message,
		AgentsExecutedResults: response.AgentsExecutedResults,
		Role:                  "assistant",
		Files:                 []File{},
		CreatedAt:             Time,
		UpdatedAt:             Time,
	}

	ChatHistoryCollectionName := model.CollectionName["CHAT_HISTORY"]

	// =============================== create chat history starts ===============================
	dateKey := Time.Format("02-01-2006")

	filterQuery := map[string]interface{}{
		"user_id":         metaData.UserId,
		"conversation_id": request.ConversationId,
	}

	existingRecord, err := shared.MongoRepository().GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], ChatHistoryCollectionName, filterQuery)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return fmt.Errorf("failed to get chat history: %v", err.Error())
	}

	// If no record exists, create a new one
	if existingRecord == nil {

		history := make(DailyHistory)
		history = AddMessageToHistory(history, UserMessage)
		history = AddMessageToHistory(history, BotMessage)

		createPayload := map[string]interface{}{
			"user_id":           metaData.UserId,
			"conversation_id":   request.ConversationId,
			"conversation_name": "Untitled Conversation",
			"available_dates":   []string{dateKey},
			"history":           history,
			"created_at":        Time,
			"updated_at":        Time,
		}

		_, err := shared.MongoRepository().CreateOne(env.GlobalEnv["MONGO_CREDENTIAL"], ChatHistoryCollectionName, createPayload)
		if err != nil {
			return fmt.Errorf("failed to create chat history: %v", err.Error())
		}
	} else {
		updatePayload := map[string]interface{}{
			"$push": map[string]interface{}{
				"history." + dateKey: map[string]interface{}{
					"$each": []interface{}{UserMessage, BotMessage},
				},
			},
		}

		updatePayload["updated_at"] = Time
		updatePayload["$addToSet"] = map[string]interface{}{
			"available_dates": dateKey,
		}

		_, err := shared.MongoRepository().UpdateOne(env.GlobalEnv["MONGO_CREDENTIAL"], ChatHistoryCollectionName, updatePayload, filterQuery)
		if err != nil {
			return fmt.Errorf("failed to update chat history: %v", err.Error())
		}
	}
	fmt.Println("\n\nUpdateChatHistory End\n\n")
	// =============================== create chat history ends ===============================
	return nil
}

func AddMessageToHistory(history DailyHistory, message ChatMessage) DailyHistory {
	dateKey := message.CreatedAt.Format("02-01-2006") // DD-MM-YYYY format
	if history == nil {
		history = make(DailyHistory)
	}
	// Preserve existing messages for the date and append new one
	if existingMessages, exists := history[dateKey]; exists {
		history[dateKey] = append(existingMessages, message)
	} else {
		history[dateKey] = []ChatMessage{message}
	}
	return history
}

// func Base64ToGoogleBlob(base64String *string) (string, error) {

// 	ctx := context.Background()
// 	client, err := storage.NewClient(ctx, option.WithCredentialsFile("config/service_account.json"))
// 	if err != nil {
// 		return "", err
// 	}
// 	defer client.Close()

// 	//Decode base64 string
// 	parts := strings.Split(*base64String, ",")
// 	dataPart := parts[len(parts)-1]
// 	// mimeType := parts[0]
// 	decoded, err := base64.StdEncoding.DecodeString(dataPart)
// 	if err != nil {
// 		return "", err
// 	}

// 	//Upload to Google Cloud Storage
// 	bucketName := env.GlobalEnv["GOOGLE_CLOUD_STORAGE_BUCKET_NAME"].(string)
// 	objectName := "images/" + time.Now().Format("20060102") + "/" + time.Now().Format("150405") + ".png"
// 	fmt.Println("before writer")
// 	wc := client.Bucket(bucketName).Object(objectName).NewWriter(ctx)
// 	fmt.Println("after writer")

// 	if _, err := io.Copy(wc, bytes.NewReader(decoded)); err != nil {
// 		fmt.Println("error in uploading image to google cloud storage", err)
// 		return "", err
// 	}
// 	if err := wc.Close(); err != nil {
// 		fmt.Println("error in closing writer", err)
// 		return "", err
// 	}

// 	// if err := client.Bucket(bucketName).Object(objectName).ACL().Set(ctx, storage.AllUsers, storage.RoleReader); err != nil {
// 	// 	return "", err
// 	// }

// 	publicUrl := fmt.Sprintf("https://storage.googleapis.com/%s/%s", bucketName, objectName)

// 	return publicUrl, nil
// 	// return "", nil
// }

func DecomposeAgentSelection(query string, optional_agent string, db shared.MongoRepositoryFunctions) []string {

	apiKeyCollectionName := model.CollectionName["API_KEYS"]
	apiKeyFilterQuery := map[string]interface{}{
		"code": "DECOMPOSER_AGENT_KEY",
	}

	// Resolve API key: prefer value from DB, fall back to provided apiKey param
	resolvedAPIKey := ""
	if db != nil {
		existingRecord, err := db.GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], apiKeyCollectionName, apiKeyFilterQuery)
		if err == nil && existingRecord != nil {
			var existingRecordMap map[string]interface{}
			shared.JsonMarshaller(existingRecord, &existingRecordMap)
			if v, ok := existingRecordMap["api_key"]; ok {
				if s, ok2 := v.(string); ok2 && s != "" {
					resolvedAPIKey = s
				}
			}
		}
	}

	if resolvedAPIKey == "" {
		return nil
	}

	availableAgents := "Available Agents: "
	for _, agent := range agents.AgentsList {
		agentDetails := fmt.Sprintf("Agent Name: %s, Agent Code: %s, Agent Description: %s\n", agent.AgentName, agent.AgentCode, agent.AgentDescription)
		availableAgents += agentDetails
	}
	for _, agent := range agents.OptionalAgentsList {
		if optional_agent == agent.AgentCode {
			agentDetails := fmt.Sprintf("Agent Name: %s, Agent Code: %s, Agent Description: %s\n", agent.AgentName, agent.AgentCode, agent.AgentDescription)
			availableAgents += agentDetails
		}
	}

	availableAgentsWithUserQuery := availableAgents + fmt.Sprintf("\n\nUSER: %s", query)

	geminiResponse, err := prompt_generator.Gemini(availableAgentsWithUserQuery, "DECOMPOSE_AGENT_SELECTION", resolvedAPIKey)
	if err != nil {
		return nil
	}

	geminiResponseJson := map[string]interface{}{}
	err = json.Unmarshal([]byte(geminiResponse), &geminiResponseJson)
	if err != nil {
		return nil
	}

	// Extract selected_agents as []string safely
	saAny, ok := geminiResponseJson["selected_agents"]
	if !ok {
		return nil
	}

	saSlice, ok := saAny.([]interface{})
	if !ok {
		return nil
	}

	results := make([]string, 0, len(saSlice))
	for _, v := range saSlice {
		if s, ok := v.(string); ok && s != "" {
			results = append(results, s)
		}
	}
	return results
}

func ExecuteAgents(query string, selectedAgents []string, db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData) (string, error) {

	apiKeyCollectionName := model.CollectionName["API_KEYS"]
	apiKeyFilterQuery := map[string]interface{}{
		"code": "PARAMETER_GETTING_AGENT_KEY",
	}

	dbResponse, err := db.GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], apiKeyCollectionName, apiKeyFilterQuery)
	if err != nil {
		return "", err
	}
	var dbResponseMap map[string]interface{}
	shared.JsonMarshaller(dbResponse, &dbResponseMap)
	apiKey := dbResponseMap["api_key"].(string)
	executedAgents := ""
	for _, agent := range selectedAgents {
		if agent == "IMAGE_GENERATION" {

			prompt := fmt.Sprintf(
				"Payload Structure:{\n"+
					"  \"query\": \"<user_image_description>\",\n"+
					"  \"image_model\": \"gemini-3-pro-image-preview\",\n"+
					"  \"image_size\": \"1K\",\n"+
					"  \"aspect_ratio\": \"1:1\",\n"+
					"  \"number_of_images\": 1\n"+
					"}",
				"USER_QUERY: %s\n\n",
				query,
			)

			generatePayload, err := prompt_generator.Gemini(prompt, "PARAMETER_GETTING", apiKey)
			if err != nil {
				return "", err
			}
			generatePayloadMap := map[string]interface{}{}
			err = json.Unmarshal([]byte(generatePayload), &generatePayloadMap)
			if err != nil {
				return "", err
			}
			payload := image_generation.GeminiImageGenerationRequest{
				Query:          generatePayloadMap["query"].(string),
				ImageModel:     generatePayloadMap["image_model"].(string),
				ImageSize:      generatePayloadMap["image_size"].(string),
				AspectRatio:    generatePayloadMap["aspect_ratio"].(string),
				NumberofImages: int(generatePayloadMap["number_of_images"].(float64)),
			}
			imageGenerationResponse, err := image_generation.GeminiImageGeneration(payload, db, metaData)
			if err != nil {
				return "", err
			}
			response := imageGenerationResponse.Data["image_urls"].([]string)
			executedAgents += fmt.Sprintf("Response from Image Generation Agent :%v\n", response)
		} else if agent == "VIDEO_GENERATION" {
			videoReq := video_generation.GoogleVideoGenerationRequest{
				Query:              query,
				VideoModel:         "veo-3.1-fast-generate-preview",
				WantEnhancedPrompt: true,
			}
			videoResp, err := video_generation.GoogleVideoGeneration(videoReq, db, metaData)
			if err != nil {
				return "", err
			}
			// Expect Data to contain "video_url"
			if urlAny, ok := videoResp.Data["video_url"]; ok {
				executedAgents += fmt.Sprintf("Response from Video Generation Agent: %v\n", urlAny)
			} else {
				executedAgents += "Response from Video Generation Agent: video generated but URL missing in response\n"
			}

		} else if agent == "PODCAST_GENERATION" {
			audioReq := audio_generation.GoogleAudioGenerationRequest{
				Query: query,
			}
			audioResp, err := audio_generation.GoogleAudioGeneration(audioReq, db, metaData)
			if err != nil {
				return "", err
			}
			// Expect Data to contain "audio_url" and optionally "image_url"
			audioURLAny := audioResp.Data["audio_url"]
			imageURLAny := audioResp.Data["image_url"]
			executedAgents += fmt.Sprintf(
				"Response from Podcast Generation Agent: audio=%v image=%v\n",
				audioURLAny,
				imageURLAny,
			)

		} else if agent == "CODE_GENERATOR_AND_DEBUGGER" {
			apiKeyCollectionName := model.CollectionName["API_KEYS"]
			apiKeyFilterQuery := map[string]interface{}{
				"code": "CODE_GENERATOR_AND_DEBUGGER_AGENT_KEY",
			}
			dbResp, err := db.GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], apiKeyCollectionName, apiKeyFilterQuery)
			if err != nil {
				return "", err
			}
			var dbRespMap map[string]interface{}
			shared.JsonMarshaller(dbResp, &dbRespMap)
			apiKey := dbRespMap["api_key"].(string)
			geminiResponse, err := prompt_generator.Gemini(query, "CODE_GENERATOR_AND_DEBUGGER", apiKey)
			if err != nil {
				return "", err
			}
			executedAgents += fmt.Sprintf("Response from Code Generator & Debugger Agent: %v\n", geminiResponse)

		} else if agent == "DEEP_RESEARCH" {
			apiKeyCollectionName := model.CollectionName["API_KEYS"]
			apiKeyFilterQuery := map[string]interface{}{
				"code": "JINA_DEEP_SEARCH",
			}
			dbResp, err := db.GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], apiKeyCollectionName, apiKeyFilterQuery)
			if err != nil {
				return "", err
			}
			var dbRespMap map[string]interface{}
			shared.JsonMarshaller(dbResp, &dbRespMap)
			apiKey := dbRespMap["api_key"].(string)
			deepResearchResponse, err := deep_research.DeepResearch(query, apiKey)
			if err != nil {
				return "", err
			}
			executedAgents += fmt.Sprintf("Response from Deep Research Agent: %v\n", deepResearchResponse)

		} else if agent == "WEB_SEARCH" {
			apiKeyCollectionName := model.CollectionName["API_KEYS"]
			apiKeyFilterQuery := map[string]interface{}{
				"code": "WEB_SEARCH_AGENT_KEY",
			}
			dbResp, err := db.GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], apiKeyCollectionName, apiKeyFilterQuery)
			if err != nil {
				return "", err
			}
			var dbRespMap map[string]interface{}
			shared.JsonMarshaller(dbResp, &dbRespMap)
			apiKey := dbRespMap["api_key"].(string)
			geminiResponse, err := prompt_generator.Gemini1(query, apiKey)
			if err != nil {
				return "", err
			}
			executedAgents += fmt.Sprintf("Response from Web Search Agent: %v\n", geminiResponse)
		} else if agent == "SIMPLE_CHAT_BOT" {
			apiKeyCollectionName := model.CollectionName["API_KEYS"]
			apiKeyFilterQuery := map[string]interface{}{
				"code": "SIMPLE_CHAT_BOT",
			}
			dbResp, err := db.GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], apiKeyCollectionName, apiKeyFilterQuery)
			if err != nil {
				return "", err
			}
			var dbRespMap map[string]interface{}
			shared.JsonMarshaller(dbResp, &dbRespMap)
			apiKey := dbRespMap["api_key"].(string)
			geminiResponse, err := prompt_generator.Gemini(query, "SIMPLE_CHAT_BOT", apiKey)
			if err != nil {
				return "", err
			}
			executedAgents += fmt.Sprintf("Response from Web Search Agent: %v\n", geminiResponse)
		}

	}
	return executedAgents, nil
}

func MergeResponses(query string, db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData) (string, error) {

	apiKeyCollectionName := model.CollectionName["API_KEYS"]
	apiKeyFilterQuery := map[string]interface{}{
		"code": "MERGE_RESPONSE_API_KEY",
	}
	dbResp, err := db.GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], apiKeyCollectionName, apiKeyFilterQuery)
	if err != nil {
		return "", err
	}
	var dbRespMap map[string]interface{}
	shared.JsonMarshaller(dbResp, &dbRespMap)
	apiKey := dbRespMap["api_key"].(string)
	geminiResponse, err := prompt_generator.Gemini(query, "MERGE_RESPONSES", apiKey)
	if err != nil {
		return "", err
	}
	mergeResponse := fmt.Sprintf("%v", geminiResponse)

	return mergeResponse, nil
}
