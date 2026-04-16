package agents

import (
	"apps/genie-backend/controller/chats/agents/prompts"
	sub_agents "apps/genie-backend/controller/chats/agents/sub_agents"
	"apps/genie-backend/controller/chats/llm"
	"apps/genie-backend/controller/chats/models"
	"encoding/json"
	"fmt"
	"libs/shared"
	"libs/shared/db_connectors/model"
	"sort"
	"strings"
	"sync"
	"time"

	env "apps/genie-backend/config"
)

// fetchRecentHistory retrieves the last `limit` chat messages for a conversation
// and returns them formatted as Gemini content turns (role + parts).
func fetchRecentHistory(db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData, conversationId string, limit int) []map[string]interface{} {
	if conversationId == "" {
		return nil
	}

	collectionName := model.CollectionName["CHAT_HISTORY"]
	filterQuery := map[string]interface{}{
		"user_id":         metaData.UserId,
		"conversation_id": conversationId,
	}

	record, err := db.GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], collectionName, filterQuery)
	if err != nil || record == nil {
		return nil
	}

	var doc map[string]interface{}
	shared.JsonMarshaller(record, &doc)

	historyRaw, ok := doc["history"].(map[string]interface{})
	if !ok {
		return nil
	}

	// Flatten all daily message arrays into a single slice
	var allMessages []models.ChatMessage
	for _, dayRaw := range historyRaw {
		var msgs []models.ChatMessage
		shared.JsonMarshaller(dayRaw, &msgs)
		allMessages = append(allMessages, msgs...)
	}

	// Sort chronologically
	sort.Slice(allMessages, func(i, j int) bool {
		return allMessages[i].CreatedAt.Before(allMessages[j].CreatedAt)
	})

	// Keep only the last `limit` messages
	if len(allMessages) > limit {
		allMessages = allMessages[len(allMessages)-limit:]
	}

	// Convert to Gemini contents format
	contents := make([]map[string]interface{}, 0, len(allMessages))
	for _, msg := range allMessages {
		role := "user"
		if msg.Role != "user" {
			role = "model"
		}
		contents = append(contents, map[string]interface{}{
			"role":  role,
			"parts": []map[string]interface{}{{"text": msg.Message}},
		})
	}
	return contents
}

