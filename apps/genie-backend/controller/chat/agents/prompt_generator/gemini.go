package prompt_generator

import (
	"errors"
	"fmt"
	"libs/shared"
	"libs/shared/utils/helpers"
	"strings"

	env "apps/opsMatrix-backend/config"
)

func Gemini(query string, agentName string, apiKey string) (string, error) {

	prompt := ""

	switch agentName {
	case "IMAGE_GENERATION":
		prompt = getImageGenerationPrompt()
		break
	case "VIDEO_GENERATION":
		prompt = getVideoGenerationPrompt()
		break
	case "AUDIO_GENERATION":
		prompt = getAudioGenerationPrompt()
		break
	case "GENERAL_CHAT_BOT":
		prompt = getGeneralChatBotPrompt()
		break
	case "DECOMPOSE_AGENT_SELECTION":
		prompt = getDecomposeAgentPrompt()
		break
	case "PARAMETER_GETTING":
		prompt = getParameterGettingPrompt()
		break
	case "CODE_GENERATOR_AND_DEBUGGER":
		prompt = codeGenerationAndDebuggerPrompt()
		break
	case "SIMPLE_CHAT_BOT":
		prompt = simpleQueryChatbotPrompt()
		break
	case "MERGE_RESPONSES":
		prompt = getMergeResponsesPrompt()
	default:
		prompt = ""
	}

	model := env.GlobalEnv["GOOGLE_GEMINI_CHAT_MODEL"].(string)

	if agentName == "GENERAL_CHAT_BOT" {
		model = env.GlobalEnv["GOOGLE_GEMINI_GENERAL_CHAT_MODEL"].(string)
	}

	geminiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%v:generateContent", model)

	geminiPayload := map[string]interface{}{
		"system_instruction": map[string]interface{}{
			"parts": []map[string]interface{}{{"text": prompt}},
		},
		"contents": []map[string]interface{}{
			{"parts": []map[string]interface{}{{"text": query}}},
		},
	}

	headers := map[string]interface{}{
		"Content-Type":   "application/json",
		"x-goog-api-key": apiKey,
	}

	apirequest := shared.ApiRequestDto{
		URL:     geminiURL,
		Method:  "POST",
		Headers: headers,
		Body:    geminiPayload,
		Timeout: 60,
	}

	apiResp, err := shared.APIRequestComponentProcessor(apirequest)
	if err != nil {
		return "", err
	}
	var apiResponse shared.ApiResponseDto
	helpers.JsonMarshaller(apiResp, &apiResponse)

	if *(apiResponse.Status) == false {
		return "", apiResponse.Error
	}

	var response map[string]interface{}
	helpers.JsonMarshaller(apiResponse.Data.Response, &response)

	if response["candidates"] == nil {
		return "", errors.New("candidates not found in response")
	}

	var candidate map[string]interface{}
	helpers.JsonMarshaller(response["candidates"].([]interface{})[0], &candidate)

	if candidate["content"] == nil {
		return "", errors.New("content not found in response")
	}

	var content map[string]interface{}
	helpers.JsonMarshaller(candidate["content"], &content)

	partsAny, ok := content["parts"]
	if !ok {
		return "", errors.New("parts not found in response")
	}

	parts, ok := partsAny.([]interface{})
	if !ok || len(parts) == 0 {
		return "", errors.New("parts not found or empty in response")
	}

	var part map[string]interface{}
	helpers.JsonMarshaller(parts[0], &part)

	textAny, ok := part["text"]
	if !ok {
		return "", errors.New("text not found in response")
	}

	text, ok := textAny.(string)
	if !ok {
		return "", errors.New("text field is not a string in response")
	}

	shared.PrettyPrint("text", text)
	text = strings.ReplaceAll(text, "```json", "")
	text = strings.ReplaceAll(text, "```", "")
	shared.PrettyPrint("text", text)

	// var result struct {
	// 	Title          string `json:"title"`
	// 	EnhancedPrompt string `json:"enhanced_prompt"`
	// }
	// if err := json.Unmarshal([]byte(text), &result); err != nil {
	// 	return "", "", err
	// }

	return text, nil
}

func Gemini1(query string, apiKey string) (string, error) {

	prompt := "You are a helpful assistant. who can do websearch, deep research, image generation, video generation, audio generation, code generation and debugging, and parameter getting."
	model := env.GlobalEnv["GOOGLE_GEMINI_CHAT_MODEL"].(string)

	geminiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%v:generateContent", model)

	geminiPayload := map[string]interface{}{
		"system_instruction": map[string]interface{}{
			"parts": []map[string]interface{}{{"text": prompt}},
		},
		"contents": []map[string]interface{}{
			{"parts": []map[string]interface{}{{"text": query}}},
		},
		"tools": []map[string]interface{}{
			{"google_search": map[string]interface{}{}},
		},
	}

	headers := map[string]interface{}{
		"Content-Type":   "application/json",
		"x-goog-api-key": apiKey,
	}

	apirequest := shared.ApiRequestDto{
		URL:     geminiURL,
		Method:  "POST",
		Headers: headers,
		Body:    geminiPayload,
		Timeout: 60,
	}

	apiResp, err := shared.APIRequestComponentProcessor(apirequest)
	if err != nil {
		return "", err
	}
	var apiResponse shared.ApiResponseDto
	helpers.JsonMarshaller(apiResp, &apiResponse)

	if *(apiResponse.Status) == false {
		return "", apiResponse.Error
	}

	var response map[string]interface{}
	helpers.JsonMarshaller(apiResponse.Data.Response, &response)

	if response["candidates"] == nil {
		return "", errors.New("candidates not found in response")
	}

	var candidate map[string]interface{}
	helpers.JsonMarshaller(response["candidates"].([]interface{})[0], &candidate)

	if candidate["content"] == nil {
		return "", errors.New("content not found in response")
	}

	var content map[string]interface{}
	helpers.JsonMarshaller(candidate["content"], &content)

	partsAny, ok := content["parts"]
	if !ok {
		return "", errors.New("parts not found in response")
	}

	parts, ok := partsAny.([]interface{})
	if !ok || len(parts) == 0 {
		return "", errors.New("parts not found or empty in response")
	}

	var part map[string]interface{}
	helpers.JsonMarshaller(parts[0], &part)

	textAny, ok := part["text"]
	if !ok {
		return "", errors.New("text not found in response")
	}

	text, ok := textAny.(string)
	if !ok {
		return "", errors.New("text field is not a string in response")
	}

	shared.PrettyPrint("text", text)
	text = strings.ReplaceAll(text, "```json", "")
	text = strings.ReplaceAll(text, "```", "")
	shared.PrettyPrint("text", text)

	// var result struct {
	// 	Title          string `json:"title"`
	// 	EnhancedPrompt string `json:"enhanced_prompt"`
	// }
	// if err := json.Unmarshal([]byte(text), &result); err != nil {
	// 	return "", "", err
	// }

	return text, nil
}
