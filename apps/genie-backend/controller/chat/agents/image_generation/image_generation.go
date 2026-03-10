package image_generation

import (
	env "apps/opsMatrix-backend/config"
	promptGenerator "apps/opsMatrix-backend/controller/chat/agents/prompt_generator"
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

	"go.mongodb.org/mongo-driver/mongo"
)

func GeminiImageGeneration(data GeminiImageGenerationRequest, db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData) (shared.ResponseStruct, error) {

	geminiApiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%v:generateContent", data.ImageModel)

	headers := map[string]interface{}{
		"Content-Type":   "application/json",
		"x-goog-api-key": "",
	}
	apiKeysCollectionName := model.CollectionName["API_KEYS"]
	filterQuery := map[string]interface{}{
		"code": "GOOGLE_TEXT_TO_IMAGE_API_KEY",
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
	if apiKeyAny, ok := existingRecordMap["api_key"]; ok {
		headers["x-goog-api-key"] = fmt.Sprint(apiKeyAny)
	}

	title, enhancedQuery, err := promptGenerator.GenerateTitleAndEnhancedQuery(data.Query, "IMAGE_GENERATION", headers["x-goog-api-key"].(string))
	if err != nil {
		return shared.ResponseStruct{Data: nil, Error: err, Status: false}, err
	}

	parts := []map[string]interface{}{
		{
			"text": enhancedQuery,
		},
	}

	geminiPayload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{"parts": parts},
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

	if len(data.ImageUrls) > 0 {
		validImageCount := 0
		client := &http.Client{Timeout: time.Duration(60) * time.Second}

		for _, imageURL := range data.ImageUrls {
			if strings.TrimSpace(imageURL) == "" {
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
			validImageCount++
		}

		if validImageCount == 0 {
			return shared.ResponseStruct{
				Data:   nil,
				Error:  errors.New("no valid image_url provided"),
				Status: false,
			}, nil
		}

		if contents, ok := geminiPayload["contents"].([]map[string]interface{}); ok && len(contents) > 0 {
			contents[0]["parts"] = parts
			geminiPayload["contents"] = contents
		}
	}

	geminiApiRequest := shared.ApiRequestDto{
		URL:     geminiApiURL,
		Method:  "POST",
		Headers: headers,
		Body:    geminiPayload,
		Timeout: 60,
	}

	apiResp, err := shared.APIRequestComponentProcessor(geminiApiRequest)

	if err != nil {
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

	if errVal, ok := geminiResp["error"]; ok {
		if errMap, ok := errVal.(map[string]interface{}); ok {
			if msg, ok := errMap["message"].(string); ok {
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
				continue
			}

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
				return shared.ResponseStruct{Data: nil, Error: uploadErr, Status: false}, uploadErr
			}
			imagesURLs = append(imagesURLs, imageURL)
			responseMessage = fmt.Sprintf("%v\n%v", responseMessage, imageURL)
		}
	}

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
		imageTitle := title
		if len(imagesURLs) > 1 {
			imageTitle = fmt.Sprintf("%v - %v", title, index)
		}

		createPayload := map[string]interface{}{
			"image_url":      image,
			"user_query":     data.Query,
			"enhanced_query": enhancedQuery,
			"image_title":    imageTitle,
			"user_id":        metaData.UserId,
			"created_at":     time.Now().UTC(),
		}

		_, err = db.CreateOne(env.GlobalEnv["MONGO_CREDENTIAL"], collectionName, createPayload)
		if err != nil {
			return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed to create image generation history: %v", err.Error()), Status: false}, err
		}

	}

	response := shared.ResponseStruct{
		Data:   map[string]interface{}{"message": responseMessage, "image_urls": imagesURLs},
		Error:  nil,
		Status: true,
	}

	return response, nil

}
