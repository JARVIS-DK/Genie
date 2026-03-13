package sub_agents

import (
	"apps/genie-backend/controller/chats/agents/prompts"
	"apps/genie-backend/controller/chats/llm"
	"apps/genie-backend/controller/chats/models"
	"errors"
	"fmt"
	"libs/shared"
	"libs/shared/utils/helpers"

	env "apps/genie-backend/config"
)

type GeminiWebSearchRequest struct {
	Query string `json:"query"`
}

func GeminiWebSearch(data GeminiWebSearchRequest, db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData, sw ...*models.StreamWriter) (shared.ResponseStruct, error) {
	var w *models.StreamWriter
	if len(sw) > 0 {
		w = sw[0]
	}
	shared.PrettyPrint("GeminiWebSearch Started", data)

	SendStep(w, "Web Search", "Scouring the web...")
	botApiKey, err := llm.GetApiKey("URL_CONTEXT", db)
	if err != nil {
		shared.PrettyPrint("GeminiWebSearch: Failed to get WEB_SEARCH API key", err)
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed to get WEB_SEARCH api key: %v", err), Status: false}, err
	}

	model := env.GlobalEnv["GOOGLE_GEMINI_CHAT_MODEL"].(string)
	geminiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%v:generateContent", model)

	payload := map[string]interface{}{
		"system_instruction": map[string]interface{}{
			"parts": []map[string]interface{}{{"text": prompts.WebSearchPrompt}},
		},
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{"text": data.Query},
				},
			},
		},
		"tools": []map[string]interface{}{
			{"google_search": map[string]interface{}{}},
		},
	}

	headers := map[string]interface{}{
		"Content-Type":   "application/json",
		"x-goog-api-key": botApiKey,
	}

	apiRequest := shared.ApiRequestDto{
		URL:     geminiURL,
		Method:  "POST",
		Headers: headers,
		Body:    payload,
		Timeout: 60,
	}

	shared.PrettyPrint("GeminiWebSearch: Calling Gemini API with google_search", payload)
	SendStep(w, "Web Search", "Plundering the web for answers...")

	apiResp, err := shared.APIRequestComponentProcessor(apiRequest)
	if err != nil {
		shared.PrettyPrint("GeminiWebSearch: API Request Error", err)
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("web search API error: %v", err), Status: false}, err
	}

	var apiResponse shared.ApiResponseDto
	helpers.JsonMarshaller(apiResp, &apiResponse)

	var response map[string]interface{}
	helpers.JsonMarshaller(apiResponse.Data.Response, &response)

	// Check for API-level error
	if errVal, ok := response["error"]; ok {
		if errMap, ok := errVal.(map[string]interface{}); ok {
			if msg, ok := errMap["message"].(string); ok {
				shared.PrettyPrint("GeminiWebSearch: API Error", msg)
				return shared.ResponseStruct{Data: nil, Error: errors.New(msg), Status: false}, errors.New(msg)
			}
		}
	}

	candidates, ok := response["candidates"].([]interface{})
	if !ok || len(candidates) == 0 {
		return shared.ResponseStruct{Data: nil, Error: errors.New("no candidates in web search response"), Status: false}, errors.New("no candidates in web search response")
	}

	var candidate map[string]interface{}
	helpers.JsonMarshaller(candidates[0], &candidate)

	// Extract text message from content.parts
	message := ""
	if content, ok := candidate["content"].(map[string]interface{}); ok {
		if parts, ok := content["parts"].([]interface{}); ok {
			for _, p := range parts {
				if partMap, ok := p.(map[string]interface{}); ok {
					if text, ok := partMap["text"].(string); ok {
						message += text
					}
				}
			}
		}
	}

	// Extract grounding metadata (search queries and URLs)
	searchQueries := []interface{}{}
	searchedURLs := []interface{}{}

	if groundingMetadata, ok := candidate["groundingMetadata"].(map[string]interface{}); ok {
		if queries, ok := groundingMetadata["webSearchQueries"].([]interface{}); ok {
			searchQueries = queries
		}
		if chunks, ok := groundingMetadata["groundingChunks"].([]interface{}); ok {
			for _, chunk := range chunks {
				if chunkMap, ok := chunk.(map[string]interface{}); ok {
					if web, ok := chunkMap["web"].(map[string]interface{}); ok {
						searchedURLs = append(searchedURLs, web)
					}
				}
			}
		}
	}

	if message == "" {
		return shared.ResponseStruct{Data: nil, Error: errors.New("web search returned no text output"), Status: false}, errors.New("web search returned no text output")
	}

	SendStep(w, "Web Search", "Piecing together the findings...")
	shared.PrettyPrint("GeminiWebSearch: Response", message)
	shared.PrettyPrint("GeminiWebSearch Ended", nil)

	responseData := map[string]interface{}{
		"message":        message,
		"searched_urls":  searchedURLs,
		"search_queries": searchQueries,
	}

	return shared.ResponseStruct{
		Data:   responseData,
		Error:  nil,
		Status: true,
	}, nil
}
