package middleware

import (
	"fmt"
	helpers "libs/shared/utils/helpers"
	"net/http"
	"reflect"

	"github.com/labstack/echo/v4"
)

type SuccessResponse struct {
	Meta struct {
		Status  bool   `json:"status"`
		Message string `json:"message"`
	} `json:"meta"`
	Data interface{} `json:"data"`
}

type FailureResponse struct {
	Meta struct {
		Status  bool   `json:"status"`
		Message string `json:"message"`
	} `json:"meta"`
	Error struct {
		Name    string `json:"name"`
		Message string `json:"message"`
	} `json:"error"`
}

type SuccessResponseWithPagination struct {
	Meta struct {
		Status     bool                   `json:"status"`
		Message    string                 `json:"message"`
		Pagination map[string]interface{} `json:"pagination"`
	} `json:"meta"`
	Data []interface{} `json:"data"`
}

func RespSuccess(c echo.Context, message string, data interface{}) error {
	response := SuccessResponse{}

	// Ensure data is always an array in the JSON response
	if data == nil {
		response.Data = []interface{}{}
	} else if reflect.TypeOf(data).Kind() == reflect.Slice && reflect.ValueOf(data).Len() == 0 {
		response.Data = []interface{}{}
	} else {
		response.Data = data
	}

	response.Meta.Status = true
	response.Meta.Message = message

	return c.JSON(http.StatusOK, response)
}

func RespSuccessWithPagination(c echo.Context, message string, data []interface{}, pagination interface{}) error {
	response := SuccessResponseWithPagination{}
	response.Data = data
	response.Meta.Status = true
	response.Meta.Message = message
	helpers.JsonMarshaller(pagination, &response.Meta.Pagination)
	return c.JSON(http.StatusOK, response)
}

func RespFailure(c echo.Context, message string, err interface{}) error {
	response := FailureResponse{}
	response.Meta.Status = false
	response.Meta.Message = message
	response.Error.Name = message
	response.Error.Message = fmt.Sprintf("%v", err)

	return c.JSON(http.StatusInternalServerError, response)
}

func RespPageNotFound(c echo.Context, message string, err interface{}) error {
	response := FailureResponse{}
	response.Meta.Status = false
	response.Meta.Message = message
	response.Error.Name = message
	response.Error.Message = fmt.Sprintf("%v", err)

	return c.JSON(http.StatusNotFound, response)
}

func RespUnathourized(c echo.Context, message string, err interface{}) error {
	response := FailureResponse{}
	response.Meta.Status = false
	response.Meta.Message = message
	response.Error.Name = message
	response.Error.Message = fmt.Sprintf("%v", err)

	return c.JSON(http.StatusUnauthorized, response)
}

func RespValidationFailure(c echo.Context, message string, err interface{}) error {
	response := FailureResponse{}
	response.Meta.Status = false
	response.Meta.Message = message
	response.Error.Name = message
	response.Error.Message = fmt.Sprintf("%v", err)

	return c.JSON(http.StatusBadRequest, response)
}

func ErrorHandler(err error, c echo.Context) {
	_, ok := err.(*echo.HTTPError)
	if !ok {
		_ = echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	RespFailure(c, "Internal Server Error", err)
}
