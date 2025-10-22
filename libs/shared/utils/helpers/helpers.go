package helpers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"reflect"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v4"

	"github.com/labstack/echo/v4"
)

type ExchangeRateResponse struct {
	Rates struct {
		INR float64 `json:"INR"`
	} `json:"rates"`
}

// GetStructMethods returns a list of methods defined in a struct.
func GetStructMethods(structName interface{}) []string {
	var structMethods []string
	structType := reflect.TypeOf(structName)
	for i := 0; i < structType.NumMethod(); i++ {
		structMethods = append(structMethods, structType.Method(i).Name)
	}
	return structMethods
}

// valueToReturn, err = CallFuncByName(&Functions{}, propsArr[index].Name, paramsAfterEvaluation...)
//
//	if err != nil {
//		return ReturnValue, err
//	}
func CallFuncByName(myClass interface{}, funcName string, optionalParams ...interface{}) (out []reflect.Value, err error) {

	myClassValue := reflect.ValueOf(myClass)
	m := myClassValue.MethodByName(funcName)

	if !m.IsValid() {
		errorString := fmt.Sprintf("method not found \"%s\"", funcName)
		return make([]reflect.Value, 0), errors.New(errorString)
	}
	in := make([]reflect.Value, len(optionalParams))
	fmt.Printf("=============> function name =============> %v(", funcName)
	for index, param := range optionalParams {
		if index != 0 {
			fmt.Printf(",")
		}
		fmt.Printf("%v", reflect.TypeOf(param))
		if param == nil {
			in[index] = reflect.Zero(reflect.TypeOf((*error)(nil)).Elem())
			continue
		}
		in[index] = reflect.ValueOf(param)
	}
	fmt.Printf(")\n")
	out = m.Call(in)
	return
}

// JsonMarshaller marshals and unmarshals JSON data.
func JsonMarshaller(input interface{}, output interface{}) error {
	jsonData, err := json.Marshal(input)
	if err != nil {
		return err
	}
	err = json.Unmarshal(jsonData, output)
	if err != nil {
		return err
	}
	return nil
}

// RemoveStringFromArray removes the specified key from the string array and returns the remaining elements
func RemoveStringFromArray(arr []string, key string) []string {
	result := make([]string, 0)
	for _, item := range arr {
		if item != key {
			result = append(result, item)
		}
	}
	return result
}

// GenerateRandomString generates a random string of specified length.
func GenerateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	seededRand := rand.New(rand.NewSource(time.Now().UnixNano()))

	result := make([]byte, length)
	for i := range result {
		result[i] = charset[seededRand.Intn(len(charset))]
	}

	return string(result)
}

func GenerateRandomStringLowerCase(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz"
	seededRand := rand.New(rand.NewSource(time.Now().UnixNano()))

	result := make([]byte, length)
	for i := range result {
		result[i] = charset[seededRand.Intn(len(charset))]
	}

	return string(result)
}

// Generate Random AlphaNumericString
func GenerateRandomAlphanumeric() string {
	alphaChars := "abcdefghijklmnopqrstuvwxyz"
	numericChars := "0123456789"
	chars := alphaChars + numericChars

	seededRand := rand.New(rand.NewSource(time.Now().UnixNano()))

	result := make([]byte, 4)
	result[0] = alphaChars[seededRand.Intn(len(alphaChars))]

	for i := 1; i < 4; i++ {
		result[i] = chars[seededRand.Intn(len(chars))]
	}

	return string(result)
}

// find the key from the json path
func ParseJsonPathFromObject(data map[string]interface{}, keypath string) (interface{}, error) {

	if keypath == "" {
		return data, nil
	}
	var segs []string = strings.Split(keypath, ".")
	object := data

	for fieldIndex, field := range segs {
		if object[field] == nil {
			fmt.Printf("oops! %v - not found in the json_path from object\n", field)
			return nil, nil
		}
		if fieldIndex == len(segs)-1 {
			return object[field], nil
		}
		result, ok := object[field].(map[string]interface{})
		if !ok {
			errorString := fmt.Sprintf("oops! %v - cannot proceed json_path further with this object\n", field)
			return nil, errors.New(errorString)
		}
		object = result
	}
	//  fmt.Println("ParseJsonPathFromObject ===>>>>", object)
	return object, nil
}

func PrettyPrint(key string, data interface{}) {
	blue := "\033[34m"
	reset := "\033[0m"
	byteData, err := json.MarshalIndent(data, "", "\t")
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(" ")
	fmt.Println(string(blue), "=============> "+key+" start <============= ", string(reset))
	fmt.Println(string(byteData))
	fmt.Println(string(blue), "=============> "+key+" end <============= ", string(reset))
}
func NormalPrint(key string, data interface{}) {
	blue := "\033[34m"
	reset := "\033[0m"
	byteData, err := json.Marshal(data)
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(" ")
	fmt.Println(string(blue), "=============> "+key+" start <============= ", string(reset))
	fmt.Println(string(byteData))
	fmt.Println(string(blue), "=============> "+key+" end <============= ", string(reset))
}

