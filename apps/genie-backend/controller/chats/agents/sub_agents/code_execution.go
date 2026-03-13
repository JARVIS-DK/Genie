package sub_agents

import (
	env "apps/genie-backend/config"
	"apps/genie-backend/controller/chats/agents/prompts"
	"apps/genie-backend/controller/chats/llm"
	"apps/genie-backend/controller/chats/models"
	"errors"
	"fmt"
	"libs/shared"
	"libs/shared/utils/helpers"
)

type GeminiCodeExecutionRequest struct {
	Query string `json:"query"`
}

func GeminiCodeExecution(data GeminiCodeExecutionRequest, db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData, sw ...*models.StreamWriter) (shared.ResponseStruct, error) {
	var w *models.StreamWriter
	if len(sw) > 0 {
		w = sw[0]
	}
	fmt.Println("GeminiCodeExecution Started", data)

	SendStep(w, "Code Execution", "Booting up the sandbox...")
	botApiKey, err := llm.GetApiKey("CODE_EXECUTION", db)
	if err != nil {
		shared.PrettyPrint("GeminiCodeExecution: Failed to get CODE_EXECUTION API key", err)
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed to get CODE_EXECUTION api key: %v", err), Status: false}, err
	}

	codeExecModel := "gemini-2.5-flash"
	if val, ok := env.GlobalEnv["GOOGLE_GEMINI_CHAT_MODEL"].(string); ok && val != "" {
		codeExecModel = val
	}

	geminiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%v:generateContent", codeExecModel)

	headers := map[string]interface{}{
		"Content-Type":   "application/json",
		"x-goog-api-key": botApiKey,
	}

	geminiPayload := map[string]interface{}{
		"tools": []map[string]interface{}{
			{"code_execution": map[string]interface{}{}},
			{"google_search": map[string]interface{}{}},
		},
		"system_instruction": map[string]interface{}{
			"parts": []map[string]interface{}{
				{"text": prompts.CodeExecutionPrompt},
			},
		},
		"contents": []map[string]interface{}{
			{
				"role": "user",
				"parts": []map[string]interface{}{
					{"text": data.Query},
				},
			},
		},
	}

	SendStep(w, "Code Execution", "Crunching the code...")
	shared.PrettyPrint("GeminiCodeExecution: Calling Gemini Code Execution API", geminiPayload)

	apiRequest := shared.ApiRequestDto{
		URL:     geminiURL,
		Method:  "POST",
		Headers: headers,
		Body:    geminiPayload,
		Timeout: 120,
	}

	apiResp, err := shared.APIRequestComponentProcessor(apiRequest)
	if err != nil {
		shared.PrettyPrint("GeminiCodeExecution: API Request Error", err)
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("code execution API error: %v", err), Status: false}, err
	}

	var apiResponse shared.ApiResponseDto
	helpers.JsonMarshaller(apiResp, &apiResponse)

	var geminiResp map[string]interface{}
	helpers.JsonMarshaller(apiResponse.Data.Response, &geminiResp)
	shared.PrettyPrint("GeminiCodeExecution: Parsed API response", geminiResp)

	if errVal, ok := geminiResp["error"]; ok {
		if errMap, ok := errVal.(map[string]interface{}); ok {
			if msg, ok := errMap["message"].(string); ok {
				shared.PrettyPrint("GeminiCodeExecution: Gemini Platform Error", msg)
				return shared.ResponseStruct{Data: nil, Error: errors.New(msg), Status: false}, nil
			}
		}
	}

	candidates, ok := geminiResp["candidates"].([]interface{})
	if !ok || len(candidates) == 0 {
		shared.PrettyPrint("GeminiCodeExecution: No candidates in response", nil)
		return shared.ResponseStruct{Data: nil, Error: errors.New("no result from gemini code execution"), Status: false}, nil
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
		return shared.ResponseStruct{Data: nil, Error: errors.New("code execution returned no results"), Status: false}, nil
	}

	SendStep(w, "Code Execution", "Wrapping up the results...")
	shared.PrettyPrint("GeminiCodeExecution: Response Text", responseText)

	fmt.Println("GeminiCodeExecution Ended")

	return shared.ResponseStruct{
		Data: map[string]interface{}{
			"message": responseText,
		},
		Error:  nil,
		Status: true,
	}, nil
}