func Orchestrator(data models.ExecuteRequestDto, db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData) (models.ExecuteResponseDto, error) {

	toolSelectionPrompt := prompts.DecomposeToolSelectionPrompt
	finalResponsePrompt := prompts.DecomposeFinalResponsePrompt
	toolCalls := prompts.DecomposeToolCalls

	// When an optional agent is specified, use its dedicated tool calls instead
	optionalAgent := strings.ToLower(data.OptionalAgent)
	if optionalAgent != "" {
		if optionalTools, ok := prompts.DecomposeOptionalToolCalls[optionalAgent]; ok {
			toolCalls = optionalTools
			shared.PrettyPrint("Orchestrator: Using optional agent tools", optionalAgent)
		}
	}

	shared.PrettyPrint("Orchestrator Start Query:", data.Message)

	// Fetch last 10 messages for conversation context
	chatHistory := fetchRecentHistory(db, metaData, data.ConversationId, 10)

	apiKey, err := llm.GetApiKey("GENERAL_CHATBOT", db)
	if err != nil {
		return models.ExecuteResponseDto{
			Message:               err.Error(),
			AgentsExecutedResults: nil,
		}, err
	}
	classifierModel := env.GlobalEnv["GOOGLE_GEMINI_GENERAL_CHAT_MODEL"].(string)
	// Pre-check: classify query as greeting or tool-required
	classifierPayload := llm.GeminiRequest{
		Query:        data.Message,
		Prompt:       prompts.GenericQueryClassifierPrompt,
		ToolCalls:    prompts.GenericQueryClassifierToolCalls,
		ApiKey:       apiKey,
		Model:        classifierModel,
		ToolCallMode: "AUTO",
		ChatHistory:  chatHistory,
	}

	classifierResp, classifierErr := llm.Gemini(classifierPayload, db, metaData)
	if classifierErr == nil && len(classifierResp.ToolCalls) == 0 && classifierResp.Message != "" {
		// Greeting/casual query — return the direct response without entering the tool pipeline
		shared.PrettyPrint("Orchestrator: Generic query detected, returning direct response", classifierResp.Message)
		return models.ExecuteResponseDto{
			Message:               classifierResp.Message,
			AgentsExecutedResults: nil,
		}, nil
	}

	currentQuery := data.Message
	finalMessage := ""
	allToolResults := ""
	var resultsMu sync.Mutex
	agentResults := []models.AgentsExecutedResults{}

	orchestratorModel := env.GlobalEnv["GOOGLE_GEMINI_CHAT_MODEL"].(string)
	orchestratorApiKey, err := llm.GetApiKey("ORCHESTRATOR", db)
	if err != nil {
		return models.ExecuteResponseDto{
			Message:               err.Error(),
			AgentsExecutedResults: nil,
		}, err
	}

	for i := 0; i < 1; i++ { // Limit iterations to prevent infinite loops
		geminiPayload := llm.GeminiRequest{
			Query:        currentQuery,
			Prompt:       toolSelectionPrompt,
			ToolCalls:    toolCalls,
			ApiKey:       orchestratorApiKey,
			Model:        orchestratorModel,
			ToolCallMode: "AUTO",
		}

		resp, err := llm.Gemini(geminiPayload, db, metaData)
		if err != nil {
			shared.PrettyPrint("Orchestrator Gemini Error", err)
			return models.ExecuteResponseDto{
				Message:               err.Error(),
				AgentsExecutedResults: agentResults,
			}, err
		}
		shared.PrettyPrint(fmt.Sprintf("Orchestrator Iteration %d ToolCalls", i), len(resp.ToolCalls))

		if len(resp.ToolCalls) > 0 {
			toolResultsMsg := "\n\nTool Execution Results:\n"

			var wg sync.WaitGroup
			results := make([]string, len(resp.ToolCalls))

			for i, tc := range resp.ToolCalls {
				wg.Add(1)
				go func(index int, toolCall llm.ToolCall) {
					defer wg.Done()
					agentName := toolCall.FunctionName

					startedAt := time.Now().UTC()
					agentResp, err := ExecuteAgents(agentName, toolCall.Args, db, metaData)
					completedAt := time.Now().UTC()

					var agentRes models.AgentsExecutedResults
					agentRes.AgentName = agentName
					agentRes.Query = currentQuery
					agentRes.StartedAt = startedAt
					agentRes.CompletedAt = completedAt

					if err != nil {
						shared.PrettyPrint("Orchestrator Agent Execution Failed", fmt.Sprintf("Agent: %s, Error: %v", agentName, err))
						agentRes.AgentStatus = "FAILED"
						agentRes.ResponseError = err.Error()
						results[index] = fmt.Sprintf("- Tool '%s' failed with error: %v\n", agentName, err)
					} else {
						// Check if the response is essentially an empty map which indicates it produced nothing
						isEmpty := false
						if fmt.Sprint(agentResp.Data) == "map[]" || agentResp.Data == nil {
							isEmpty = true
						}

						if isEmpty {
							agentRes.AgentStatus = "FAILED"
							agentRes.ResponseError = "Tool executed successfully but returned zero results/images."
							results[index] = fmt.Sprintf("- Tool '%s' failed: Returned no results.\n", agentName)
						} else {
							agentRes.AgentStatus = "SUCCESS"
							agentRes.Response = agentResp.Data
							results[index] = fmt.Sprintf("- Tool '%s' returned: %v\n", agentName, agentResp.Data)
						}
					}

					resultsMu.Lock()
					agentResults = append(agentResults, agentRes)
					resultsMu.Unlock()
				}(i, tc)
			}

			wg.Wait()

			for _, res := range results {
				toolResultsMsg += res
				allToolResults += res + "\n"
			}

			if resp.Message != "" && resp.Message != "DONE" {
				currentQuery += "\n\nAssistant: " + resp.Message
			}

			// Add instructions to stop blind retries if tools fail repeatedly
			currentQuery += toolResultsMsg + "\n\nGiven the above tool results, what is the next step? If the user query is satisfied or you have enough info, return no tool calls (or respond with 'DONE') to proceed to final response generation. If a tool failed, DO NOT retry the exact same tool call; either modify your parameters or respond with 'DONE'."

		} else {
			// No more tool calls needed; exit the tool selection loop
			break
		}
	}

	// Final response generation using the gathered context
	finalQuery := currentQuery + "\n\nBased on all the information gathered above, please provide the final response to the user query."

	// Inject all tool execution results into the final response prompt.
	finalPrompt := strings.Replace(finalResponsePrompt, "[TOOL_EXECUTION_RESULTS]", allToolResults, 1)

	finalPayload := llm.GeminiRequest{
		Query:  finalQuery,
		Prompt: finalPrompt,
		ApiKey: apiKey,
		// ChatHistory: chatHistory,
	}

	finalResp, err := llm.Gemini(finalPayload, db, metaData)
	if err != nil {
		return models.ExecuteResponseDto{
			Message:               err.Error(),
			AgentsExecutedResults: agentResults,
		}, err
	}
	finalMessage = finalResp.Message
	shared.PrettyPrint("Orchestrator Final Message Generated", finalMessage)

	finalResponse := models.ExecuteResponseDto{
		Message:               finalMessage,
		AgentsExecutedResults: agentResults,
	}
	return finalResponse, nil
}

