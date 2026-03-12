package sub_agents

import (
	env "apps/genie-backend/config"
	"apps/genie-backend/controller/chats/agents/prompts"
	"apps/genie-backend/controller/chats/llm"
	"context"
	"errors"
	"fmt"
	"io"
	"libs/shared"
	"libs/shared/db_connectors/model"
	"log"
	"net/http"
	"time"

	authcredentials "cloud.google.com/go/auth/credentials"
	texttospeech "cloud.google.com/go/texttospeech/apiv1"
	"cloud.google.com/go/texttospeech/apiv1/texttospeechpb"
	"google.golang.org/api/option"
)

type GeminiAudioGenerationRequest struct {
	Query          string `json:"query"`
	Title          string `json:"title"`
	ThumbnailQuery string `json:"thumbnail_query"`
	Gender         string `json:"gender"`
	Language       string `json:"language"`
}

func GeminiAudioGeneration(data GeminiAudioGenerationRequest, db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData) (shared.ResponseStruct, error) {

	// --- LLM Call to enrich the audio generation request ---
	botApiKey, err := llm.GetApiKey("AUDIO_GENERATION", db)
	if err != nil {
		shared.PrettyPrint("GeminiAudioGeneration: Failed to get AUDIO_GENERATION API key", err)
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed to get AUDIO_GENERATION api key: %v", err), Status: false}, err
	}

	geminiPayloadLLM := llm.GeminiRequest{
		Query:     data.Query,
		Prompt:    prompts.AudioGenerationPrompt,
		ToolCalls: prompts.AudioGenerationToolCalls,
		ApiKey:    botApiKey,
	}

	llmResp, llmErr := llm.Gemini(geminiPayloadLLM, db, metaData)
	if llmErr != nil {
		shared.PrettyPrint("GeminiAudioGeneration: LLM Enrichment Failed", llmErr)
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("audio generation LLM enrichment failed: %v", llmErr), Status: false}, llmErr
	}

	if len(llmResp.ToolCalls) > 0 {
		tc := llmResp.ToolCalls[0]
		if tc.FunctionName == "audio_generation" {
			var enrichedData GeminiAudioGenerationRequest
			shared.JsonMarshaller(tc.Args, &enrichedData)

			if enrichedData.Query != "" {
				data.Query = enrichedData.Query
			}
			if enrichedData.Title != "" {
				data.Title = enrichedData.Title
			}
			if enrichedData.ThumbnailQuery != "" {
				data.ThumbnailQuery = enrichedData.ThumbnailQuery
			}
			if enrichedData.Gender != "" {
				data.Gender = enrichedData.Gender
			}
			if enrichedData.Language != "" {
				data.Language = enrichedData.Language
			}
			shared.PrettyPrint("GeminiAudioGeneration: Enriched Data from LLM", data)
		}
	} else {
		shared.PrettyPrint("GeminiAudioGeneration: No Tool Call returned from LLM enrichment", nil)
		return shared.ResponseStruct{Data: nil, Error: errors.New("audio generation LLM enrichment returned no tool calls"), Status: false}, errors.New("audio generation LLM enrichment returned no tool calls")
	}

	ctx := context.Background()

	// --- Read all env config upfront ---
	googleServiceAccountURL, ok := env.GlobalEnv["GOOGLE_SERVICE_ACCOUNT_URL"].(string)
	if !ok || googleServiceAccountURL == "" {
		return shared.ResponseStruct{Data: nil, Error: errors.New("google service account url not configured"), Status: false}, nil
	}

	googleStorageBucketName, ok := env.GlobalEnv["GOOGLE_CLOUD_STORAGE_BUCKET_NAME"].(string)
	if !ok || googleStorageBucketName == "" {
		return shared.ResponseStruct{Data: nil, Error: errors.New("google cloud storage bucket name not configured"), Status: false}, nil
	}

	projectID, ok := env.GlobalEnv["GOOGLE_CLOUD_PROJECT_ID"].(string)
	if !ok || projectID == "" {
		return shared.ResponseStruct{Data: nil, Error: errors.New("google cloud project id not configured"), Status: false}, nil
	}

	location, ok := env.GlobalEnv["GOOGLE_CLOUD_LOCATION"].(string)
	if !ok || location == "" {
		location = "global"
	}

	language := data.Language
	if language == "" {
		language = "en-US"
	}

	randomString := shared.GenerateRandomString(10)
	gcsURI := fmt.Sprintf("gs://%s/generated_audios/%s.wav", googleStorageBucketName, randomString)
	publicURL := fmt.Sprintf("https://storage.googleapis.com/%s/generated_audios/%s.wav", googleStorageBucketName, randomString)

	// --- Launch image generation and TTS synthesis in parallel ---

	type imageResult struct {
		url string
	}
	type audioResult struct {
		err error
	}

	imageCh := make(chan imageResult, 1)
	audioCh := make(chan audioResult, 1)

	// Goroutine 1: Thumbnail image generation
	go func() {
		url := ""
		if data.ThumbnailQuery != "" {
			imageRequest := GeminiImageGenerationRequest{
				Query:          data.ThumbnailQuery,
				Title:          data.Title,
				AspectRatio:    "1:1",
				ImageSize:      "1K",
				NumberofImages: 1,
			}
			imageResponse, imgErr := GeminiImageGeneration(imageRequest, db, metaData)
			if imgErr == nil && imageResponse.Status && imageResponse.Data != nil {
				if urlsAny, ok := imageResponse.Data["image_urls"]; ok {
					switch urls := urlsAny.(type) {
					case []string:
						if len(urls) > 0 {
							url = urls[0]
						}
					case []interface{}:
						if len(urls) > 0 {
							if first, ok := urls[0].(string); ok {
								url = first
							}
						}
					}
				}
			}
		}
		imageCh <- imageResult{url: url}
	}()

	// Goroutine 2: TTS long audio synthesis
	go func() {
		// Download service account JSON
		resp, err := http.Get(googleServiceAccountURL)
		if err != nil {
			audioCh <- audioResult{err: fmt.Errorf("failed to download service account json: %w", err)}
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			audioCh <- audioResult{err: fmt.Errorf("service account json download failed: %d", resp.StatusCode)}
			return
		}

		serviceAccountJSON, err := io.ReadAll(resp.Body)
		if err != nil {
			audioCh <- audioResult{err: fmt.Errorf("failed to read service account json: %w", err)}
			return
		}

		creds, err := authcredentials.DetectDefault(&authcredentials.DetectOptions{
			Scopes:          []string{"https://www.googleapis.com/auth/cloud-platform"},
			CredentialsJSON: serviceAccountJSON,
		})
		if err != nil {
			audioCh <- audioResult{err: fmt.Errorf("failed to create gcs credentials: %w", err)}
			return
		}

		client, err := texttospeech.NewTextToSpeechLongAudioSynthesizeClient(ctx, option.WithAuthCredentials(creds))
		if err != nil {
			audioCh <- audioResult{err: fmt.Errorf("failed to create tts client: %w", err)}
			return
		}
		defer client.Close()

		voiceName := resolveVoiceName(language, data.Gender)
		shared.PrettyPrint("Audio generation started. Query", data.Query)

		req := &texttospeechpb.SynthesizeLongAudioRequest{
			Parent: fmt.Sprintf("projects/%s/locations/%s", projectID, location),
			Input: &texttospeechpb.SynthesisInput{
				InputSource: &texttospeechpb.SynthesisInput_Ssml{Ssml: data.Query},
			},
			AudioConfig: &texttospeechpb.AudioConfig{
				AudioEncoding:   texttospeechpb.AudioEncoding_LINEAR16,
				SampleRateHertz: 24000,
				SpeakingRate:    0.95,
			},
			Voice: &texttospeechpb.VoiceSelectionParams{
				LanguageCode: language,
				Name:         voiceName,
			},
			OutputGcsUri: gcsURI,
		}

		op, err := client.SynthesizeLongAudio(ctx, req)
		if err != nil {
			audioCh <- audioResult{err: fmt.Errorf("failed to start long audio synthesis: %w", err)}
			return
		}

		log.Printf("Waiting for audio operation to finish: %s\n", op.Name())

		_, err = op.Wait(ctx)
		if err != nil {
			audioCh <- audioResult{err: fmt.Errorf("audio operation failed: %w", err)}
			return
		}

		audioCh <- audioResult{err: nil}
	}()

	// --- Wait for both goroutines ---
	imgRes := <-imageCh
	audioRes := <-audioCh

	if audioRes.err != nil {
		shared.PrettyPrint("GeminiAudioGeneration Error from Audio Synthesizer", audioRes.err)
		return shared.ResponseStruct{Data: nil, Error: audioRes.err, Status: false}, audioRes.err
	}

	imageURL := imgRes.url

	// --- Save to DB and return ---
	collectionName := model.CollectionName["AUDIO_GENERATION_HISTORY"]

	createPayload := map[string]interface{}{
		"audio_url":   publicURL,
		"image_url":   imageURL,
		"audio_title": data.Title,
		"user_query":  data.Query,
		"user_id":     metaData.UserId,
		"created_at":  time.Now().UTC(),
	}

	_, err = db.CreateOne(env.GlobalEnv["MONGO_CREDENTIAL"], collectionName, createPayload)
	if err != nil {
		return shared.ResponseStruct{
			Data:   nil,
			Error:  fmt.Errorf("failed to create audio generation history: %v", err.Error()),
			Status: false,
		}, err
	}

	shared.PrettyPrint("Success! Audio saved to GCS URL", publicURL)

	return shared.ResponseStruct{
		Data: map[string]interface{}{
			"audio_url":   publicURL,
			"image_url":   imageURL,
			"audio_title": data.Title,
		},
		Error:  nil,
		Status: true,
	}, nil
}

