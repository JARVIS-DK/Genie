package sub_agents

import (
	env "apps/genie-backend/config"
	"apps/genie-backend/controller/chats/agents/prompts"
	"apps/genie-backend/controller/chats/llm"
	"apps/genie-backend/controller/chats/models"
	"bytes"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"libs/shared"
	"libs/shared/db_connectors/model"
	"libs/shared/utils/helpers"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type GeminiImageGenerationRequest struct {
	Query          string      `json:"query"`
	Title          string      `json:"title"`
	ImageModel     string      `json:"image_model"`
	NumberofImages interface{} `json:"images_count"`
	AspectRatio    string      `json:"aspect_ratio"`
	ImageSize      string      `json:"image_size"`
	IsWebSearch    bool        `json:"is_web_search"`
	ImageUrls      []string    `json:"image_urls"`
}

func GeminiImageGeneration(data GeminiImageGenerationRequest, db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData, sw ...*models.StreamWriter) (shared.ResponseStruct, error) {
	var w *models.StreamWriter
	if len(sw) > 0 {
		w = sw[0]
	}
	fmt.Println("GeminiImageGeneration Started", data)

	SendStep(w, "Image Generation", "Dreaming up your visuals...")
	botApiKey, err := llm.GetApiKey("IMAGE_GENERATION", db)
	if err != nil {
		shared.PrettyPrint("GeminiImageGeneration: Failed to get IMAGE_GENERATION API key", err)
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed to get IMAGE_GENERATION api key: %v", err), Status: false}, err
	}

	geminiPayloadLLM := llm.GeminiRequest{
		Query:     data.Query,
		Prompt:    prompts.ImageGenerationPrompt,
		ToolCalls: prompts.ImageGenerationToolCalls,
		ApiKey:    botApiKey,
	}

	llmResp, llmErr := llm.Gemini(geminiPayloadLLM, db, metaData)
	if llmErr != nil {
		shared.PrettyPrint("GeminiImageGeneration: LLM Enrichment Failed", llmErr)
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("image generation LLM enrichment failed: %v", llmErr), Status: false}, llmErr
	}

	if len(llmResp.ToolCalls) > 0 {
		tc := llmResp.ToolCalls[0]
		if tc.FunctionName == "image_generation" {
			var enrichedData GeminiImageGenerationRequest
			shared.JsonMarshaller(tc.Args, &enrichedData)

			if enrichedData.Query != "" && data.Query == "" {
				data.Query = enrichedData.Query
			}
			if enrichedData.Title != "" && data.Title == "" {
				data.Title = enrichedData.Title
			}
			if enrichedData.AspectRatio != "" && data.AspectRatio == "" {
				data.AspectRatio = enrichedData.AspectRatio
			}
			if enrichedData.ImageSize != "" && data.ImageSize == "" {
				data.ImageSize = enrichedData.ImageSize
			}
			if enrichedData.NumberofImages != nil && data.NumberofImages == nil {
				data.NumberofImages = enrichedData.NumberofImages
			}
			if !data.IsWebSearch {
				data.IsWebSearch = enrichedData.IsWebSearch
			}
			if len(enrichedData.ImageUrls) > 0 && len(data.ImageUrls) == 0 {
				data.ImageUrls = enrichedData.ImageUrls
			}
			shared.PrettyPrint("GeminiImageGeneration: Enriched Data from LLM", data)
		}
	} else {
		shared.PrettyPrint("GeminiImageGeneration: No Tool Call returned from LLM enrichment", nil)
		return shared.ResponseStruct{Data: nil, Error: errors.New("image generation LLM enrichment returned no tool calls"), Status: false}, errors.New("image generation LLM enrichment returned no tool calls")
	}

	geminiApiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%v:generateContent", "gemini-3-pro-preview")

	headers := map[string]interface{}{
		"Content-Type":   "application/json",
		"x-goog-api-key": botApiKey,
	}

	if data.ImageModel == "" {
		if val, ok := env.GlobalEnv["IMAGE_GENERATION"].(string); ok {
			data.ImageModel = val
		} else {
			data.ImageModel = "gemini-3-pro-image-preview" // fallback
		}
	}

	geminiImageApiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%v:generateContent", data.ImageModel)

	if data.ImageSize == "" {
		data.ImageSize = "1K"
	}

	if data.AspectRatio == "" {
		data.AspectRatio = "1:1"
	}

	// Build parts: text prompt first, then each input image as inline_data.
	// This matches the Gemini API multimodal request format:
	// { "parts": [ {"text": "..."}, {"inline_data": {"mime_type": "...", "data": "..."}}, ... ] }
	parts := []map[string]interface{}{
		{
			"text": data.Query,
		},
	}

	if len(data.ImageUrls) > 0 {
		validImageCount := 0
		client := &http.Client{Timeout: time.Duration(60) * time.Second}

		for _, imageURL := range data.ImageUrls {
			shared.PrettyPrint("GeminiImageGeneration: Processing Input Image URL", imageURL)
			if strings.TrimSpace(imageURL) == "" {
				shared.PrettyPrint("GeminiImageGeneration: Empty URL skipped", nil)
				continue
			}

			resp, err := client.Get(imageURL)
			if err != nil {
				return shared.ResponseStruct{
					Data:   nil,
					Error:  errors.New("Error in Image : " + err.Error()),
					Status: false,
				}, err
			}

			imgBytes, err := io.ReadAll(resp.Body)
			_ = resp.Body.Close()
			if err != nil {
				return shared.ResponseStruct{
					Data:   nil,
					Error:  errors.New("Error in Image : " + err.Error()),
					Status: false,
				}, err
			}

			imgBase64 := base64.StdEncoding.EncodeToString(imgBytes)
			mimeType := http.DetectContentType(imgBytes)

			parts = append(parts, map[string]interface{}{
				"inline_data": map[string]interface{}{
					"mime_type": mimeType,
					"data":      imgBase64,
				},
			})
			shared.PrettyPrint("GeminiImageGeneration: Successfully downloaded & base64 encoded image", mimeType)
			validImageCount++
		}

		if validImageCount == 0 {
			return shared.ResponseStruct{
				Data:   nil,
				Error:  errors.New("no valid image_url provided"),
				Status: false,
			}, nil
		}
	}

	geminiPayload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{"parts": parts},
		},
		"tools": []map[string]interface{}{
			{"google_search": map[string]interface{}{}},
		},
		"generationConfig": map[string]interface{}{
			"responseModalities": []string{"TEXT", "IMAGE"},
		},
	}

	imageConfig := map[string]interface{}{
		"aspectRatio": data.AspectRatio,
	}

	if data.ImageModel != "gemini-2.5-flash-image" {
		imageConfig["imageSize"] = data.ImageSize
	}
	geminiPayload["generationConfig"].(map[string]interface{})["imageConfig"] = imageConfig

	var n int

	switch v := data.NumberofImages.(type) {
	case int:
		n = v
	case float64:
		n = int(v)
	case string:
		parsed, err := strconv.Atoi(v)
		if err != nil {
			return shared.ResponseStruct{
				Data:   nil,
				Error:  errors.New("cannot convert number of images to int"),
				Status: false,
			}, nil
		}
		n = parsed
	default:
		return shared.ResponseStruct{
			Data:   nil,
			Error:  errors.New("cannot convert number of images to int"),
			Status: false,
		}, nil
	}

	geminiPayload["generationConfig"].(map[string]interface{})["candidateCount"] = n

	shared.PrettyPrint("Image generation Gemini Payload", geminiPayload)

	geminiApiRequest := shared.ApiRequestDto{
		URL:     geminiImageApiURL,
		Method:  "POST",
		Headers: headers,
		Body:    geminiPayload,
		Timeout: 60,
	}

	SendStep(w, "Image Generation", "Painting pixels on the canvas...")
	shared.PrettyPrint("GeminiImageGeneration: Calling APIRequestComponentProcessor", geminiApiURL)
	apiResp, err := shared.APIRequestComponentProcessor(geminiApiRequest)
	shared.PrettyPrint("GeminiImageGeneration: Finished APIRequestComponentProcessor", map[string]interface{}{"err": err, "status": apiResp.Status})

	if err != nil {
		shared.PrettyPrint("GeminiImageGeneration API Request Error", err)
		return shared.ResponseStruct{
			Data:   nil,
			Error:  errors.New("API Error : " + err.Error()),
			Status: false,
		}, err
	}

	var apiResponse shared.ApiResponseDto
	helpers.JsonMarshaller(apiResp, &apiResponse)

	var geminiResp map[string]interface{}
	helpers.JsonMarshaller(apiResponse.Data.Response, &geminiResp)
	shared.PrettyPrint("GeminiImageGeneration: Parsed API response body", geminiResp)

	if errVal, ok := geminiResp["error"]; ok {
		if errMap, ok := errVal.(map[string]interface{}); ok {
			if msg, ok := errMap["message"].(string); ok {
				shared.PrettyPrint("GeminiImageGeneration Gemini Platform Error", msg)
				return shared.ResponseStruct{
					Data:   nil,
					Error:  errors.New(msg),
					Status: false,
				}, nil
			}
		}
	}

	candidates, ok := geminiResp["candidates"].([]interface{})
	if !ok || len(candidates) == 0 {
		shared.PrettyPrint("GeminiImageGeneration Error", "no result from gemini")
		return shared.ResponseStruct{
			Data:   nil,
			Error:  errors.New("no result from gemini"),
			Status: false,
		}, nil
	}

	base64Images := make([]string, 0)
	imagesURLs := make([]string, 0)

	responseMessage := ""
	googleStorageBucketName, ok := env.GlobalEnv["GOOGLE_CLOUD_STORAGE_BUCKET_NAME"].(string)
	if !ok || googleStorageBucketName == "" {
		return shared.ResponseStruct{
			Data:   nil,
			Error:  errors.New("google cloud storage bucket name not configured"),
			Status: false,
		}, nil
	}

	googleServiceAccountURL := env.GlobalEnv["GOOGLE_SERVICE_ACCOUNT_URL"].(string)

	for _, cand := range candidates {
		shared.PrettyPrint("GeminiImageGeneration: Parsing candidate", cand)
		candMap, ok := cand.(map[string]interface{})
		if !ok {
			continue
		}

		content, ok := candMap["content"].(map[string]interface{})
		if !ok {
			continue
		}

		parts, ok := content["parts"].([]interface{})
		if !ok {
			continue
		}

		for _, part := range parts {
			partMap, ok := part.(map[string]interface{})
			if !ok {
				continue
			}

			if text, ok := partMap["text"].(string); ok {
				responseMessage = fmt.Sprintf("%v\n", text)
			}

			inlineAny, hasCamel := partMap["inlineData"]
			if !hasCamel {
				inlineAny = partMap["inline_data"]
			}
			inlineData, ok := inlineAny.(map[string]interface{})
			if !ok {
				continue
			}
			b64Any, ok := inlineData["data"]
			if !ok {
				continue
			}
			b64 := fmt.Sprint(b64Any)
			if b64 == "" {
				shared.PrettyPrint("GeminiImageGeneration: Blank base64 data skipped", nil)
				continue
			}

			shared.PrettyPrint("GeminiImageGeneration: Found base64 image data (length)", len(b64))
			base64Images = append(base64Images, b64)
			fileName := fmt.Sprintf("generated_images/%v.png", shared.GenerateRandomString(10))
			imageBytes, err := base64.StdEncoding.DecodeString(b64)
			if err != nil {
				return shared.ResponseStruct{Data: nil, Error: err, Status: false}, err
			}
			imageReader := bytes.NewReader(imageBytes)
			imageURL, _, uploadErr := shared.UploadToGCS(googleServiceAccountURL, googleStorageBucketName, imageReader, "image/png", fileName)
			// imageURL, uploadErr := shared.Base64ToGoogleBlob(&b64, googleStorageBucketName, googleStorageCredentials)
			if uploadErr != nil {
				shared.PrettyPrint("GeminiImageGeneration: GCS Upload Error", uploadErr)
				return shared.ResponseStruct{Data: nil, Error: uploadErr, Status: false}, uploadErr
			}
			shared.PrettyPrint("GeminiImageGeneration: Successfully uploaded to GCS", imageURL)
			imagesURLs = append(imagesURLs, imageURL)
			responseMessage = fmt.Sprintf("%v\n%v", responseMessage, imageURL)
		}
	}
	SendStep(w, "Image Generation", "Framing the masterpiece...")
	shared.PrettyPrint("Generated images URLs", imagesURLs)

	if len(imagesURLs) == 0 {
		return shared.ResponseStruct{
			Data:   nil,
			Error:  errors.New("Failed to Generate Images"),
			Status: false,
		}, nil
	}

	for index, image := range imagesURLs {
		collectionName := model.CollectionName["IMAGE_GENERATION_HISTORY"]

		// If only one image was generated, use the base title without index.
		// Otherwise, append an index suffix.
		imageTitle := data.Title
		if len(imagesURLs) > 1 {
			imageTitle = fmt.Sprintf("%v - %v", data.Title, index)
		}

		createPayload := map[string]interface{}{
			"image_url":      image,
			"user_query":     data.Query,
			"enhanced_query": data.Query,
			"image_title":    imageTitle,
			"user_id":        metaData.UserId,
			"created_at":     time.Now().UTC(),
		}

		shared.PrettyPrint("GeminiImageGeneration: Saving to DB", createPayload)
		_, err = db.CreateOne(env.GlobalEnv["MONGO_CREDENTIAL"], collectionName, createPayload)
		if err != nil {
			shared.PrettyPrint("GeminiImageGeneration: DB Saving Error", err)
			return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed to create image generation history: %v", err.Error()), Status: false}, err
		}
		shared.PrettyPrint("GeminiImageGeneration: Successfully saved to DB", nil)

	}
	fmt.Println("GeminiImageGeneration Ended")

	response := shared.ResponseStruct{
		Data:   map[string]interface{}{"message": responseMessage, "image_urls": imagesURLs},
		Error:  nil,
		Status: true,
	}

	return response, nil

}
