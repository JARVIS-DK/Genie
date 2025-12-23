package chat

import (
	env "apps/genie-backend/config"
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
