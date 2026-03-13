package sub_agents

import (
	"fmt"
	"libs/shared"
)

var browserUseBaseUrl string = "https://api.browser-use.com/api/v2"

func BrowserUseCreateSession(apiKey string) (map[string]interface{}, error) {

	url := browserUseBaseUrl + "/sessions"

	header := map[string]interface{}{
		"Content-Type":          "application/json",
		"X-Browser-Use-API-Key": apiKey,
	}

	body := map[string]interface{}{
		"proxyCountryCode":    "in",
		"browserScreenWidth":  720,
		"browserScreenHeight": 720,
		"perpersistMemory":    true,
		"keepAlive":           true,
	}

	request := shared.ApiRequestDto{
		URL:         url,
		Method:      "POST",
		Headers:     header,
		Body:        body,
		QueryParams: nil,
		Timeout:     60,
	}

	resp, err := shared.APIRequestComponentProcessor(request)
	if err != nil {
		shared.NormalPrint("BrowserUseCreateSession Error:", err)
		return nil, err
	}
	shared.NormalPrint("BrowserUseCreateSession Response:", resp)

	reponse := resp.Data["response_data"]
	shared.NormalPrint("BrowserUseCreateSession Response Data:", reponse)

	responseMap, ok := reponse.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("response data is not of type map[string]interface{}")
	}

	id, ok := responseMap["id"].(string)
	if !ok {
		return nil, fmt.Errorf("id is missing or not a string in the response")
	}

	return map[string]interface{}{
		"session_id": id,
	}, nil
}

func BrowserUseCreateTask(task string, sessionId string, apiKey string) (map[string]interface{}, error) {

	url := browserUseBaseUrl + "/tasks"

	header := map[string]interface{}{
		"Content-Type":          "application/json",
		"X-Browser-Use-API-Key": apiKey,
	}

	body := map[string]interface{}{
		"task":      task,
		"sessionId": sessionId,
	}

	request := shared.ApiRequestDto{
		URL:         url,
		Method:      "POST",
		Headers:     header,
		Body:        body,
		QueryParams: nil,
		Timeout:     60,
	}

	resp, err := shared.APIRequestComponentProcessor(request)
	if err != nil {
		shared.NormalPrint("BrowserUseCreateTask Error:", err)
		return nil, err
	}
	shared.NormalPrint("BrowserUseCreateTask Response:", resp)

	reponse := resp.Data["response_data"]
	shared.NormalPrint("BrowserUseCreateTask Response Data:", reponse)

	responseMap, ok := reponse.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("response data is not of type map[string]interface{}")
	}

	id, ok := responseMap["id"].(string)
	if !ok {
		return nil, fmt.Errorf("id is missing or not a string in the response")
	}

	return map[string]interface{}{
		"session_id": id,
	}, nil
}

func BrowserUseGetTask(taskId string, apiKey string) (map[string]interface{}, error) {

	url := browserUseBaseUrl + "/tasks/" + taskId

	header := map[string]interface{}{
		"X-Browser-Use-API-Key": apiKey,
	}

	request := shared.ApiRequestDto{
		URL:         url,
		Method:      "GET",
		Headers:     header,
		Body:        nil,
		QueryParams: nil,
		Timeout:     60,
	}

	resp, err := shared.APIRequestComponentProcessor(request)
	if err != nil {
		shared.NormalPrint("BrowserUseGetTask Error:", err)
		return nil, err
	}
	shared.NormalPrint("BrowserUseGetTask Response:", resp)

	reponse := resp.Data["response_data"]
	shared.NormalPrint("BrowserUseGetTask Response Data:", reponse)

	responseMap, ok := reponse.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("response data is not of type map[string]interface{}")
	}

	sessionID, _ := responseMap["id"].(string)
	status, _ := responseMap["status"].(string)
	isSuccess, _ := responseMap["isSuccess"].(bool)

	var filteredSteps []map[string]interface{}
	if stepsInterface, ok := responseMap["steps"].([]interface{}); ok {
		for _, step := range stepsInterface {
			if stepMap, ok := step.(map[string]interface{}); ok {
				filteredStep := make(map[string]interface{})
				if num, ok := stepMap["number"]; ok {
					filteredStep["number"] = num
				}
				if url, ok := stepMap["url"]; ok {
					filteredStep["url"] = url
				}
				if screenshotUrl, ok := stepMap["screenshotUrl"]; ok {
					filteredStep["screenshot_url"] = screenshotUrl
				}
				if actions, ok := stepMap["actions"]; ok {
					filteredStep["actions"] = actions
				}
				if evaluationPreviousGoal, ok := stepMap["evaluationPreviousGoal"]; ok {
					filteredStep["evaluation_previous_goal"] = evaluationPreviousGoal
				}
				filteredSteps = append(filteredSteps, filteredStep)
			}
		}
	}

	return map[string]interface{}{
		"session_id": sessionID,
		"status":     status,
		"steps":      filteredSteps,
		"is_success": isSuccess,
	}, nil
}

