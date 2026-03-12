package chats

import (
	"apps/genie-backend/controller/chats/agents"
	"apps/genie-backend/controller/chats/models"
	"libs/shared"
)

type Service interface {
	Execute(metaData shared.ApiMetaData, data models.ExecuteRequestDto) (shared.ResponseStruct, error)
	GetConversationHistory(metaData shared.ApiMetaData) (interface{}, error)
	GetChatHistory(metaData shared.ApiMetaData, conversationId string) (interface{}, error)
	RenameConversation(metaData shared.ApiMetaData, conversationId string) (interface{}, error)
	DeleteConversation(metaData shared.ApiMetaData, conversationId string) (interface{}, error)
}

type service struct {
	db shared.MongoRepositoryFunctions
}

var newServiceObj *service

func NewService() *service {
	if newServiceObj != nil {
		return newServiceObj
	}

	new_db := shared.MongoRepository()

	newServiceObj = &service{new_db}
	return newServiceObj
}

func (s *service) Execute(metaData shared.ApiMetaData, data models.ExecuteRequestDto) (shared.ResponseStruct, error) {

	resp, err := agents.Orchestrator(data, s.db, metaData)
	if err != nil {
		return shared.ResponseStruct{
			Data:   nil,
			Status: false,
			Error:  err,
		}, err
	}

	UpdateConversation(metaData, data, resp)
	UpdateChatHistory(metaData, data, resp)

	var mappedResp map[string]interface{}
	shared.JsonMarshaller(resp, &mappedResp)

	return shared.ResponseStruct{
		Data:   mappedResp,
		Status: true,
		Error:  nil,
	}, nil
}

func (s *service) GetConversationHistory(metaData shared.ApiMetaData) (interface{}, error) {
	return nil, nil
}

func (s *service) GetChatHistory(metaData shared.ApiMetaData, conversationId string) (interface{}, error) {
	return nil, nil
}

func (s *service) RenameConversation(metaData shared.ApiMetaData, conversationId string) (interface{}, error) {
	return nil, nil
}

func (s *service) DeleteConversation(metaData shared.ApiMetaData, conversationId string) (interface{}, error) {
	return nil, nil
}