// OrchestratorStream is the streaming variant of Orchestrator.
// It sends SSE chunks via the StreamWriter as agents progress.
// Called only when the client requests is_stream=true.
// agentDisplayName maps raw tool/function names to user-friendly display names
// that match the names used by sub-agents in their SendStep calls.
var agentDisplayName = map[string]string{
	"image_generation": "Image Generation",
	"video_generation": "Video Generation",
	"audio_generation": "Audio Generation",
	"code_execution":   "Code Execution",
	"url_context":      "URL Context",
	"deep_research":    "Deep Research",
	"web_search":       "Web Search",
}

func displayName(raw string) string {
	if dn, ok := agentDisplayName[raw]; ok {
		return dn
	}
	return raw
}

// parseActionString converts a raw action JSON string like
// `{"navigate": {"url": "https://example.com"}}` or `{"done": {"text": "...", "success": true}}`
// into a human-readable description.
func parseActionString(actionStr string) string {
	var actionMap map[string]interface{}
	if err := json.Unmarshal([]byte(actionStr), &actionMap); err != nil {
		return actionStr
	}
	for actionType, params := range actionMap {
		switch actionType {
		case "navigate":
			if p, ok := params.(map[string]interface{}); ok {
				if url, ok := p["url"].(string); ok {
					return fmt.Sprintf("Navigating to %s", url)
				}
			}
			return "Navigating..."
		case "click":
			if p, ok := params.(map[string]interface{}); ok {
				if text, ok := p["text"].(string); ok && text != "" {
					return fmt.Sprintf("Clicking \"%s\"", text)
				}
				if selector, ok := p["selector"].(string); ok && selector != "" {
					return fmt.Sprintf("Clicking element %s", selector)
				}
			}
			return "Clicking element"
		case "type", "input_text":
			if p, ok := params.(map[string]interface{}); ok {
				if text, ok := p["text"].(string); ok {
					preview := text
					if len(preview) > 50 {
						preview = preview[:50] + "..."
					}
					return fmt.Sprintf("Typing \"%s\"", preview)
				}
			}
			return "Typing text"
		case "scroll":
			if p, ok := params.(map[string]interface{}); ok {
				if dir, ok := p["direction"].(string); ok {
					return fmt.Sprintf("Scrolling %s", dir)
				}
			}
			return "Scrolling"
		case "done":
			if p, ok := params.(map[string]interface{}); ok {
				if text, ok := p["text"].(string); ok && text != "" {
					preview := text
					if len(preview) > 80 {
						preview = preview[:80] + "..."
					}
					return fmt.Sprintf("Completed: %s", preview)
				}
			}
			return "Task completed"
		case "extract_content":
			return "Extracting page content"
		case "wait":
			return "Waiting..."
		case "go_back":
			return "Going back"
		case "screenshot":
			return "Taking screenshot"
		case "switch_tab":
			return "Switching tab"
		default:
			return fmt.Sprintf("Action: %s", actionType)
		}
	}
	return actionStr
}

