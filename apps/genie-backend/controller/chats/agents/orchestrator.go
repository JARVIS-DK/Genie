package agents

import (
	"apps/genie-backend/controller/chats/agents/prompts"
	sub_agents "apps/genie-backend/controller/chats/agents/sub_agents"
	"apps/genie-backend/controller/chats/llm"
	"apps/genie-backend/controller/chats/models"
	"fmt"
	"libs/shared"
	"strings"
	"sync"
	"time"

	env "apps/genie-backend/config"
)

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
		Message:   "Selecting tools...",
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
