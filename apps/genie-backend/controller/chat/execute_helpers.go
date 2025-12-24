package chat

import (
	"apps/genie-backend/config"
	"errors"
	"fmt"
	shared "libs/shared"
	"libs/shared/db_connectors/model"

	"go.mongodb.org/mongo-driver/mongo"
)

func GoogleTextToImage(text string, db shared.MongoRepositoryFunctions) (string, error) {

	apiKeysCollectionName := model.CollectionName["API_KEYS"]
	filterQuery := map[string]interface{}{
		"code": "GOOGLE_TEXT_TO_IMAGE_API_KEY",
	}
	existingRecord, err := db.GetOne(config.GlobalEnv["MONGO_CREDENTIAL"], apiKeysCollectionName, filterQuery)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		fmt.Println("error in getting api key", err)
		return "", err
	}

	if existingRecord == nil {
		fmt.Println("API key not found")
		return "", errors.New("API key not found")
	}
	var existingRecordMap map[string]interface{}
	shared.JsonMarshaller(existingRecord, &existingRecordMap)

	apiKey := existingRecordMap["api_key"].(string)

	apiRequest := shared.ApiRequestDto{
		URL:    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
		Method: "POST",
		Headers: map[string]interface{}{
			"Content-Type":   "application/json",
			"x-goog-api-key": apiKey,
		},
		Body: map[string]interface{}{
			"contents": []interface{}{
				map[string]interface{}{
					"parts": []interface{}{
						map[string]interface{}{
							"text": text,
						},
					},
				},
			},
		},
		QueryParams: map[string]interface{}{},
		Timeout:     300,
	}

	apiResponse, err := shared.APIRequestComponentProcessor(apiRequest)
	if err != nil {
		return "", err
	}
	var apiResponseMap map[string]interface{}
	shared.JsonMarshaller(apiResponse, &apiResponseMap)

	shared.PrettyPrint("Api Response", apiResponseMap)

	dataAny, ok := apiResponseMap["data"]
	if !ok {
		return "", errors.New("missing data in API response")
	}
	dataMap, ok := dataAny.(map[string]interface{})
	if !ok {
		return "", errors.New("invalid data format in API response")
	}
	rdAny, ok := dataMap["response_data"]
	if !ok {
		return "", errors.New("missing response_data in API response")
	}
	rd, ok := rdAny.(map[string]interface{})
	if !ok {
		return "", errors.New("invalid response_data format")
	}
	candAny, ok := rd["candidates"]
	if !ok {
		return "", errors.New("missing candidates in response_data")
	}
	candidates, ok := candAny.([]interface{})
	if !ok || len(candidates) == 0 {
		return "", errors.New("no candidates returned by model")
	}
	firstCandidate, ok := candidates[0].(map[string]interface{})
	if !ok {
		return "", errors.New("invalid candidate format")
	}
	contentAny, ok := firstCandidate["content"]
	if !ok {
		return "", errors.New("missing content in candidate")
	}
	content, ok := contentAny.(map[string]interface{})
	if !ok {
		return "", errors.New("invalid content format")
	}
	partsAny, ok := content["parts"]
	if !ok {
		return "", errors.New("missing parts in content")
	}
	parts, ok := partsAny.([]interface{})
	if !ok || len(parts) == 0 {
		return "", errors.New("no parts returned in content")
	}
	var partWithInline map[string]interface{}
	for _, p := range parts {
		if pm, ok := p.(map[string]interface{}); ok {
			if _, has := pm["inlineData"]; has {
				partWithInline = pm
				break
			}
		}
	}
	if partWithInline == nil {
		return "", errors.New("no part with inlineData found in content")
	}
	shared.PrettyPrint("First Part", partWithInline)
	inlineAny, ok := partWithInline["inlineData"]
	if !ok {
		return "", errors.New("missing inlineData in part")
	}
	inlineData, ok := inlineAny.(map[string]interface{})
	if !ok {
		return "", errors.New("invalid inlineData format")
	}
	b64Any, ok := inlineData["data"]
	if !ok {
		return "", errors.New("missing base64 data in inlineData")
	}
	_ = fmt.Sprint(b64Any)

	// base64String = base64String[base64String.index("data:image/png;base64,"):]
	// url, err := config.Base64ToGoogleBlob(&base64String)
	// if err != nil {
	// 	return "", err
	// }

	// shared.NormalPrint("Base64 String", base64String)

	return "", nil
}
