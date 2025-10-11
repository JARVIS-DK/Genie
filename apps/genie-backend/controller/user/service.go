package user

import (
	env "apps/genie-backend/config"
	shared "libs/shared"
	"strings"
)

type Service interface {
	Register(data UserRegisterRequestDto, metaData shared.ApiMetaData) (interface{}, error)
	GetUser(metaData shared.ApiMetaData, query map[string]interface{}) (interface{}, error)
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

func (s *service) Register(data UserRegisterRequestDto, metaData shared.ApiMetaData) (interface{}, error) {

	collectionName := shared.MongoCollectionName["USERS"]

	var userData map[string]interface{}
	shared.JsonMarshaller(data, &userData)

	userData["email"] = strings.ToLower(userData["email"].(string))
	userData["is_password_available"] = false
	userData["subscription_type"] = "Free"
	userData["wallet"] = map[string]interface{}{
		"balance":  0.00,
		"currency": "INR",
		// "points": 0,
	}

	response, err := s.db.CreateOne(env.GlobalEnv["MONGO_CREDENTIAL"], collectionName, userData)
	if err != nil {
		return nil, err
	}
	return response, nil
}

func (s *service) GetUser(metaData shared.ApiMetaData, query map[string]interface{}) (interface{}, error) {
	collectionName := shared.MongoCollectionName["USERS"]
	resp, err := s.db.GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], collectionName, query)
	if err != nil {
		return nil, err
	}
	return resp, nil
}
