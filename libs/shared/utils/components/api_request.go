package components

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"libs/shared/utils/helpers"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type APIRequestComponentInputs struct {
	URL         string          `json:"url"`
	Method      string          `json:"method"`
	Headers     json.RawMessage `json:"headers"`
	Body        json.RawMessage `json:"body"`
	QueryParams json.RawMessage `json:"query_params"`
	Timeout     int             `json:"timeout"`
}

type APIRequestComponentOutputs struct {
	ResponseData interface{} `json:"response_data"`
	StatusCode   int         `json:"status_code"`
	Headers      http.Header `json:"headers"`
}

type ResponseStruct struct {
	Data   map[string]interface{} `json:"data"`
	Error  error                  `json:"error"`
	Status bool                   `json:"status"`
}

// APIRequestComponent returns a ComponentModuleTemplate for an API request
func APIRequestComponent() map[string]interface{} {
	componentDetails := []byte(`{}`)

	var componentData map[string]interface{}
	helpers.JsonMarshaller(componentDetails, &componentData)

	return componentData
}

func APIRequestComponentProcessor(data any) (ResponseStruct, error) {
	// helpers.NormalPrint("Api Request", data)
	var data1 map[string]interface{}
	helpers.JsonMarshaller(data, &data1)

	if data1["headers"].(map[string]interface{})["Content-Type"] == nil || data1["headers"].(map[string]interface{})["content-type"] == nil {
		data1["headers"].(map[string]interface{})["Content-Type"] = "application/json"
	}

	var inputs APIRequestComponentInputs
	helpers.JsonMarshaller(data1, &inputs)
	reqStringData := fmt.Sprintf("Api Request for %v", inputs.URL)
	helpers.NormalPrint(reqStringData, data)

	outputs := APIRequestComponentOutputs{}

	// Parse the URL
	parsedURL, err := url.Parse(inputs.URL)
	if err != nil {
		return ResponseStruct{
			Data:   nil,
			Error:  fmt.Errorf("invalid URL: %v", err),
			Status: false,
		}, err
	}

	// Add query parameters
	if len(inputs.QueryParams) > 0 {
		queryParams := url.Values{}

		var query map[string]interface{}
		err = json.Unmarshal(inputs.QueryParams, &query)
		if err != nil {
			return ResponseStruct{
				Data:   nil,
				Error:  fmt.Errorf("invalid headers: %v", err),
				Status: false,
			}, err
		}
		for key, value := range query {
			queryParams.Add(key, fmt.Sprintf("%v", value))
		}

		parsedURL.RawQuery = queryParams.Encode()
	}

	// Create a new request
	req, err := http.NewRequest(inputs.Method, parsedURL.String(), strings.NewReader(string(inputs.Body)))
	if err != nil {
		return ResponseStruct{
			Data:   nil,
			Error:  fmt.Errorf("error creating request: %v", err),
			Status: false,
		}, err
	}

	// Add headers
	if len(inputs.Headers) > 0 {
		var headers map[string]interface{}
		err = json.Unmarshal(inputs.Headers, &headers)
		if err != nil {
			return ResponseStruct{
				Data:   nil,
				Error:  fmt.Errorf("invalid headers: %v", err),
				Status: false,
			}, err
		}
		for key, value := range headers {
			req.Header.Add(key, fmt.Sprintf("%v", value))
		}
	}

	// Set timeout
	client := &http.Client{
		Timeout: time.Duration(inputs.Timeout) * time.Second,
	}

	// Send the request
	resp, err := client.Do(req)
	if err != nil {
		return ResponseStruct{
			Data:   nil,
			Error:  fmt.Errorf("error sending request: %v", err),
			Status: false,
		}, err

	}
	defer resp.Body.Close()

	// Read the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {

		return ResponseStruct{
			Data:   nil,
			Error:  fmt.Errorf("error reading response body: %v", err),
			Status: false,
		}, err
	}

	// Parse the response body as JSON if possible
	var responseData interface{}
	err = json.Unmarshal(body, &responseData)
	if err != nil {
		// If it's not valid JSON, use the raw body as a string
		responseData = string(body)
	}

	// Prepare the output
	outputs.ResponseData = responseData
	outputs.StatusCode = resp.StatusCode
	outputs.Headers = resp.Header

	response := ResponseStruct{
		Data: map[string]interface{}{
			"response_data": responseData,
			"status_code":   fmt.Sprintf("%v", resp.StatusCode),
			"headers":       resp.Header,
		},
		Error:  nil,
		Status: true,
	}
	// helpers.NormalPrint("Api Response", response)
	respStringData := fmt.Sprintf("Api Response for %v", inputs.URL)
	helpers.NormalPrint(respStringData, response)

	return response, nil
}

