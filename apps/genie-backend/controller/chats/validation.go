package chats

import (
	"apps/genie-backend/controller/chats/models"
	"libs/shared"

	validation "github.com/go-ozzo/ozzo-validation"
	"github.com/labstack/echo/v4"
)

func ValidateExecute(next echo.HandlerFunc) echo.HandlerFunc {
	data := &models.ExecuteRequestDto{}
	return func(c echo.Context) error {
		err := c.Bind(data)
		if err != nil {
			return shared.RespValidationFailure(c, "Invalid request body", err)
		}
		shared.PrettyPrint("ExecuteRequest", data)

		err = validation.ValidateStruct(data,
			validation.Field(&data.ConversationId, validation.Required),
			validation.Field(&data.Message, validation.Required),
		)
		if err != nil {
			validationError := shared.ValidationErrorStructure(err)
			return shared.RespValidationFailure(c, "Invalid request body", validationError)
		}
		shared.PrettyPrint("ExecuteRequest validated", data)

		c.Set("executeRequest", data)
		return next(c)
	}
}

func ValidateGetConversations(next echo.HandlerFunc) echo.HandlerFunc {
	data := &models.GetConversationsRequestDto{}
	return func(c echo.Context) error {
		err := c.Bind(data)
		if err != nil {
			return shared.RespValidationFailure(c, "Invalid request body", err)
		}
		shared.PrettyPrint("GetConversationsRequest", data)

		err = validation.ValidateStruct(data)
		if err != nil {
			validationError := shared.ValidationErrorStructure(err)
			return shared.RespValidationFailure(c, "Invalid request body", validationError)
		}
		shared.PrettyPrint("GetConversationsRequest validated", data)

		c.Set("getConversationsRequest", data)
		return next(c)
	}
}

func ValidateGetChatHistory(next echo.HandlerFunc) echo.HandlerFunc {
	data := &models.GetChatHistoryRequestDto{}
	return func(c echo.Context) error {
		err := c.Bind(data)
		if err != nil {
			return shared.RespValidationFailure(c, "Invalid request body", err)
		}
		shared.PrettyPrint("GetChatHistoryRequest", data)

		err = validation.ValidateStruct(data)
		if err != nil {
			validationError := shared.ValidationErrorStructure(err)
			return shared.RespValidationFailure(c, "Invalid request body", validationError)
		}
		shared.PrettyPrint("GetChatHistoryRequest validated", data)

		c.Set("getChatHistoryRequest", data)
		return next(c)
	}
}

func ValidateRenameConversation(next echo.HandlerFunc) echo.HandlerFunc {
	data := &models.RenameConversationRequestDto{}
	return func(c echo.Context) error {
		err := c.Bind(data)
		if err != nil {
			return shared.RespValidationFailure(c, "Invalid request body", err)
		}
		shared.PrettyPrint("RenameConversationRequest", data)

		err = validation.ValidateStruct(data,
			validation.Field(&data.ConversationId, validation.Required),
			validation.Field(&data.OldName, validation.Required),
			validation.Field(&data.NewName, validation.Required),
		)
		if err != nil {
			validationError := shared.ValidationErrorStructure(err)
			return shared.RespValidationFailure(c, "Invalid request body", validationError)
		}
		shared.PrettyPrint("RenameConversationRequest validated", data)

		c.Set("renameConversationRequest", data)
		return next(c)
	}
}

func ValidateDeleteConversation(next echo.HandlerFunc) echo.HandlerFunc {
	data := &models.DeleteConversationRequestDto{}
	return func(c echo.Context) error {
		err := c.Bind(data)
		if err != nil {
			return shared.RespValidationFailure(c, "Invalid request body", err)
		}
		shared.PrettyPrint("DeleteConversationRequest", data)

		err = validation.ValidateStruct(data)
		if err != nil {
			validationError := shared.ValidationErrorStructure(err)
			return shared.RespValidationFailure(c, "Invalid request body", validationError)
		}
		shared.PrettyPrint("DeleteConversationRequest validated", data)

		c.Set("deleteConversationRequest", data)
		return next(c)
	}
}