// resolveVoiceName picks a Chirp3-HD voice based on language and gender.
// Falls back to a neutral en-US voice if no match is found.
func resolveVoiceName(language, gender string) string {
	type voiceKey struct{ lang, gender string }
	voices := map[voiceKey]string{
		{"en-US", "female"}: "en-US-Chirp3-HD-Aoede",
		{"en-US", "male"}:   "en-US-Chirp3-HD-Charon",
		{"en-GB", "female"}: "en-GB-Chirp3-HD-Aoede",
		{"en-GB", "male"}:   "en-GB-Chirp3-HD-Charon",
		{"hi-IN", "female"}: "hi-IN-Chirp3-HD-Aoede",
		{"hi-IN", "male"}:   "hi-IN-Chirp3-HD-Charon",
		{"fr-FR", "female"}: "fr-FR-Chirp3-HD-Aoede",
		{"fr-FR", "male"}:   "fr-FR-Chirp3-HD-Charon",
		{"de-DE", "female"}: "de-DE-Chirp3-HD-Aoede",
		{"de-DE", "male"}:   "de-DE-Chirp3-HD-Charon",
		{"es-ES", "female"}: "es-ES-Chirp3-HD-Aoede",
		{"es-ES", "male"}:   "es-ES-Chirp3-HD-Charon",
		{"ja-JP", "female"}: "ja-JP-Chirp3-HD-Aoede",
		{"ja-JP", "male"}:   "ja-JP-Chirp3-HD-Charon",
		{"ko-KR", "female"}: "ko-KR-Chirp3-HD-Aoede",
		{"ko-KR", "male"}:   "ko-KR-Chirp3-HD-Charon",
		{"pt-BR", "female"}: "pt-BR-Chirp3-HD-Aoede",
		{"pt-BR", "male"}:   "pt-BR-Chirp3-HD-Charon",
		{"zh-CN", "female"}: "cmn-CN-Chirp3-HD-Aoede",
		{"zh-CN", "male"}:   "cmn-CN-Chirp3-HD-Charon",
	}
	if name, ok := voices[voiceKey{language, gender}]; ok {
		return name
	}
	// Default fallback
	return "en-US-Chirp3-HD-Aoede"
}