func APIRequestComponentProcessorStream(data any, streamingChan chan map[string]interface{}) (ResponseStruct, error) {
	// helpers.NormalPrint("Api Request", data)
	var data1 map[string]interface{}
	helpers.JsonMarshaller(data, &data1)

	if data1["headers"].(map[string]interface{})["Content-Type"] == nil || data1["headers"].(map[string]interface{})["content-type"] == nil {
		data1["headers"].(map[string]interface{})["Content-Type"] = "application/json"
	}

	var inputs APIRequestComponentInputs
	helpers.JsonMarshaller(data1, &inputs)
	reqStringData := fmt.Sprintf("Api Request for %v", inputs.URL)
	helpers.NormalPrint(reqStringData, data)

	outputs := APIRequestComponentOutputs{}

	// Parse the URL
	parsedURL, err := url.Parse(inputs.URL)
	if err != nil {
		return ResponseStruct{
			Data:   nil,
			Error:  fmt.Errorf("invalid URL: %v", err),
			Status: false,
		}, err
	}

	// Add query parameters
	if len(inputs.QueryParams) > 0 {
		queryParams := url.Values{}

		var query map[string]interface{}
		err = json.Unmarshal(inputs.QueryParams, &query)
		if err != nil {
			return ResponseStruct{
				Data:   nil,
				Error:  fmt.Errorf("invalid headers: %v", err),
				Status: false,
			}, err
		}
		for key, value := range query {
			queryParams.Add(key, fmt.Sprintf("%v", value))
		}

		parsedURL.RawQuery = queryParams.Encode()
	}

	// Create a new request
	req, err := http.NewRequest(inputs.Method, parsedURL.String(), strings.NewReader(string(inputs.Body)))
	if err != nil {
		return ResponseStruct{
			Data:   nil,
			Error:  fmt.Errorf("error creating request: %v", err),
			Status: false,
		}, err
	}

	// Add headers
	if len(inputs.Headers) > 0 {
		var headers map[string]interface{}
		err = json.Unmarshal(inputs.Headers, &headers)
		if err != nil {
			return ResponseStruct{
				Data:   nil,
				Error:  fmt.Errorf("invalid headers: %v", err),
				Status: false,
			}, err
		}
		for key, value := range headers {
			req.Header.Add(key, fmt.Sprintf("%v", value))
		}
	}

	// Set timeout
	client := &http.Client{
		Timeout: time.Duration(inputs.Timeout) * time.Second,
	}

	// Send the request
	resp, err := client.Do(req)
	if err != nil {
		return ResponseStruct{
			Data:   nil,
			Error:  fmt.Errorf("error sending request: %v", err),
			Status: false,
		}, err
	}
	defer resp.Body.Close()

	// Check if the response is a streaming response
	isStreaming := strings.Contains(resp.Header.Get("Content-Type"), "text/event-stream")

	var responseData interface{}

	if isStreaming {
		// Handle streaming response
		scanner := bufio.NewScanner(resp.Body)
		var streamData []string
		buf := make([]byte, 5*1024*1024) // 5 MB buffer
		scanner.Buffer(buf, 5*1024*1024) // Max token size = 5 MB

		for scanner.Scan() {
			line := scanner.Text()
			if line != "" {
				// Print each received message
				// helpers.NormalPrint("Streaming chunk received", line)
				streamData = append(streamData, line)

				// Parse the line to extract id, type, and data
				var streamEvent map[string]interface{}
				if strings.Contains(line, "data: ") {
					line = strings.Replace(line, "data: ", "", 1)
				}

				if err := json.Unmarshal([]byte(line), &streamEvent); err == nil {
					streamingChan <- map[string]interface{}{
						"data": streamEvent,
					}
				}
			}
		}

		if err := scanner.Err(); err != nil {
			return ResponseStruct{
				Data:   nil,
				Error:  fmt.Errorf("error reading stream: %v", err),
				Status: false,
			}, err
		}

		// Join all stream data
		responseData = strings.Join(streamData, "\n")
	} else {
		// Handle regular response
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return ResponseStruct{
				Data:   nil,
				Error:  fmt.Errorf("error reading response body: %v", err),
				Status: false,
			}, err
		}

		// Parse the response body as JSON if possible
		err = json.Unmarshal(body, &responseData)
		if err != nil {
			// If it's not valid JSON, use the raw body as a string
			responseData = string(body)
		}
	}

	// Prepare the output
	outputs.ResponseData = responseData
	outputs.StatusCode = resp.StatusCode
	outputs.Headers = resp.Header

	response := ResponseStruct{
		Data: map[string]interface{}{
			"response_data": responseData,
			"status_code":   fmt.Sprintf("%v", resp.StatusCode),
			"headers":       resp.Header,
		},
		Error:  nil,
		Status: true,
	}

	respStringData := fmt.Sprintf("Api Response for %v", inputs.URL)
	helpers.NormalPrint(respStringData, response)

	return response, nil
}
