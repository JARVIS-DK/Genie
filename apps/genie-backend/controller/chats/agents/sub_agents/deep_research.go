package sub_agents

import (
	"apps/genie-backend/controller/chats/llm"
	"apps/genie-backend/controller/chats/models"
	"errors"
	"fmt"
	"libs/shared"
	"libs/shared/utils/helpers"
)

type GeminiDeepResearchRequest struct {
	Query        string `json:"query"`
	OutputFormat string `json:"output_format"`
	Url          string `json:"url"`
}

func GeminiDeepResearch(data GeminiDeepResearchRequest, db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData, sw ...*models.StreamWriter) (shared.ResponseStruct, error) {
	var w *models.StreamWriter
	if len(sw) > 0 {
		w = sw[0]
	}
	fmt.Println("GeminiDeepResearch Started", data)

	SendStep(w, "Deep Research", "Diving into the rabbit hole...")
	botApiKey, err := llm.GetApiKey("JINA_DEEP_SEARCH", db)
	if err != nil {
		shared.PrettyPrint("GeminiDeepResearch: Failed to get DEEP_RESEARCH API key", err)
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("failed to get DEEP_RESEARCH api key: %v", err), Status: false}, err
	}

	// Build the research query
	inputQuery := data.Query
	if data.OutputFormat != "" {
		inputQuery += "\n\nOutput Format: " + data.OutputFormat
	}
	if data.Url != "" {
		inputQuery += "\n\nPrimary Source URL: " + data.Url
	}

	apiURL := "https://deepsearch.jina.ai/v1/chat/completions"

	headers := map[string]interface{}{
		"Content-Type":  "application/json",
		"Authorization": "Bearer " + botApiKey,
	}

	payload := map[string]interface{}{
		"model": "jina-deepsearch-v1",
		"messages": []map[string]interface{}{
			{
				"role":    "user",
				"content": inputQuery,
			},
		},
		"reasoning_effort": "medium",
	}

	SendStep(w, "Deep Research", "Excavating knowledge from the depths...")
	shared.PrettyPrint("GeminiDeepResearch: Calling Jina DeepSearch API", payload)

	apiRequest := shared.ApiRequestDto{
		URL:     apiURL,
		Method:  "POST",
		Headers: headers,
		Body:    payload,
		Timeout: 600,
	}

	apiResp, err := shared.APIRequestComponentProcessor(apiRequest)
	if err != nil {
		shared.PrettyPrint("GeminiDeepResearch: API Request Error", err)
		return shared.ResponseStruct{Data: nil, Error: fmt.Errorf("deep research API error: %v", err), Status: false}, err
	}

	var apiResponse shared.ApiResponseDto
	helpers.JsonMarshaller(apiResp, &apiResponse)

	var result map[string]interface{}
	helpers.JsonMarshaller(apiResponse.Data.Response, &result)
	shared.PrettyPrint("GeminiDeepResearch: Parsed API response", result)

	if errVal, ok := result["error"]; ok {
		if errMap, ok := errVal.(map[string]interface{}); ok {
			if msg, ok := errMap["message"].(string); ok {
				shared.PrettyPrint("GeminiDeepResearch: Platform Error", msg)
				return shared.ResponseStruct{Data: nil, Error: errors.New(msg), Status: false}, nil
			}
		}
	}

	// Extract text from choices[0].delta.content (or choices[0].message.content)
	choices, ok := result["choices"].([]interface{})
	if !ok || len(choices) == 0 {
		shared.PrettyPrint("GeminiDeepResearch: No choices in response", nil)
		return shared.ResponseStruct{Data: nil, Error: errors.New("no result from deep research"), Status: false}, nil
	}

	responseText := ""
	if choiceMap, ok := choices[0].(map[string]interface{}); ok {
		// Try "delta" first (streaming-style response)
		if delta, ok := choiceMap["delta"].(map[string]interface{}); ok {
			if content, ok := delta["content"].(string); ok {
				responseText = content
			}
		}
		// Try "message" (standard chat completion response)
		if responseText == "" {
			if message, ok := choiceMap["message"].(map[string]interface{}); ok {
				if content, ok := message["content"].(string); ok {
					responseText = content
				}
			}
		}
	}

	if responseText == "" {
		return shared.ResponseStruct{Data: nil, Error: errors.New("deep research returned no text output"), Status: false}, nil
	}

	SendStep(w, "Deep Research", "Compiling the research report...")
	shared.PrettyPrint("GeminiDeepResearch: Response Text", responseText)
	fmt.Println("GeminiDeepResearch Ended")

	responseData := map[string]interface{}{
		"message": responseText,
	}

	if visitedURLs, ok := result["visitedURLs"]; ok {
		responseData["visitedURLs"] = visitedURLs
	}
	if readURLs, ok := result["readURLs"]; ok {
		responseData["readURLs"] = readURLs
	}

	return shared.ResponseStruct{
		Data:   responseData,
		Error:  nil,
		Status: true,
	}, nil
}
