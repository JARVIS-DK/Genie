package llm

import (
	env "apps/genie-backend/config"
	"errors"
	"fmt"
	"libs/shared"
	"libs/shared/db_connectors/model"
	"libs/shared/utils/helpers"

	"go.mongodb.org/mongo-driver/mongo"
)

type GeminiRequest struct {
	Query        string                   `json:"query"`
	Prompt       string                   `json:"prompt"`
	Model        string                   `json:"model"`
	ApiKey       string                   `json:"api_key"`
	ChatHistory  []map[string]interface{} `json:"chat_history"` // prior conversation turns in Gemini contents format
	ToolCalls    []map[string]interface{} `json:"tool_calls"`
	ToolCallMode string                   `json:"tool_call_mode"` // "ANY", "AUTO", or "NONE". Defaults to "ANY".
}

type GeminiResponse struct {
	Message   string     `json:"message"`
	ToolCalls []ToolCall `json:"tool_calls"`
}

type ToolCall struct {
	FunctionName string                 `json:"function_name"`
	Args         map[string]interface{} `json:"args"`
}

type GeminiToolCallResult struct {
	FunctionName string                 `json:"function_name"`
	Args         map[string]interface{} `json:"args"`
}

func Gemini(data GeminiRequest, db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData) (GeminiResponse, error) {

	model := data.Model
	if model == "" {
		model = env.GlobalEnv["GOOGLE_GEMINI_CHAT_MODEL"].(string)
	}

	apiKey := data.ApiKey
	if apiKey == "" {
		return GeminiResponse{}, errors.New("api key is required")
	}

	geminiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%v:generateContent", model)

	// Build function declarations from the tool calls schema
	functionDeclarations := make([]map[string]interface{}, 0, len(data.ToolCalls))
	for _, tc := range data.ToolCalls {
		functionDeclarations = append(functionDeclarations, map[string]interface{}{
			"name":        tc["name"],
			"description": tc["description"],
			"parameters":  tc["parameters"],
		})
	}

	// Build contents: prepend chat history turns then append the current user message
	contents := make([]map[string]interface{}, 0, len(data.ChatHistory)+1)
	contents = append(contents, data.ChatHistory...)
	contents = append(contents, map[string]interface{}{
		"role":  "user",
		"parts": []map[string]interface{}{{"text": data.Query}},
	})

	geminiPayload := map[string]interface{}{
		"system_instruction": map[string]interface{}{
			"parts": []map[string]interface{}{{"text": data.Prompt}},
		},
		"contents": contents,
	}

	if len(functionDeclarations) > 0 {
		geminiPayload["tools"] = []map[string]interface{}{
			{"functionDeclarations": functionDeclarations},
		}
		toolMode := data.ToolCallMode
		if toolMode == "" {
			toolMode = "ANY"
		}
		geminiPayload["tool_config"] = map[string]interface{}{
			"function_calling_config": map[string]interface{}{
				"mode": toolMode,
			},
		}
	}

	headers := map[string]interface{}{
		"Content-Type":   "application/json",
		"x-goog-api-key": apiKey,
	}

	apiRequest := shared.ApiRequestDto{
		URL:     geminiURL,
		Method:  "POST",
		Headers: headers,
		Body:    geminiPayload,
		Timeout: 600,
	}

	apiResp, err := shared.APIRequestComponentProcessor(apiRequest)
	if err != nil {
		return GeminiResponse{}, fmt.Errorf("gemini api request failed: %v", err)
	}

	var apiResponse shared.ApiResponseDto
	helpers.JsonMarshaller(apiResp, &apiResponse)

	if apiResponse.Status != nil && !*apiResponse.Status {
		return GeminiResponse{}, apiResponse.Error
	}

	var response map[string]interface{}
	helpers.JsonMarshaller(apiResponse.Data.Response, &response)

	// Check for API-level error
	if errVal, ok := response["error"]; ok {
		if errMap, ok := errVal.(map[string]interface{}); ok {
			if msg, ok := errMap["message"].(string); ok {
				return GeminiResponse{}, errors.New(msg)
			}
		}
	}

	candidates, ok := response["candidates"].([]interface{})
	if !ok || len(candidates) == 0 {
		return GeminiResponse{}, errors.New("no candidates in gemini response")
	}

	var candidate map[string]interface{}
	helpers.JsonMarshaller(candidates[0], &candidate)

	content, ok := candidate["content"].(map[string]interface{})
	if !ok {
		return GeminiResponse{}, errors.New("content not found in candidate")
	}

	parts, ok := content["parts"].([]interface{})
	if !ok || len(parts) == 0 {
		return GeminiResponse{}, errors.New("parts not found or empty in content")
	}

	// Collect text parts and function call parts from the response.
	// Gemini may return plain text, tool calls, or both.
	messages := ""
	toolCalls := make([]ToolCall, 0)

	for _, p := range parts {
		partMap, ok := p.(map[string]interface{})
		if !ok {
			continue
		}

		// Collect text content
		if text, ok := partMap["text"].(string); ok && text != "" {
			messages += text
		}

		// Collect function calls (try both camelCase and snake_case)
		funcCall, ok := partMap["functionCall"].(map[string]interface{})
		if !ok {
			funcCall, ok = partMap["function_call"].(map[string]interface{})
		}
		if ok {
			name, _ := funcCall["name"].(string)
			args, _ := funcCall["args"].(map[string]interface{})
			toolCalls = append(toolCalls, ToolCall{
				FunctionName: name,
				Args:         args,
			})
		}
	}

	if len(messages) == 0 && len(toolCalls) == 0 {
		return GeminiResponse{}, errors.New("no content found in gemini response")
	}

	return GeminiResponse{
		Message:   messages,
		ToolCalls: toolCalls,
	}, nil
}

func GetApiKey(code string, db shared.MongoRepositoryFunctions) (string, error) {
	apiKeysCollectionName := model.CollectionName["API_KEYS"]
	filterQuery := map[string]interface{}{
		"code": code,
	}
	existingRecord, err := db.GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], apiKeysCollectionName, filterQuery)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return "", err
	}
	var existingRecordMap map[string]interface{}
	shared.JsonMarshaller(existingRecord, &existingRecordMap)

	if apiKeyAny, ok := existingRecordMap["api_key"]; ok {
		return fmt.Sprint(apiKeyAny), nil
	}

	return "", errors.New("api key not found")
}
