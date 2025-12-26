package audio_generation

import (
	"context"
	"errors"
	"fmt"
	"io"
	"libs/shared"
	"libs/shared/db_connectors/model"
	"log"
	"net/http"
	"time"

	env "apps/genie-backend/config"
	imageGeneration "apps/genie-backend/controller/chat/agents/image_generation"
	promptGenerator "apps/genie-backend/controller/chat/agents/prompt_generator"

	authcredentials "cloud.google.com/go/auth/credentials"
	texttospeech "cloud.google.com/go/texttospeech/apiv1"
	"cloud.google.com/go/texttospeech/apiv1/texttospeechpb"
	"go.mongodb.org/mongo-driver/mongo"
	"google.golang.org/api/option"
)

func GoogleAudioGeneration(data GoogleAudioGenerationRequest, db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData) (shared.ResponseStruct, error) {

	ctx := context.Background()

	apiKeysCollectionName := model.CollectionName["API_KEYS"]
	filterQuery := map[string]interface{}{
		"code": "GOOGLE_TEXT_TO_AUDIO_API_KEY",
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
	var apiKey string
	if apiKeyAny, ok := existingRecordMap["api_key"]; ok {
		apiKey = fmt.Sprint(apiKeyAny)
	}

	title, enhancedQuery, err := promptGenerator.GenerateTitleAndEnhancedQuery(data.Query, "AUDIO_GENERATION", apiKey)
	if err != nil {
		return shared.ResponseStruct{Data: nil, Error: err, Status: false}, err
	}

	imageRequest := imageGeneration.GeminiImageGenerationRequest{
		Query:          title,
		ImageModel:     "gemini-3-pro-image-preview",
		ImageSize:      "1K",
		AspectRatio:    "1:1",
		NumberofImages: 1,
	}

	imageURL := ""
	imageResponse, err := imageGeneration.GeminiImageGeneration(imageRequest, db, metaData)
	if err != nil {
		// return shared.ResponseStruct{Data: nil, Error: err, Status: false}, err
	}

	if imageResponse.Status && imageResponse.Data != nil {
		dataMap := imageResponse.Data
		if urlsAny, ok := dataMap["image_urls"]; ok {
			switch urls := urlsAny.(type) {
			case []string:
				if len(urls) > 0 {
					imageURL = urls[0]
				}
			case []interface{}:
				if len(urls) > 0 {
					if first, ok := urls[0].(string); ok {
						imageURL = first
					}
				}
			}
		}
	}

	googleServiceAccountURL, ok := env.GlobalEnv["GOOGLE_SERVICE_ACCOUNT_URL"].(string)
	if !ok || googleServiceAccountURL == "" {
		return shared.ResponseStruct{
			Data:   nil,
			Error:  errors.New("google service account url not configured"),
			Status: false,
		}, nil
	}

	resp, err := http.Get(googleServiceAccountURL)
	if err != nil {
		return shared.ResponseStruct{
			Data:   nil,
			Error:  fmt.Errorf("failed to download service account json: %w", err),
			Status: false,
		}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return shared.ResponseStruct{
			Data:   nil,
			Error:  fmt.Errorf("service account json download failed: %d", resp.StatusCode),
			Status: false,
		}, nil
	}

	serviceAccountJSON, err := io.ReadAll(resp.Body)
	if err != nil {
		return shared.ResponseStruct{
			Data:   nil,
			Error:  fmt.Errorf("failed to read service account json: %w", err),
			Status: false,
		}, err
	}

	creds, err := authcredentials.DetectDefault(&authcredentials.DetectOptions{
		Scopes:          []string{"https://www.googleapis.com/auth/cloud-platform"},
		CredentialsJSON: serviceAccountJSON,
	})
	if err != nil {
		return shared.ResponseStruct{
			Data:   nil,
			Error:  fmt.Errorf("failed to create gcs credentials: %w", err),
			Status: false,
		}, err
	}

	client, err := texttospeech.NewTextToSpeechLongAudioSynthesizeClient(ctx, option.WithAuthCredentials(creds))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Close()

	randomString := shared.GenerateRandomString(10)

	projectID := "project-9a5b394d-e704-434b-a81"
	location := "global"
	gcsURI := fmt.Sprintf("gs://genie-blob-storage/generated_audios/%s.wav", randomString)

	fmt.Println("Enhanced Query: ", enhancedQuery)

	req := &texttospeechpb.SynthesizeLongAudioRequest{
		Parent: fmt.Sprintf("projects/%s/locations/%s", projectID, location),
		Input: &texttospeechpb.SynthesisInput{
			InputSource: &texttospeechpb.SynthesisInput_Ssml{Ssml: enhancedQuery},
		},
		AudioConfig: &texttospeechpb.AudioConfig{
			AudioEncoding:   texttospeechpb.AudioEncoding_LINEAR16,
			SampleRateHertz: 24000,
			SpeakingRate:    0.95,
		},
		Voice: &texttospeechpb.VoiceSelectionParams{
			LanguageCode: "en-US",
			Name:         "en-US-Chirp3-HD-Aoede",
		},
		OutputGcsUri: gcsURI,
	}

	op, err := client.SynthesizeLongAudio(ctx, req)
	if err != nil {
		return shared.ResponseStruct{
			Data:   nil,
			Error:  fmt.Errorf("failed to start long audio synthesis: %w", err),
			Status: false,
		}, err
	}

	fmt.Printf("Waiting for operation to finish: %s\n", op.Name())

	// This blocks until the audio is fully generated and saved to GCS
	_, err = op.Wait(ctx)
	if err != nil {
		return shared.ResponseStruct{
			Data:   nil,
			Error:  fmt.Errorf("operation failed: %w", err),
			Status: false,
		}, err
	}

	publicURL := fmt.Sprintf("https://storage.googleapis.com/genie-blob-storage/generated_audios/%s.wav", randomString)

	collectionName := model.CollectionName["AUDIO_GENERATION_HISTORY"]
	createPayload := map[string]interface{}{
		"audio_url":      publicURL,
		"audio_title":    title,
		"user_query":     data.Query,
		"enhanced_query": enhancedQuery,
		"user_id":        metaData.UserId,
		"created_at":     time.Now().UTC(),
	}

	_, err = db.CreateOne(env.GlobalEnv["MONGO_CREDENTIAL"], collectionName, createPayload)
	if err != nil {
		return shared.ResponseStruct{
			Data:   nil,
			Error:  fmt.Errorf("failed to create audio generation history: %v", err.Error()),
			Status: false,
		}, err
	}

	response := map[string]interface{}{
		"audio_url":   publicURL,
		"image_url":   imageURL,
		"audio_title": title,
	}

	fmt.Printf("Success! Audio saved to GCS. Response: %v\n", publicURL)
	return shared.ResponseStruct{Data: response, Error: nil, Status: true}, nil
}
