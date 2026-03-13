package chats

import (
	env "apps/genie-backend/config"
	"apps/genie-backend/controller/chats/models"
	"errors"
	"fmt"
	"libs/shared"
	"libs/shared/db_connectors/model"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
)

func UpdateConversation(metaData shared.ApiMetaData, request models.ExecuteRequestDto, response models.ExecuteResponseDto) error {

	fmt.Println("\n\nUpdateConversation Start")
	// get current time
	Time := time.Now().UTC()

	ConversationCollectionName := model.CollectionName["CONVERSATION_HISTORY"]

	fmt.Println("MetaData in UpdateConversation: ", metaData)
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

	fmt.Println("\n\nUpdateConversation End")
	return nil
}

func UpdateChatHistory(metaData shared.ApiMetaData, request models.ExecuteRequestDto, response models.ExecuteResponseDto) error {
	fmt.Println("\n\nUpdateChatHistory Start")
	// get current time
	Time := time.Now().UTC()

	incomingFiles := []models.File{}
	for _, f := range request.Files {
		incomingFiles = append(incomingFiles, f)
	}

	botName := "assistant"
	if request.OptionalAgent == "browser_use" {
		botName = "browser_use"
	}

	UserMessage := models.ChatMessage{
		Message:      request.Message,
		AgentResults: []models.AgentsExecutedResults{},
		Role:         "user",
		Files:        incomingFiles,
		CreatedAt:    Time,
		UpdatedAt:    Time,
	}

	BotMessage := models.ChatMessage{
		Message:      response.Message,
		AgentResults: response.AgentsExecutedResults,
		Steps:        response.Steps,
		Role:         botName,
		Files:        []models.File{},
		CreatedAt:    Time,
		UpdatedAt:    Time,
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

		history := make(models.DailyHistory)
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
	fmt.Println("\n\nUpdateChatHistory End")
	// =============================== create chat history ends ===============================
	return nil
}

func AddMessageToHistory(history models.DailyHistory, message models.ChatMessage) models.DailyHistory {
	dateKey := message.CreatedAt.Format("02-01-2006") // DD-MM-YYYY format
	if history == nil {
		history = make(models.DailyHistory)
	}
	// Preserve existing messages for the date and append new one
	if existingMessages, exists := history[dateKey]; exists {
		history[dateKey] = append(existingMessages, message)
	} else {
		history[dateKey] = []models.ChatMessage{message}
	}
	return history
}
