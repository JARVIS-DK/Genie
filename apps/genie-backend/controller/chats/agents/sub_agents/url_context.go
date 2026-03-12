package sub_agents

import (
	env "apps/genie-backend/config"
	"apps/genie-backend/controller/chats/agents/prompts"
	"apps/genie-backend/controller/chats/llm"
	"errors"
	"fmt"
	"libs/shared"
	"libs/shared/utils/helpers"
)

type GeminiUrlContextRequest struct {
	Query       string   `json:"query"`
	Urls        []string `json:"urls"`
	IsWebSearch bool     `json:"is_web_search"`
}

func GeminiUrlContext(data GeminiUrlContextRequest, db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData) (shared.ResponseStruct, error) {
	fmt.Println("GeminiUrlContext Started", data)

	botApiKey, err := llm.GetApiKey("URL_CONTEXT", db)
	if err != nil {
		shared.PrettyPrint("GeminiUrlContext: Failed to get URL_CONTEXT API key", err)
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed to get URL_CONTEXT api key: %v", err), Status: false}, err
	}

	urlContextModel := "gemini-2.5-flash"
	if val, ok := env.GlobalEnv["GOOGLE_GEMINI_CHAT_MODEL"].(string); ok && val != "" {
		urlContextModel = val
	}

	geminiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%v:generateContent", urlContextModel)

	headers := map[string]interface{}{
		"Content-Type":   "application/json",
		"x-goog-api-key": botApiKey,
	}

	// Build the query text with URLs embedded
	queryText := data.Query
	if len(data.Urls) > 0 {
		queryText += "\n\nURLs to analyze:\n"
		for _, url := range data.Urls {
			queryText += "- " + url + "\n"
		}
	}

	tools := []map[string]interface{}{
		{"url_context": map[string]interface{}{}},
		{"google_search": map[string]interface{}{}},
	}

	geminiPayload := map[string]interface{}{
		"tools": tools,
		"system_instruction": map[string]interface{}{
			"parts": []map[string]interface{}{
				{"text": prompts.UrlContextPrompt},
			},
		},
		"contents": []map[string]interface{}{
			{
				"role": "user",
				"parts": []map[string]interface{}{
					{"text": queryText},
				},
			},
		},
	}

	shared.PrettyPrint("GeminiUrlContext: Calling Gemini URL Context API", geminiPayload)

	apiRequest := shared.ApiRequestDto{
		URL:     geminiURL,
		Method:  "POST",
		Headers: headers,
		Body:    geminiPayload,
		Timeout: 120,
	}

	apiResp, err := shared.APIRequestComponentProcessor(apiRequest)
	if err != nil {
		shared.PrettyPrint("GeminiUrlContext: API Request Error", err)
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("url context API error: %v", err), Status: false}, err
	}

	var apiResponse shared.ApiResponseDto
	helpers.JsonMarshaller(apiResp, &apiResponse)

	var geminiResp map[string]interface{}
	helpers.JsonMarshaller(apiResponse.Data.Response, &geminiResp)
	shared.PrettyPrint("GeminiUrlContext: Parsed API response", geminiResp)

	if errVal, ok := geminiResp["error"]; ok {
		if errMap, ok := errVal.(map[string]interface{}); ok {
			if msg, ok := errMap["message"].(string); ok {
				shared.PrettyPrint("GeminiUrlContext: Gemini Platform Error", msg)
				return shared.ResponseStruct{Data: nil, Error: errors.New(msg), Status: false}, nil
			}
		}
	}

	candidates, ok := geminiResp["candidates"].([]interface{})
	if !ok || len(candidates) == 0 {
		shared.PrettyPrint("GeminiUrlContext: No candidates in response", nil)
		return shared.ResponseStruct{Data: nil, Error: errors.New("no result from gemini url context"), Status: false}, nil
	}

	responseText := ""

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
				responseText += text + "\n"
			}
		}
	}

	if responseText == "" {
		return shared.ResponseStruct{Data: nil, Error: errors.New("url context returned no results"), Status: false}, nil
	}

	shared.PrettyPrint("GeminiUrlContext: Response Text", responseText)

	fmt.Println("GeminiUrlContext Ended")

	return shared.ResponseStruct{
		Data: map[string]interface{}{
			"message": responseText,
		},
		Error:  nil,
		Status: true,
	}, nil
}