func OrchestratorStream(data models.ExecuteRequestDto, db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData, sw *models.StreamWriter) (models.ExecuteResponseDto, error) {

	toolSelectionPrompt := prompts.DecomposeToolSelectionPrompt
	finalResponsePrompt := prompts.DecomposeFinalResponsePrompt
	toolCalls := prompts.DecomposeToolCalls

	optionalAgent := strings.ToLower(data.OptionalAgent)
	if optionalAgent != "" {
		if optionalTools, ok := prompts.DecomposeOptionalToolCalls[optionalAgent]; ok {
			toolCalls = optionalTools
		}
	}

	// --- STARTED: classifying ---
	sw.Send(models.StreamChunk{
		AgentName: "orchestrator",
		Message:   "Classifying query...",
		Status:    "STARTED",
	})

	// Fetch last 10 messages for conversation context
	chatHistory := fetchRecentHistory(db, metaData, data.ConversationId, 10)

	apiKey, err := llm.GetApiKey("GENERAL_CHATBOT", db)
	if err != nil {
		sw.Send(models.StreamChunk{AgentName: "orchestrator", Message: err.Error(), Status: "COMPLETED"})
		return models.ExecuteResponseDto{Message: err.Error()}, err
	}

	classifierModel := env.GlobalEnv["GOOGLE_GEMINI_GENERAL_CHAT_MODEL"].(string)
	classifierPayload := llm.GeminiRequest{
		Query:        data.Message,
		Prompt:       prompts.GenericQueryClassifierPrompt,
		ToolCalls:    prompts.GenericQueryClassifierToolCalls,
		ApiKey:       apiKey,
		Model:        classifierModel,
		ToolCallMode: "AUTO",
		ChatHistory:  chatHistory,
	}

	classifierResp, classifierErr := llm.Gemini(classifierPayload, db, metaData)
	if classifierErr == nil && len(classifierResp.ToolCalls) == 0 && classifierResp.Message != "" {
		sw.Send(models.StreamChunk{
			AgentName: "orchestrator",
			Message:   classifierResp.Message,
			Status:    "COMPLETED",
		})
		return models.ExecuteResponseDto{
			Message:               classifierResp.Message,
			AgentsExecutedResults: nil,
		}, nil
	}

	// --- INPROGRESS: tool selection ---
	sw.Send(models.StreamChunk{
		AgentName: "orchestrator",
		Message:   "Selecting Agents...",
		Status:    "INPROGRESS",
	})

	currentQuery := data.Message
	allToolResults := ""
	var resultsMu sync.Mutex
	agentResults := []models.AgentsExecutedResults{}

	orchestratorModel := env.GlobalEnv["GOOGLE_GEMINI_CHAT_MODEL"].(string)
	orchestratorApiKey, err := llm.GetApiKey("ORCHESTRATOR", db)
	if err != nil {
		sw.Send(models.StreamChunk{AgentName: "orchestrator", Message: err.Error(), Status: "COMPLETED"})
		return models.ExecuteResponseDto{Message: err.Error()}, err
	}

	for i := 0; i < 1; i++ {
		geminiPayload := llm.GeminiRequest{
			Query:        currentQuery,
			Prompt:       toolSelectionPrompt,
			ToolCalls:    toolCalls,
			ApiKey:       orchestratorApiKey,
			Model:        orchestratorModel,
			ToolCallMode: "AUTO",
			ChatHistory: chatHistory,
		}

		resp, err := llm.Gemini(geminiPayload, db, metaData)
		if err != nil {
			sw.Send(models.StreamChunk{AgentName: "orchestrator", Message: err.Error(), Status: "COMPLETED"})
			return models.ExecuteResponseDto{Message: err.Error(), AgentsExecutedResults: agentResults}, err
		}

		if len(resp.ToolCalls) > 0 {
			toolResultsMsg := "\n\nTool Execution Results:\n"
			var wg sync.WaitGroup
			results := make([]string, len(resp.ToolCalls))

			for i, tc := range resp.ToolCalls {
				wg.Add(1)
				go func(index int, toolCall llm.ToolCall) {
					defer wg.Done()
					agentName := toolCall.FunctionName
					dn := displayName(agentName)

					sw.Send(models.StreamChunk{
						AgentName: dn,
						Message:   "Starting up...",
						Status:    "STARTED",
					})

					startedAt := time.Now().UTC()
					agentResp, err := ExecuteAgentsStream(agentName, toolCall.Args, db, metaData, sw)
					completedAt := time.Now().UTC()

					var agentRes models.AgentsExecutedResults
					agentRes.AgentName = dn
					agentRes.Query = currentQuery
					agentRes.StartedAt = startedAt
					agentRes.CompletedAt = completedAt

					if err != nil {
						agentRes.AgentStatus = "FAILED"
						agentRes.ResponseError = err.Error()
						results[index] = fmt.Sprintf("- Tool '%s' failed with error: %v\n", agentName, err)
						sw.Send(models.StreamChunk{
							AgentName: dn,
							Message:   fmt.Sprintf("Agent failed: %v", err),
							Status:    "COMPLETED",
						})
					} else {
						isEmpty := fmt.Sprint(agentResp.Data) == "map[]" || agentResp.Data == nil
						if isEmpty {
							agentRes.AgentStatus = "FAILED"
							agentRes.ResponseError = "Tool executed successfully but returned zero results/images."
							results[index] = fmt.Sprintf("- Tool '%s' failed: Returned no results.\n", agentName)
							sw.Send(models.StreamChunk{
								AgentName: dn,
								Message:   "Agent returned no results",
								Status:    "COMPLETED",
							})
						} else {
							agentRes.AgentStatus = "SUCCESS"
							agentRes.Response = agentResp.Data
							results[index] = fmt.Sprintf("- Tool '%s' returned: %v\n", agentName, agentResp.Data)
							sw.Send(models.StreamChunk{
								AgentName:    dn,
								AgentResults: agentResp.Data,
								Message:      "Done!",
								Status:       "COMPLETED",
							})
						}
					}

					resultsMu.Lock()
					agentResults = append(agentResults, agentRes)
					resultsMu.Unlock()
				}(i, tc)
			}

			wg.Wait()

			for _, res := range results {
				toolResultsMsg += res
				allToolResults += res + "\n"
			}

			if resp.Message != "" && resp.Message != "DONE" {
				currentQuery += "\n\nAssistant: " + resp.Message
			}
			currentQuery += toolResultsMsg + "\n\nGiven the above tool results, what is the next step? If the user query is satisfied or you have enough info, return no tool calls (or respond with 'DONE') to proceed to final response generation. If a tool failed, DO NOT retry the exact same tool call; either modify your parameters or respond with 'DONE'."
		} else {
			break
		}
	}

	// --- Final response generation ---
	sw.Send(models.StreamChunk{
		AgentName: "orchestrator",
		Message:   "Generating final response...",
		Status:    "INPROGRESS",
	})

	finalQuery := currentQuery + "\n\nBased on all the information gathered above, please provide the final response to the user query."
	finalPrompt := strings.Replace(finalResponsePrompt, "[TOOL_EXECUTION_RESULTS]", allToolResults, 1)

	finalPayload := llm.GeminiRequest{
		Query:  finalQuery,
		Prompt: finalPrompt,
		ApiKey: apiKey,
		// ChatHistory: chatHistory,
	}

	finalResp, err := llm.Gemini(finalPayload, db, metaData)
	if err != nil {
		sw.Send(models.StreamChunk{AgentName: "orchestrator", Message: err.Error(), Status: "COMPLETED"})
		return models.ExecuteResponseDto{Message: err.Error(), AgentsExecutedResults: agentResults}, err
	}

	finalResponse := models.ExecuteResponseDto{
		Message:               finalResp.Message,
		AgentsExecutedResults: agentResults,
	}

	sw.Send(models.StreamChunk{
		AgentName: "orchestrator",
		Message:   finalResp.Message,
		Status:    "COMPLETED",
	})

	return finalResponse, nil
}

