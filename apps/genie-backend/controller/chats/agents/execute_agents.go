package agents

import (
	sub_agents "apps/genie-backend/controller/chats/agents/sub_agents"
	"errors"
	"libs/shared"
)

func ExecuteAgents(agent string, args map[string]interface{}, db shared.MongoRepositoryFunctions, metaData shared.ApiMetaData) (shared.ResponseStruct, error) {
	shared.PrettyPrint("ExecuteAgents Input Agent Name", agent)
	shared.PrettyPrint("ExecuteAgents Input Args", args)

	switch agent {
	case "image_generation":
		var data sub_agents.GeminiImageGenerationRequest
		shared.JsonMarshaller(args, &data)
		resp, err := sub_agents.GeminiImageGeneration(data, db, metaData)
		if err != nil {
			shared.PrettyPrint("ExecuteAgents Error (image_generation)", err)
			return shared.ResponseStruct{
				Data:   nil,
				Error:  err,
				Status: false,
			}, err
		}
		return resp, nil

	case "video_generation":
		var data sub_agents.GeminiVideoGenerationRequest
		shared.JsonMarshaller(args, &data)
		resp, err := sub_agents.GeminiVideoGeneration(data, db, metaData)
		if err != nil {
			shared.PrettyPrint("ExecuteAgents Error (video_generation)", err)
			return shared.ResponseStruct{
				Data:   nil,
				Error:  err,
				Status: false,
			}, err
		}
		return resp, nil
	case "audio_generation":
		var data sub_agents.GeminiAudioGenerationRequest
		shared.JsonMarshaller(args, &data)
		resp, err := sub_agents.GeminiAudioGeneration(data, db, metaData)
		if err != nil {
			shared.PrettyPrint("ExecuteAgents Error (audio_generation)", err)
			return shared.ResponseStruct{
				Data:   nil,
				Error:  err,
				Status: false,
			}, err
		}
		return resp, nil
	case "code_execution":
		var data sub_agents.GeminiCodeExecutionRequest
		shared.JsonMarshaller(args, &data)
		resp, err := sub_agents.GeminiCodeExecution(data, db, metaData)
		if err != nil {
			shared.PrettyPrint("ExecuteAgents Error (code_execution)", err)
			return shared.ResponseStruct{
				Data:   nil,
				Error:  err,
				Status: false,
			}, err
		}
		return resp, nil

	case "url_context":
		var data sub_agents.GeminiUrlContextRequest
		shared.JsonMarshaller(args, &data)
		resp, err := sub_agents.GeminiUrlContext(data, db, metaData)
		if err != nil {
			shared.PrettyPrint("ExecuteAgents Error (url_context)", err)
			return shared.ResponseStruct{
				Data:   nil,
				Error:  err,
				Status: false,
			}, err
		}
		return resp, nil

	case "deep_research":
		var data sub_agents.GeminiDeepResearchRequest
		shared.JsonMarshaller(args, &data)
		resp, err := sub_agents.GeminiDeepResearch(data, db, metaData)
		if err != nil {
			shared.PrettyPrint("ExecuteAgents Error (deep_research)", err)
			return shared.ResponseStruct{
				Data:   nil,
				Error:  err,
				Status: false,
			}, err
		}
		return resp, nil

	case "web_search":
		var data sub_agents.GeminiWebSearchRequest
		shared.JsonMarshaller(args, &data)
		resp, err := sub_agents.GeminiWebSearch(data, db, metaData)
		if err != nil {
			shared.PrettyPrint("ExecuteAgents Error (web_search)", err)
			return shared.ResponseStruct{
				Data:   nil,
				Error:  err,
				Status: false,
			}, err
		}
		return resp, nil

	default:
		shared.PrettyPrint("ExecuteAgents Error", "Invalid Agent Called")
		return shared.ResponseStruct{
			Data:   nil,
			Error:  errors.New("Invalid Agent"),
			Status: false,
		}, nil
	}
}
