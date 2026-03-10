package deep_research

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Constants for Jina API
const (
	JinaDeepSearchEndpoint = "https://deepsearch.jina.ai/v1/chat/completions"
)

// JinaComponentInput represents the input structure for Jina DeepSearch API
type JinaComponentInput struct {
	JinaApiKey      string `json:"jina_api_key"`     // Matches component field name
	Input           string `json:"input"`            // User input text/message
	Model           string `json:"model"`            // jina-deepsearch-v1, jina-reader-v1, jina-rag-v1
	MaxTokens       int    `json:"max_tokens"`       // Token limit
	ReasoningEffort string `json:"reasoning_effort"` // low, medium, high
	IsStream        bool   `json:"is_stream"`        // Streaming response
}

// JinaComponentOutput represents the output structure
type JinaComponentOutput struct {
	ID                string       `json:"id"`
	Object            string       `json:"object"`
	Created           int64        `json:"created"`
	Model             string       `json:"model"`
	SystemFingerprint string       `json:"system_fingerprint"`
	Choices           []JinaChoice `json:"choices"`
	Usage             JinaUsage    `json:"usage"`
	VisitedURLs       []string     `json:"visitedURLs,omitempty"`
	ReadURLs          []string     `json:"readURLs,omitempty"`
	NumURLs           int          `json:"numURLs,omitempty"`
}

type JinaChoice struct {
	Index        int         `json:"index"`
	Message      JinaMessage `json:"message,omitempty"`
	Delta        JinaMessage `json:"delta,omitempty"`
	LogProbs     interface{} `json:"logprobs"`
	FinishReason string      `json:"finish_reason"`
}

type JinaMessage struct {
	Role        string           `json:"role"`
	Content     string           `json:"content"`
	Type        string           `json:"type,omitempty"`
	Annotations []JinaAnnotation `json:"annotations,omitempty"`
	ToolCalls   []JinaToolCall   `json:"tool_calls,omitempty"`
}

type JinaAnnotation struct {
	Type        string          `json:"type"`
	URLCitation JinaURLCitation `json:"url_citation,omitempty"`
}

type JinaURLCitation struct {
	Title      string `json:"title"`
	ExactQuote string `json:"exactQuote"`
	URL        string `json:"url"`
	DateTime   string `json:"dateTime"`
}

type JinaToolCall struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"`
	Function map[string]interface{} `json:"function"`
}

type JinaUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}
type tokenDto struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
	TotalTokens  int `json:"total_tokens"`
	CacheTokens  int `json:"cache_tokens"`
}

// JinaRespOutput represents the final response structure
type JinaRespOutput struct {
	TextOutput   string              `json:"text_output"`
	FunctionCall []JinaToolCall      `json:"function_call"`
	OutputType   string              `json:"output_type"`
	Response     JinaComponentOutput `json:"response"`
	ModelOutput  string              `json:"model_output"`
	VisitedURLs  []string            `json:"visited_urls"`
	ReadURLs     []string            `json:"read_urls"`
	TokenUsage   tokenDto            `json:"token_usage"`
}

func DeepResearch(query string, apiKey string) (string, error) {
	payload := map[string]interface{}{
		"model": "jina-deepsearch-v1",
		"messages": []map[string]interface{}{
			{"role": "user", "content": query},
		},
		"stream":           false,
		"reasoning_effort": "low",
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("error marshalling request payload: %v", err)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", JinaDeepSearchEndpoint, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return "", fmt.Errorf("error creating HTTP request: %v", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 600 * time.Second, // Jina DeepSearch can take longer - 10 minutes
	}

	// Send the request
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error sending request: %v", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		var apiErrMsg string
		// Try to parse error message from JSON if possible
		var apiErrObj map[string]interface{}
		if err := json.Unmarshal(body, &apiErrObj); err == nil {
			if msg, ok := apiErrObj["error"].(string); ok && msg != "" {
				apiErrMsg = msg
			} else if msg, ok := apiErrObj["message"].(string); ok && msg != "" {
				apiErrMsg = msg
			}
		}
		if apiErrMsg == "" {
			apiErrMsg = string(body)
		}

		return "", fmt.Errorf("API error: %s", apiErrMsg)
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("error reading response body: %v", err)
	}

	// Parse the response
	var output JinaComponentOutput
	err = json.Unmarshal(body, &output)
	if err != nil {
		return "", fmt.Errorf("error parsing response: %v", err)
	}

	// Extract text content and function calls
	var responseText string

	if len(output.Choices) > 0 {
		choice := output.Choices[0]
		responseText = choice.Message.Content
	}
	return responseText, nil
}