// Contains checks if a given value exists in an array.

func ArraySlice(data []interface{}, start int, end int) []interface{} {
	arrayLength := len(data)
	if start >= 0 && start <= arrayLength && end >= 0 && end <= arrayLength && end >= start {

		//  fmt.Println("ArraySlice ===>>>>", data[start:end])
		return data[start:end]
	}
	if start >= 0 && start < arrayLength {
		if end >= arrayLength {

			//  fmt.Println("ArraySlice ===>>>>", data[start:])
			return data[start:]
		}
	}
	return []interface{}{}
}

func RemoveElementFromArray(data []interface{}, removeElement interface{}) []interface{} {
	output := []interface{}{}
	for _, v := range data {
		if v != removeElement {
			output = append(output, v)
		}
	}
	return output
}

func Mod(input1 int, input2 int) int {
	return input1 % input2
}

func LogOutput(logFile string) func() {

	f, _ := os.OpenFile(logFile, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0666)
	out := os.Stdout
	mw := io.MultiWriter(out, f)
	r, w, _ := os.Pipe()
	os.Stdout = w
	os.Stderr = w
	log.SetOutput(mw)

	exit := make(chan bool)
	go func() {
		_, _ = io.Copy(mw, r)
		exit <- true
	}()
	return func() {
		_ = w.Close()
		<-exit
		_ = f.Close()
	}
}

type Event struct {
	Type    string `json:"type"`
	Paylaod string `json:"payload"`
}

func LoggerConfig(e echo.Context) {
	// conn, err := net.Dial("tcp", "localhost:8080")
	// if err != nil {
	// 	fmt.Println("Error connecting to server:", err)
	// 	return
	// }
	// defer conn.Close()
	// Emit a message to socket with key
	// key := "logs"
	// message := key + e.Request().URL.Path
	// payload := NewEvent(key, message)

	// go ConnectAndSendEvent("ws:/localhost:5050/ws", payload)

}

func NewEvent(eventType string, eventPayload string) *Event {
	m := &Event{
		Type:    eventType,
		Paylaod: eventPayload,
	}
	return m
}

// GenerateRandomString generates a random string of specified length.
func GenerateOtp(length int) string {
	const charset = "0123456789"
	seededRand := rand.New(rand.NewSource(time.Now().UnixNano()))

	result := make([]byte, length)
	for i := range result {
		result[i] = charset[seededRand.Intn(len(charset))]
	}

	return string(result)
}

func DecodeTokenAndExtractClaims(tokenString string, jwtKey string) (map[string]interface{}, error) {
	// Remove "Bearer " prefix if it exists
	tokenString = strings.TrimPrefix(tokenString, "Bearer ")

	// Parse the token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Normally you would validate the 'alg' field here
		return []byte(jwtKey), nil // Use the same secret key used to sign the token
	})

	if err != nil {
		return nil, err
	}

	// Extract claims
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// Helper function to check if ID exists in slice
func Contains(slice []uint, id uint) bool {
	for _, v := range slice {
		if v == id {
			return true
		}
	}
	return false
}
func ContainsString(slice []string, id string) bool {
	for _, v := range slice {
		if v == id {
			return true
		}
	}
	return false
}

func ContainsInterface(slice []interface{}, id interface{}) bool {
	for _, v := range slice {
		if v == id {
			return true
		}
	}
	return false
}

// Helper function to append unique items to a slice
func UniqueAppend(existing []uint, newItems []uint) []uint {
	for _, id := range newItems {
		if !Contains(existing, id) {
			existing = append(existing, id)
		}
	}
	return existing
}

func RemoveUint(slice []uint, id uint) []uint {
	for i, v := range slice {
		if v == id {
			return append(slice[:i], slice[i+1:]...)
		}
	}
	return slice
}

func FindCredential(credentials []interface{}, key string) string {
	for _, section := range credentials {
		if sectionMap, ok := section.(map[string]interface{}); ok {
			if fields, ok := sectionMap["fields"].([]interface{}); ok {
				for _, field := range fields {
					if fieldMap, ok := field.(map[string]interface{}); ok {
						if envKey, ok := fieldMap["env_key"].(string); ok && envKey == key {
							if valueMap, ok := fieldMap["value"].(map[string]interface{}); ok {
								if value, ok := valueMap["value"].(string); ok {
									return value
								}
							}
						}
					} else {
						return "Error while converting fields to map"
					}
				}
			} else {
				return "Error while converting fields to []interface"
			}
		} else {
			return "Error while converting section to map"
		}
	}
	return ""
}