func OrchestrateBrowserUse(task string, db shared.MongoRepositoryFunctions) (map[string]interface{}, error) {

	apiKey, err := llm.GetApiKey("BROWSER_USE", db)
	if err != nil {
		shared.NormalPrint("GetApiKey Error:", err)
		return nil, err
	}
	shared.NormalPrint("GetApiKey Response:", apiKey)

	createSessionResponse, err := sub_agents.BrowserUseCreateSession(apiKey)
	if err != nil {
		shared.NormalPrint("BrowserUseCreateSession Error:", err)
		return nil, err
	}
	shared.NormalPrint("BrowserUseCreateSession Response:", createSessionResponse)

	createTaskResponse, err := sub_agents.BrowserUseCreateTask(task, createSessionResponse["session_id"].(string), apiKey)
	if err != nil {
		shared.NormalPrint("BrowserUseCreateTask Error:", err)
		return nil, err
	}
	shared.NormalPrint("BrowserUseCreateTask Response:", createTaskResponse)

	sessionID := createTaskResponse["session_id"].(string)

	finalResponse := make(map[string]interface{})
	finalResponse["session_id"] = sessionID

	var finalStatusResponse map[string]interface{}
	var steps interface{}

	isCreated := false

	for i := 0; i < 100; i++ {
		// Wait before checking status to avoid hammering the API
		time.Sleep(2 * time.Second)

		if !isCreated {
			statusResp, err := sub_agents.BrowserUseGetTaskStatus(sessionID, apiKey)
			if err != nil {
				shared.NormalPrint("BrowserUseGetTaskStatus Error:", err)
				return nil, err
			}
			shared.NormalPrint("BrowserUseGetTaskStatus Response:", statusResp)

			if statusResp["status"].(string) == "created" || statusResp["status"].(string) == "started" {
				isCreated = true
			}
			continue
		}

		// If it's done, we also need to get the final task details to get the steps
		getTaskResponse, err := sub_agents.BrowserUseGetTask(sessionID, apiKey)
		if err != nil {
			shared.NormalPrint("BrowserUseGetTask Error:", err)
			return nil, err
		}
		shared.NormalPrint("BrowserUseGetTask Response:", getTaskResponse)

		if getTaskResponse["status"].(string) == "completed" || getTaskResponse["status"].(string) == "stopped" || getTaskResponse["status"].(string) == "finished" {
			steps = getTaskResponse["steps"]
			break
		}

	}

	// In case the loop exhausted without finishing, grab the final status
	if finalStatusResponse == nil {
		statusResp, err := sub_agents.BrowserUseGetTaskStatus(sessionID, apiKey)
		if err != nil {
			shared.NormalPrint("BrowserUseGetTaskStatus Error:", err)
			return nil, err
		}
		shared.NormalPrint("BrowserUseGetTaskStatus Response:", statusResp)
		finalStatusResponse = statusResp
	}

	if steps != nil {
		finalResponse["steps"] = steps
	}

	if finalStatusResponse != nil {
		finalResponse["status"] = finalStatusResponse["status"]
		finalResponse["output"] = finalStatusResponse["output"]
		finalResponse["is_success"] = finalStatusResponse["is_success"]
	}

	return finalResponse, nil
}

