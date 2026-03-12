package sub_agents

import (
	env "apps/genie-backend/config"
	"apps/genie-backend/controller/chats/agents/prompts"
	"apps/genie-backend/controller/chats/llm"
	"bytes"
	"context"
	"errors"
	"fmt"
	"libs/shared"
	"libs/shared/db_connectors/model"
	"log"
	"time"

	"google.golang.org/genai"
)

type GeminiVideoGenerationRequest struct {
	Query            string `json:"query"`
	Title            string `json:"title"`
	VideoModel       string `json:"video_model"`
	AspectRatio      string `json:"aspect_ratio"`
	Duration         string `json:"duration"`
	Resolution       string `json:"resolution"`
	PersonAllowed    string `json:"person_allowed"`
	AnimateFromImage bool   `json:"animate_from_image"`
	ImageURL         string `json:"image_url"`
	Interpolate      bool   `json:"interpolate"`
	LastFrameURL     string `json:"last_frame_url"`
}

func GeminiVideoGeneration(data GeminiVideoGenerationRequest, db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData) (shared.ResponseStruct, error) {

	// --- LLM Call to enrich the video generation request ---
	botApiKey, err := llm.GetApiKey("VIDEO_GENERATION", db)
	if err != nil {
		shared.PrettyPrint("GeminiVideoGeneration: Failed to get VIDEO_GENERATION API key", err)
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed to get VIDEO_GENERATION api key: %v", err), Status: false}, err
	}

	botModel := env.GlobalEnv["GOOGLE_GEMINI_CHAT_MODEL"].(string)
	geminiPayloadLLM := llm.GeminiRequest{
		Query:     data.Query,
		Prompt:    prompts.VideoGenerationPrompt,
		ToolCalls: prompts.VideoGenerationToolCalls,
		ApiKey:    botApiKey,
		Model:     botModel,
	}

	resp, llmErr := llm.Gemini(geminiPayloadLLM, db, metaData)
	if llmErr != nil {
		shared.PrettyPrint("GeminiVideoGeneration: LLM Enrichment Failed", llmErr)
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("video generation LLM enrichment failed: %v", llmErr), Status: false}, llmErr
	}

	if len(resp.ToolCalls) > 0 {
		tc := resp.ToolCalls[0]
		if tc.FunctionName == "video_generation" {
			var enrichedData GeminiVideoGenerationRequest
			shared.JsonMarshaller(tc.Args, &enrichedData)

			if enrichedData.Query != "" {
				data.Query = enrichedData.Query
			}
			if enrichedData.Title != "" {
				data.Title = enrichedData.Title
			}
			if enrichedData.VideoModel != "" {
				data.VideoModel = enrichedData.VideoModel
			}
			if enrichedData.AspectRatio != "" {
				data.AspectRatio = enrichedData.AspectRatio
			}
			if enrichedData.Duration != "" {
				data.Duration = enrichedData.Duration
			}
			if enrichedData.Resolution != "" {
				data.Resolution = enrichedData.Resolution
			}
			if enrichedData.PersonAllowed != "" {
				data.PersonAllowed = enrichedData.PersonAllowed
			}
			data.AnimateFromImage = enrichedData.AnimateFromImage
			if enrichedData.ImageURL != "" {
				data.ImageURL = enrichedData.ImageURL
			}
			data.Interpolate = enrichedData.Interpolate
			if enrichedData.LastFrameURL != "" {
				data.LastFrameURL = enrichedData.LastFrameURL
			}
			shared.PrettyPrint("GeminiVideoGeneration: Enriched Data from LLM", data)
		}
	} else {
		shared.PrettyPrint("GeminiVideoGeneration: No Tool Call returned from LLM enrichment", nil)
		return shared.ResponseStruct{Data: nil, Error: errors.New("video generation LLM enrichment returned no tool calls"), Status: false}, errors.New("video generation LLM enrichment returned no tool calls")
	}

	data.VideoModel = env.GlobalEnv["GOOGLE_GEMINI_VIDEO_MODEL"].(string)

	// Apply defaults for fields not set by LLM
	if data.VideoModel == "" {
		data.VideoModel = "veo-3.1-fast-generate-preview"
	}
	if data.AspectRatio == "" {
		data.AspectRatio = "16:9"
	}
	if data.Duration == "" {
		data.Duration = "8"
	}
	if data.Resolution == "" {
		data.Resolution = "1080p"
	}
	if data.PersonAllowed == "" {
		data.PersonAllowed = "allow_all"
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  botApiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed to initialize genai client: %v", err), Status: false}, err
	}

	shared.PrettyPrint("Video generation started Request Data", data)

	operation, err := client.Models.GenerateVideos(
		ctx,
		data.VideoModel,
		data.Query,
		nil,
		nil,
	)
	if err != nil {
		shared.PrettyPrint("GeminiVideoGeneration Model Error", err)
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed to start video generation: %v", err), Status: false}, err
	}
	if operation == nil {
		shared.PrettyPrint("GeminiVideoGeneration Operation Error", "video generation operation is nil")
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
		shared.PrettyPrint("GeminiVideoGeneration Empty Result Error", "no generated videos returned from operation")
		return shared.ResponseStruct{Data: nil, Error: errors.New("no generated videos returned from operation"), Status: false}, errors.New("no generated videos returned from operation")
	}

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

	// Download the generated video content from Gemini and upload to GCS.
	videoBytes, err := client.Files.Download(ctx, video.Video, nil)
	if err != nil {
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed to download generated video: %v", err), Status: false}, err
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

	shared.PrettyPrint("Generated video saved to URL", videoURL)

	collectionName := model.CollectionName["VIDEO_GENERATION_HISTORY"]
	createPayload := map[string]interface{}{
		"video_url":   videoURL,
		"video_title": data.Title,
		"user_query":  data.Query,
		"user_id":     metaData.UserId,
		"created_at":  time.Now().UTC(),
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