func FindTestDetail(details []interface{}, key string) string {
	for _, section := range details {
		if sectionMap, ok := section.(map[string]interface{}); ok {
			if fields, ok := sectionMap["fields"].([]interface{}); ok {
				for _, field := range fields {
					if fieldMap, ok := field.(map[string]interface{}); ok {
						if envKey, ok := fieldMap["env_key"].(string); ok && envKey == key {
							if value, ok := fieldMap["value"].(string); ok {
								return value
							}
						}
					}
				}
			}
		}
	}
	return ""
}

func VerifyDocument(url, clientSecretKey, accessKey, serviceKey, idNumber, documentType string) (map[string]interface{}, error) {
	// Create headers
	headers := map[string]string{
		"Authorization": fmt.Sprintf("x-api-access %s:%s", clientSecretKey, accessKey),
		"service-key":   serviceKey,
		"Content-Type":  "application/json",
	}

	// Create data payload
	data := map[string]string{
		"id_number":     idNumber,
		"document_type": documentType,
	}

	// Convert data to JSON
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal data: %v", err)
	}

	// Create the HTTP request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	// Set headers
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	// Execute the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()

	// Read the response body using io.ReadAll
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %v", err)
	}

	// Handle response
	if resp.StatusCode != http.StatusOK {
		var errorResponse map[string]interface{}
		if err := json.Unmarshal(body, &errorResponse); err != nil {
			return nil, fmt.Errorf("failed to unmarshal error response: %v", err)
		}
		return errorResponse, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	// Parse the response JSON
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %v", err)
	}

	return result, nil
}

func UserServerSetting(payload map[string]interface{}, key string) string {
	// Check if "sections" exists and is a slice
	if sections, ok := payload["sections"].([]interface{}); ok {
		for _, section := range sections {
			if sectionMap, ok := section.(map[string]interface{}); ok {
				// Check if "fields" exists and is a slice in the section
				if fields, ok := sectionMap["fields"].([]interface{}); ok {
					for _, field := range fields {
						if fieldMap, ok := field.(map[string]interface{}); ok {
							// Check if the field has "env_key" and match with the key
							if envKey, ok := fieldMap["env_key"].(string); ok && envKey == key {
								// Return the value if found
								if value, ok := fieldMap["value"].(string); ok {
									return value
								}
							}
						}
					}
				}
			}
		}
	}
	return ""
}

func UrlRequest(method, url string, body interface{}, optionalParams ...interface{}) (interface{}, error) {

	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(method, url, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	if len(optionalParams) > 0 {
		var headers map[string]string
		JsonMarshaller(optionalParams[0], &headers)
		for key, value := range headers {
			req.Header.Set(key, value)
		}
	}

	fmt.Println("Url : ", url, "Method : ", method, "Payload : ", string(bodyBytes))

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}

	responseBodyBytes, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	// fmt.Println(string(responseBodyBytes))

	var responseBody interface{}
	err = json.Unmarshal(responseBodyBytes, &responseBody)
	if err != nil {
		return nil, err
	}

	return responseBody, nil
}

func ReverseArray(slice []interface{}) []interface{} {
	// Two-pointer approach to swap elements from start and end
	for i, j := 0, len(slice)-1; i < j; i, j = i+1, j-1 {
		slice[i], slice[j] = slice[j], slice[i]
	}
	return slice
}

func GetUSDExchangeRate() (float64, error) {
	url := "https://open.er-api.com/v6/latest/USD"

	resp, err := http.Get(url)
	if err != nil {
		return 85.77, err // fallback to default value if API call fails
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return 85.77, err
	}

	var result ExchangeRateResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return 85.77, err
	}

	roundedValue := math.Round(result.Rates.INR*100) / 100
	return roundedValue, nil
}

func FormatDuration(d time.Duration) string {
	if d.Hours() >= 1 {
		return fmt.Sprintf("%.2fs", d.Seconds()) // Format as seconds if >= 1 hour
	}
	if d.Minutes() >= 1 {
		return fmt.Sprintf("%.2fs", d.Seconds()) // Format as seconds if >= 1 minute
	}
	if d.Seconds() >= 1 {
		return fmt.Sprintf("%.2fs", d.Seconds()) // Format as seconds if >= 1 second
	}
	if d.Milliseconds() >= 1 {
		return fmt.Sprintf("%dms", d.Milliseconds()) // Format as milliseconds if >= 1ms
	}
	return fmt.Sprintf("%dµs", d.Microseconds()) // Format as microseconds for smaller durations
}