func BrowserUseGetTaskStatus(taskId string, apiKey string) (map[string]interface{}, error) {

	url := browserUseBaseUrl + "/tasks/" + taskId + "/status"

	header := map[string]interface{}{
		"X-Browser-Use-API-Key": apiKey,
	}

	request := shared.ApiRequestDto{
		URL:         url,
		Method:      "GET",
		Headers:     header,
		Body:        nil,
		QueryParams: nil,
		Timeout:     60,
	}

	resp, err := shared.APIRequestComponentProcessor(request)
	if err != nil {
		shared.NormalPrint("BrowserUseGetTaskStatus Error:", err)
		return nil, err
	}
	shared.NormalPrint("BrowserUseGetTaskStatus Response:", resp)

	reponse := resp.Data["response_data"]
	shared.NormalPrint("BrowserUseGetTaskStatus Response Data:", reponse)

	responseMap, ok := reponse.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("response data is not of type map[string]interface{}")
	}

	status, _ := responseMap["status"].(string)
	output, _ := responseMap["output"].(string)
	isSuccess, _ := responseMap["isSuccess"].(bool)

	return map[string]interface{}{
		"status":     status,
		"output":     output,
		"is_success": isSuccess,
	}, nil
}

func BrowserUseUpdateTask(taskId string, apiKey string) (map[string]interface{}, error) {

	url := browserUseBaseUrl + "/tasks/" + taskId

	header := map[string]interface{}{
		"Content-Type":          "application/json",
		"X-Browser-Use-API-Key": apiKey,
	}

	body := map[string]interface{}{
		"action": "stop",
	}

	request := shared.ApiRequestDto{
		URL:         url,
		Method:      "PATCH",
		Headers:     header,
		Body:        body,
		QueryParams: nil,
		Timeout:     60,
	}

	resp, err := shared.APIRequestComponentProcessor(request)
	if err != nil {
		shared.NormalPrint("BrowserUseUpdateTask Error:", err)
		return nil, err
	}
	shared.NormalPrint("BrowserUseUpdateTask Response:", resp)

	reponse := resp.Data["response_data"]
	shared.NormalPrint("BrowserUseUpdateTask Response Data:", reponse)

	responseMap, ok := reponse.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("response data is not of type map[string]interface{}")
	}

	sessionID, _ := responseMap["id"].(string)
	status, _ := responseMap["status"].(string)
	output, _ := responseMap["output"].(string)
	isSuccess, _ := responseMap["isSuccess"].(bool)

	var filteredSteps []map[string]interface{}
	if stepsInterface, ok := responseMap["steps"].([]interface{}); ok {
		for _, step := range stepsInterface {
			if stepMap, ok := step.(map[string]interface{}); ok {
				filteredStep := make(map[string]interface{})
				if num, ok := stepMap["number"]; ok {
					filteredStep["number"] = num
				}
				if url, ok := stepMap["url"]; ok {
					filteredStep["url"] = url
				}
				if screenshotUrl, ok := stepMap["screenshotUrl"]; ok {
					filteredStep["screenshot_url"] = screenshotUrl
				}
				if actions, ok := stepMap["actions"]; ok {
					filteredStep["actions"] = actions
				}
				if evaluationPreviousGoal, ok := stepMap["evaluationPreviousGoal"]; ok {
					filteredStep["evaluation_previous_goal"] = evaluationPreviousGoal
				}
				filteredSteps = append(filteredSteps, filteredStep)
			}
		}
	}

	return map[string]interface{}{
		"session_id": sessionID,
		"status":     status,
		"output":     output,
		"steps":      filteredSteps,
		"is_success": isSuccess,
	}, nil
}
