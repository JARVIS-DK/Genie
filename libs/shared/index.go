package shared

import (
	db_model "libs/shared/db_connectors/model"
	db_repo "libs/shared/db_connectors/repository"
	components "libs/shared/utils/components"
	helpers "libs/shared/utils/helpers"
	middleware "libs/shared/utils/middleware"
)

type ApiMetaData struct {
	RequestId     string `json:"request_id"`
	Host          string `json:"host"`
	Scheme        string `json:"scheme"`
	Token         string `json:"token"`
	UserId        int    `json:"user_id"`
	Email         string `json:"email"`
	MobileNumber  string `json:"mobile_number"`
	RequestedPath string `json:"requested_path"`
	UserAgent     string `json:"user_agent"`
	Name          string `json:"name"`
}

type ApiRequestDto struct {
	URL         string                 `json:"url"`
	Method      string                 `json:"method"`
	Headers     map[string]interface{} `json:"headers"`
	Body        map[string]interface{} `json:"body"`
	QueryParams map[string]interface{} `json:"query_params"`
	Timeout     int                    `json:"timeout"`
}
type ApiResponseDto struct {
	Data struct {
		Response   interface{} `json:"response_data"`
		StatusCode string      `json:"status_code"`
	} `json:"data"`
	Error  error `json:"error"`
	Status *bool `json:"status"`
}

type ResponseStruct struct {
	Data   map[string]interface{} `json:"data"`
	Error  error                  `json:"error"`
	Status bool                   `json:"status"`
}

// ========== Mongo Repository Functions ==========

type MongoRepositoryFunctions db_repo.MongoRepositoryFunctions

var MongoRepository = db_repo.NewMongoRepo
var MongoCollectionName = db_model.CollectionName

// ========== Middleware Functions ==========

var ErrorHandler = middleware.ErrorHandler
var RespSuccess = middleware.RespSuccess
var RespSuccessWithPagination = middleware.RespSuccessWithPagination
var RespFailure = middleware.RespFailure
var RespPageNotFound = middleware.RespPageNotFound
var RespUnathourized = middleware.RespUnathourized
var RespValidationFailure = middleware.RespValidationFailure
var BindErrorStructure = middleware.BindErrorStructure
var GenerateJWT = middleware.GenerateJWT
var AuthorizationCheck = middleware.AuthorizationCheck
var ValidationErrorStructure = middleware.ValidationErrorStructure
var JsonMarshalErrorStructure = middleware.JsonMarshalErrorStructure
var ValidationFieldStructure = middleware.ValidationFieldStructure
var GenerateOtp = helpers.GenerateOtp
var DecodeToken = helpers.DecodeTokenAndExtractClaims

// ========== Helper Functions ==========

var PrettyPrint = helpers.PrettyPrint
var FormatDuration = helpers.FormatDuration
var NormalPrint = helpers.NormalPrint
var GetUSDExchangeRate = helpers.GetUSDExchangeRate
var ParseJsonPathFromObject = helpers.ParseJsonPathFromObject
var GenerateRandomString = helpers.GenerateRandomString
var GenerateRandomStringLowerCase = helpers.GenerateRandomStringLowerCase
var GenerateRandomAlphaNumericString = helpers.GenerateRandomAlphanumeric
var JsonMarshaller = helpers.JsonMarshaller
var CallFuncByName = helpers.CallFuncByName
var GetStructMethods = helpers.GetStructMethods
var ArraySlice = helpers.ArraySlice
var Mod = helpers.Mod
var LogOutput = helpers.LogOutput
var Contains = helpers.Contains
var ContainsString = helpers.ContainsString
var UniqueAppend = helpers.UniqueAppend
var RemoveUint = helpers.RemoveUint
var RemoveElementFromArray = helpers.RemoveElementFromArray
var ContainsInterface = helpers.ContainsInterface

// ========== Component Functions ==========
var APIRequestComponentProcessor = components.APIRequestComponentProcessor
var UploadToGCS = components.UploadToGCS
