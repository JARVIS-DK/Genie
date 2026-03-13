package chats

import (
	"apps/genie-backend/controller/chats/agents"
	"apps/genie-backend/controller/chats/agents/sub_agents"
	"apps/genie-backend/controller/chats/llm"
	"apps/genie-backend/controller/chats/models"
	"libs/shared"
)

type Service interface {
	Execute(metaData shared.ApiMetaData, data models.ExecuteRequestDto) (shared.ResponseStruct, error)
	ExecuteStream(metaData shared.ApiMetaData, data models.ExecuteRequestDto, sw *models.StreamWriter) error
	ExecuteBrowserUse(metaData shared.ApiMetaData, data models.ExecuteRequestDto) (shared.ResponseStruct, error)
	ExecuteBrowserUseCancel(metaData shared.ApiMetaData, data models.ExecuteRequestDto, taskId string) (shared.ResponseStruct, error)
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

func (s *service) ExecuteStream(metaData shared.ApiMetaData, data models.ExecuteRequestDto, sw *models.StreamWriter) error {

	resp, err := agents.OrchestratorStream(data, s.db, metaData, sw)
	if err != nil {
		return err
	}

	UpdateConversation(metaData, data, resp)
	UpdateChatHistory(metaData, data, resp)

	return nil
}

func (s *service) ExecuteBrowserUse(metaData shared.ApiMetaData, data models.ExecuteRequestDto) (shared.ResponseStruct, error) {

	resp, err := agents.OrchestrateBrowserUse(data.Message, s.db)
	if err != nil {
		return shared.ResponseStruct{
			Data:   nil,
			Status: false,
			Error:  err,
		}, err
	}

	message := "Browser task completed."
	if out, ok := resp["output"].(string); ok && out != "" {
		message = out
	} else if status, ok := resp["status"].(string); ok && status != "" {
		message = "Task finished with status: " + status
	}

	var parsedSteps []models.Step
	if stepsRaw, ok := resp["steps"]; ok && stepsRaw != nil {
		shared.JsonMarshaller(stepsRaw, &parsedSteps)
	}

	historyResp := models.ExecuteResponseDto{
		Message:               message,
		AgentsExecutedResults: []models.AgentsExecutedResults{},
		Steps:                 parsedSteps,
	}

	UpdateConversation(metaData, data, historyResp)
	UpdateChatHistory(metaData, data, historyResp)

	return shared.ResponseStruct{
		Data:   resp,
		Status: true,
		Error:  nil,
	}, nil
}

func (s *service) ExecuteBrowserUseCancel(metaData shared.ApiMetaData, data models.ExecuteRequestDto, taskId string) (shared.ResponseStruct, error) {
	apiKey, err := llm.GetApiKey("BROWSER_USE", s.db)
	if err != nil {
		return shared.ResponseStruct{
			Data:   nil,
			Status: false,
			Error:  err,
		}, err
	}
	resp, err := sub_agents.BrowserUseUpdateTask(taskId, apiKey)
	if err != nil {
		return shared.ResponseStruct{
			Data:   nil,
			Status: false,
			Error:  err,
		}, err
	}

	message := "Browser task cancelled."
	if out, ok := resp["output"].(string); ok && out != "" {
		message = out
	} else if status, ok := resp["status"].(string); ok && status != "" {
		message = "Task cancelled with status: " + status
	}

	var parsedSteps []models.Step
	if stepsRaw, ok := resp["steps"]; ok && stepsRaw != nil {
		shared.JsonMarshaller(stepsRaw, &parsedSteps)
	}

	historyResp := models.ExecuteResponseDto{
		Message:               message,
		AgentsExecutedResults: []models.AgentsExecutedResults{},
		Steps:                 parsedSteps,
	}

	UpdateConversation(metaData, data, historyResp)
	UpdateChatHistory(metaData, data, historyResp)

	return shared.ResponseStruct{
		Data:   resp,
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
