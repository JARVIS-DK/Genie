package components

import (
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
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

func APIRequestComponentProcessor(data any) (ResponseStruct, error) {
	helpers.NormalPrint("Api Request", data)
	var data1 map[string]interface{}
	helpers.JsonMarshaller(data, &data1)
	if data1["headers"] == nil {
		data1["headers"] = map[string]interface{}{}
	}

	if data1["headers"].(map[string]interface{})["Content-Type"] == nil || data1["headers"].(map[string]interface{})["content-type"] == nil {
		data1["headers"].(map[string]interface{})["Content-Type"] = "application/json"
	}

	var inputs APIRequestComponentInputs
	helpers.JsonMarshaller(data1, &inputs)

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
	// if len(inputs.QueryParams) > 0 {
	// 	queryParams := url.Values{}

	// 	var query map[string]interface{}
	// 	err = json.Unmarshal(inputs.QueryParams, &query)
	// 	if err != nil {
	// 		return ResponseStruct{
	// 			Data:   nil,
	// 			Error:  fmt.Errorf("invalid headers: %v", err),
	// 			Status: false,
	// 		}, err
	// 	}
	// 	for key, value := range query {
	// 		queryParams.Add(key, fmt.Sprintf("%v", value))
	// 	}

	// 	parsedURL.RawQuery = queryParams.Encode()
	// }

	// Check if query_params are provided
	if len(inputs.QueryParams) > 0 {
		var queryParams map[string]interface{}
		err = json.Unmarshal(inputs.QueryParams, &queryParams)
		if err != nil {
			return ResponseStruct{
				Data:   nil,
				Error:  fmt.Errorf("invalid query parameters: %v", err),
				Status: false,
			}, err
		}

		// Build the query string manually
		queryString := ""
		for key, value := range queryParams {
			escapedKey := url.QueryEscape(key)
			escapedValue := fmt.Sprintf("%v", value) // Do not encode again here

			// Now only encode the key once, no need to re-encode the value
			if queryString == "" {
				queryString = fmt.Sprintf("%s=%s", escapedKey, escapedValue)
			} else {
				queryString = fmt.Sprintf("%s&%s=%s", queryString, escapedKey, escapedValue)
			}
		}

		// Append the query string to the URL
		if parsedURL.RawQuery == "" {
			parsedURL.RawQuery = queryString
		} else {
			parsedURL.RawQuery = fmt.Sprintf("%s&%s", parsedURL.RawQuery, queryString)
		}
	}

	// Check if inputs.Body is empty, {}, or nil
	var reqBody io.Reader
	if len(inputs.Body) > 0 {
		// Check if the body contains only "{}"
		trimmedBody := strings.TrimSpace(string(inputs.Body))
		if trimmedBody != "{}" && trimmedBody != "" {
			reqBody = strings.NewReader(trimmedBody)
		} else {
			reqBody = nil
		}
	} else {
		reqBody = nil
	}

	// Create a new request
	req, err := http.NewRequest(inputs.Method, parsedURL.String(), reqBody)
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
	body, err := ioutil.ReadAll(resp.Body)
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
	helpers.NormalPrint("Api Response", response)

	return response, nil
}