// OrchestrateBrowserUseStream is the streaming variant of OrchestrateBrowserUse.
// It sends SSE chunks via the StreamWriter at each phase so the frontend can
// react in real-time (e.g. open the iframe as soon as the session URL arrives).
func OrchestrateBrowserUseStream(task string, db shared.MongoRepositoryFunctions, sw *models.StreamWriter) (map[string]interface{}, error) {

	sw.Send(models.StreamChunk{
		AgentName: "Browser Use",
		Message:   "Initializing browser session...",
		Status:    "STARTED",
	})

	apiKey, err := llm.GetApiKey("BROWSER_USE", db)
	if err != nil {
		sw.Send(models.StreamChunk{AgentName: "Browser Use", Message: err.Error(), Status: "COMPLETED"})
		return nil, err
	}

	// 1. Create session — sends back session_url for iframe
	sw.Send(models.StreamChunk{
		AgentName: "Browser Use",
		Message:   "Creating browser session...",
		Status:    "INPROGRESS",
	})

	createSessionResponse, err := sub_agents.BrowserUseCreateSession(apiKey)
	if err != nil {
		sw.Send(models.StreamChunk{AgentName: "Browser Use", Message: fmt.Sprintf("Session creation failed: %v", err), Status: "COMPLETED"})
		return nil, err
	}

	sessionId := createSessionResponse["session_id"].(string)
	sessionUrl := createSessionResponse["session_url"].(string)

	// Send the session URL so the frontend can open the iframe immediately
	sw.Send(models.StreamChunk{
		AgentName:    "Browser Use",
		AgentResults: map[string]interface{}{"session_url": sessionUrl, "session_id": sessionId},
		Message:      "Browser session ready!",
		Status:       "INPROGRESS",
	})

	// 2. Create task
	sw.Send(models.StreamChunk{
		AgentName: "Browser Use",
		Message:   "Sending task to browser agent...",
		Status:    "INPROGRESS",
	})

	createTaskResponse, err := sub_agents.BrowserUseCreateTask(task, sessionId, apiKey)
	if err != nil {
		sw.Send(models.StreamChunk{AgentName: "Browser Use", Message: fmt.Sprintf("Task creation failed: %v", err), Status: "COMPLETED"})
		return nil, err
	}

	taskID := createTaskResponse["session_id"].(string)

	sw.Send(models.StreamChunk{
		AgentName:    "Browser Use",
		AgentResults: map[string]interface{}{"task_id": taskID},
		Message:      "Task submitted, browser is working...",
		Status:       "INPROGRESS",
	})

	// 3. Poll for status
	finalResponse := make(map[string]interface{})
	finalResponse["session_id"] = taskID
	finalResponse["session_url"] = sessionUrl

	var finalStatusResponse map[string]interface{}
	var steps interface{}
	isCreated := false
	lastStepCount := 0

	for i := 0; i < 100; i++ {
		time.Sleep(2 * time.Second)

		if !isCreated {
			statusResp, err := sub_agents.BrowserUseGetTaskStatus(taskID, apiKey)
			if err != nil {
				sw.Send(models.StreamChunk{AgentName: "Browser Use", Message: fmt.Sprintf("Status check failed: %v", err), Status: "COMPLETED"})
				return nil, err
			}

			status := statusResp["status"].(string)
			if status == "created" || status == "started" {
				isCreated = true
				sw.Send(models.StreamChunk{
					AgentName: "Browser Use",
					Message:   "Browser agent is navigating...",
					Status:    "INPROGRESS",
				})
			}
			continue
		}

		getTaskResponse, err := sub_agents.BrowserUseGetTask(taskID, apiKey)
		if err != nil {
			sw.Send(models.StreamChunk{AgentName: "Browser Use", Message: fmt.Sprintf("Task fetch failed: %v", err), Status: "COMPLETED"})
			return nil, err
		}

		// Stream new steps as they arrive
		// steps may be []map[string]interface{} or []interface{} depending on how Go stores them
		var taskSteps []map[string]interface{}
		if typed, ok := getTaskResponse["steps"].([]map[string]interface{}); ok {
			taskSteps = typed
		} else if raw, ok := getTaskResponse["steps"].([]interface{}); ok {
			for _, item := range raw {
				if m, ok := item.(map[string]interface{}); ok {
					taskSteps = append(taskSteps, m)
				}
			}
		}

		if len(taskSteps) > lastStepCount {
			for j := lastStepCount; j < len(taskSteps); j++ {
				step := taskSteps[j]
				stepNum := step["number"]

				// Build a human-readable message from actions
				var actionDescs []string
				if actions, ok := step["actions"].([]interface{}); ok {
					for _, a := range actions {
						if actionStr, ok := a.(string); ok {
							actionDescs = append(actionDescs, parseActionString(actionStr))
						}
					}
				}

				var stepMsg string
				if evalGoal, ok := step["evaluation_previous_goal"].(string); ok && evalGoal != "" {
					stepMsg = fmt.Sprintf("Step %v: %s", stepNum, evalGoal)
				} else if len(actionDescs) > 0 {
					stepMsg = fmt.Sprintf("Step %v: %s", stepNum, strings.Join(actionDescs, ", "))
				} else {
					stepMsg = fmt.Sprintf("Step %v", stepNum)
				}

				sw.Send(models.StreamChunk{
					AgentName:    "Browser Use",
					AgentResults: step,
					Message:      stepMsg,
					Status:       "INPROGRESS",
				})
			}
			lastStepCount = len(taskSteps)
		}

		status := getTaskResponse["status"].(string)
		if status == "completed" || status == "stopped" || status == "finished" {
			steps = getTaskResponse["steps"]
			break
		}
	}

	// Final status
	if finalStatusResponse == nil {
		statusResp, err := sub_agents.BrowserUseGetTaskStatus(taskID, apiKey)
		if err != nil {
			sw.Send(models.StreamChunk{AgentName: "Browser Use", Message: fmt.Sprintf("Final status check failed: %v", err), Status: "COMPLETED"})
			return nil, err
		}
		finalStatusResponse = statusResp
	}

	if steps != nil {
		finalResponse["steps"] = steps
	}

	if finalStatusResponse != nil {
		finalResponse["status"] = finalStatusResponse["status"]
		finalResponse["output"] = finalStatusResponse["output"]
		finalResponse["is_success"] = finalStatusResponse["is_success"]
	}

	// Final COMPLETED chunk
	outputMsg := "Browser task completed."
	if out, ok := finalStatusResponse["output"].(string); ok && out != "" {
		outputMsg = out
	}

	sw.Send(models.StreamChunk{
		AgentName:    "Browser Use",
		AgentResults: finalResponse,
		Message:      outputMsg,
		Status:       "COMPLETED",
	})

	return finalResponse, nil
}
