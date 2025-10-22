package agents

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"time"
)

var TavilyAPIUrl = "https://api.tavily.com/search"

func TavilyWebSearch(query string, apiKey string) (string, error) {

	payload := map[string]interface{}{
		"query":          query,
		"search_depth":   "advanced",
		"topics":         "general",
		"max_results":    10,
		"include_answer": "advanced",
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", TavilyAPIUrl, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	var response map[string]interface{}
	err = json.Unmarshal(body, &response)
	if err != nil {
		return "", err
	}
	return response["answer"].(string), nil

}
