package video_generation

import (
	env "apps/opsMatrix-backend/config"
	promptGenerator "apps/opsMatrix-backend/controller/chat/agents/prompt_generator"
	"bytes"
	"context"
	"errors"
	"fmt"
	"libs/shared"
	"libs/shared/db_connectors/model"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"google.golang.org/genai"
)

func GoogleVideoGeneration(data GoogleVideoGenerationRequest, db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData) (shared.ResponseStruct, error) {

	apiKeysCollectionName := model.CollectionName["API_KEYS"]
	filterQuery := map[string]interface{}{
		"code": "GOOGLE_TEXT_TO_VIDEO_API_KEY",
	}
	existingRecord, err := db.GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], apiKeysCollectionName, filterQuery)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("error in getting api key: %v", err), Status: false}, err
	}
	if existingRecord == nil {
		return shared.ResponseStruct{Data: nil, Error: errors.New("API key not found"), Status: false}, nil
	}
	var existingRecordMap map[string]interface{}
	shared.JsonMarshaller(existingRecord, &existingRecordMap)

	apiKeyAny, ok := existingRecordMap["api_key"]
	if !ok {
		return shared.ResponseStruct{Data: nil, Error: errors.New("API key not found"), Status: false}, nil
	}

	title, enhancedQuery, err := promptGenerator.GenerateTitleAndEnhancedQuery(data.Query, "VIDEO_GENERATION", apiKeyAny.(string))
	if err != nil {
		return shared.ResponseStruct{Data: nil, Error: err, Status: false}, err
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKeyAny.(string),
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed to initialize genai client: %v", err), Status: false}, err
	}

	fmt.Println("Video generation started", data)

	prompt := enhancedQuery // `Drone shot following a classic red convertible driven by a man along a winding coastal road at sunset, waves crashing against the rocks below. The convertible accelerates fast and the engine roars loudly.`

	operation, err := client.Models.GenerateVideos(
		ctx,
		data.VideoModel,
		prompt,
		nil,
		nil,
	)
	if err != nil {
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed to start video generation: %v", err), Status: false}, err
	}
	if operation == nil {
		return shared.ResponseStruct{Data: nil, Error: errors.New("video generation operation is nil"), Status: false}, errors.New("video generation operation is nil")
	}

	// Poll the operation status until the video is ready.
	for operation != nil && !operation.Done {
		log.Println("Waiting for video generation to complete...")
		time.Sleep(10 * time.Second)
		operation, err = client.Operations.GetVideosOperation(ctx, operation, nil)
		if err != nil {
			return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed while polling video generation operation: %v", err), Status: false}, err
		}
	}

	if operation == nil || operation.Response == nil || len(operation.Response.GeneratedVideos) == 0 {
		return shared.ResponseStruct{Data: nil, Error: errors.New("no generated videos returned from operation"), Status: false}, errors.New("no generated videos returned from operation")
	}

	// Upload the generated video to Google Cloud Storage instead of local disk.
	video := operation.Response.GeneratedVideos[0]

	googleStorageBucketName, ok := env.GlobalEnv["GOOGLE_CLOUD_STORAGE_BUCKET_NAME"].(string)
	if !ok || googleStorageBucketName == "" {
		return shared.ResponseStruct{
			Data:   nil,
			Error:  errors.New("google cloud storage bucket name not configured"),
			Status: false,
		}, nil
	}

	googleServiceAccountURL, ok := env.GlobalEnv["GOOGLE_SERVICE_ACCOUNT_URL"].(string)
	if !ok || googleServiceAccountURL == "" {
		return shared.ResponseStruct{
			Data:   nil,
			Error:  errors.New("google service account url not configured"),
			Status: false,
		}, nil
	}

	fileName := fmt.Sprintf("generated_videos/%v.mp4", shared.GenerateRandomString(10))

	// Download the generated video content from Gemini and upload that to GCS.
	rc, err := client.Files.Download(ctx, video.Video, nil)
	if err != nil {
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed to download generated video: %v", err), Status: false}, err
	}

	videoBytes := rc
	if err != nil {
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed to read downloaded video bytes: %v", err), Status: false}, err
	}
	videoReader := bytes.NewReader(videoBytes)
	videoURL, _, uploadErr := shared.UploadToGCS(googleServiceAccountURL, googleStorageBucketName, videoReader, "video/mp4", fileName)
	if uploadErr != nil {
		return shared.ResponseStruct{
			Data:   nil,
			Error:  uploadErr,
			Status: false,
		}, uploadErr
	}

	log.Printf("Generated video saved to %s\n", videoURL)

	collectionName := model.CollectionName["VIDEO_GENERATION_HISTORY"]
	createPayload := map[string]interface{}{
		"video_url":      videoURL,
		"video_title":    title,
		"user_query":     data.Query,
		"enhanced_query": enhancedQuery,
		"user_id":        metaData.UserId,
		"created_at":     time.Now().UTC(),
	}

	_, err = db.CreateOne(env.GlobalEnv["MONGO_CREDENTIAL"], collectionName, createPayload)
	if err != nil {
		return shared.ResponseStruct{
			Data:   nil,
			Error:  fmt.Errorf("failed to create video generation history: %v", err.Error()),
			Status: false,
		}, err
	}

	return shared.ResponseStruct{Data: map[string]interface{}{"video_url": videoURL}, Error: nil, Status: true}, nil
}
