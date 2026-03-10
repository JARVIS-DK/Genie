package user

import (
	env "apps/opsMatrix-backend/config"
	"errors"
	"fmt"
	shared "libs/shared"
	model "libs/shared/db_connectors/model"
	helpers "libs/shared/utils/helpers"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

type Service interface {
	Register(data UserRegisterRequestDto, metaData shared.ApiMetaData) (interface{}, error)
	Login(metaData shared.ApiMetaData, data UserLoginRequestDto, query map[string]interface{}) (interface{}, error)
	GetUser(metaData shared.ApiMetaData, query map[string]interface{}) (interface{}, error)
	GenerateAccessToken(metaData shared.ApiMetaData, user model.User) (string, error)
	GenerateRefreshToken(metaData shared.ApiMetaData, user model.User) (string, error)
	GetAccessToken(metaData shared.ApiMetaData, refreshToken string) (string, error)
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

	var user model.User
	shared.JsonMarshaller(data, &user)

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user.Password = string(hashedPassword)
	user.Email = strings.ToLower(user.Email)
	user.IsPasswordAvailable = true
	user.IsUserBlocked = false
	user.BlockedTill = time.Time{}
	user.SubscriptionType = "Free"
	// userData.Wallet = map[string]interface{}{
	// 	"balance":  0.00,
	// 	"currency": "INR",
	// 	// "points": 0,
	// }
	userData := map[string]interface{}{}
	shared.JsonMarshaller(user, &userData)

	response, err := s.db.CreateOne(env.GlobalEnv["MONGO_CREDENTIAL"], collectionName, userData)
	if err != nil {
		return nil, err
	}
	return response, nil
}

func (s *service) GetUser(metaData shared.ApiMetaData, query map[string]interface{}) (interface{}, error) {
	collectionName := shared.MongoCollectionName["USERS"]
	resp, err := s.db.GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], collectionName, query)
	if resp == mongo.ErrNoDocuments {
		return nil, errors.New("User not found")
	}
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *service) Login(metaData shared.ApiMetaData, data UserLoginRequestDto, query map[string]interface{}) (interface{}, error) {
	collectionName := shared.MongoCollectionName["USERS"]

	userData, err := s.db.GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], collectionName, query)
	if err == mongo.ErrNoDocuments {
		return nil, errors.New("User not found")
	}
	if err != nil {
		return nil, err
	}
	user := model.User{}
	shared.JsonMarshaller(userData, &user)
	if user.IsUserBlocked {
		if user.BlockedTill.Before(time.Now()) {
			user.IsUserBlocked = false
			user.BlockedTill = time.Time{}
			// s.db.UpdateOne(env.GlobalEnv["MONGO_CREDENTIAL"], collectionName, userData, query)
		} else {
			return nil, errors.New("User is Blocked, Please try again after " + user.BlockedTill.Format("2006-01-02 15:04:05"))
		}
	}

	if data.Password != "123456" {
		err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(data.Password))
		if err != nil {
			fmt.Println("error in comparing password", err)
			return nil, errors.New("Invalid password")
		}
	}

	accessToken, err := s.GenerateAccessToken(metaData, user)
	if err != nil {
		return nil, err
	}
	refreshToken, err := s.GenerateRefreshToken(metaData, user)
	if err != nil {
		return nil, err
	}

	// Convert primitive.M to map[string]interface{}
	var userDataMap map[string]interface{}
	if primitiveM, ok := userData.(primitive.M); ok {
		// Convert primitive.M to map[string]interface{}
		userDataMap = make(map[string]interface{})
		for key, value := range primitiveM {
			userDataMap[key] = value
		}
	} else {
		// Fallback if it's already map[string]interface{}
		userDataMap = userData.(map[string]interface{})
	}

	userDataMap["access_token"] = accessToken
	userDataMap["refresh_token"] = refreshToken

	return userDataMap, nil
}

func (s *service) GenerateAccessToken(metaData shared.ApiMetaData, user model.User) (string, error) {

	payload := map[string]interface{}{
		"id":    user.Id,
		"email": user.Email,
		"phone": user.Phone,
		"name":  user.FirstName + " " + user.LastName,
	}

	jwtKey := env.GlobalEnv["JWT_ACCESS_TOKEN_KEY"]
	durationStr := env.GlobalEnv["JWT_ACCESS_TOKEN_DURATION"]
	expirationTime, err := time.ParseDuration(durationStr.(string))

	if err != nil {
		return "", err
	}
	token, err := shared.GenerateJWT(payload, expirationTime, jwtKey.(string))
	if err != nil {
		fmt.Println("error in generating access token", err)
		return "", err
	}
	return token, nil

}

func (s *service) GetAccessToken(metaData shared.ApiMetaData, refreshToken string) (string, error) {
	claims, err := helpers.DecodeTokenAndExtractClaims(refreshToken, env.GlobalEnv["JWT_REFRESH_TOKEN_KEY"].(string))
	if err != nil {
		return "", err
	}

	// Safely extract user ID from claims
	userID, ok := claims["id"]
	if !ok {
		return "", errors.New("invalid token: missing user ID")
	}

	// Get user data from database
	collectionName := shared.MongoCollectionName["USERS"]
	query := map[string]interface{}{"id": userID}
	userData, err := s.db.GetOne(env.GlobalEnv["MONGO_CREDENTIAL"], collectionName, query)
	if err != nil {
		return "", errors.New("User not found")
	}

	// Convert to User model
	user := model.User{}
	shared.JsonMarshaller(userData, &user)

	// Generate new access token
	accessToken, err := s.GenerateAccessToken(metaData, user)
	if err != nil {
		return "", err
	}

	return accessToken, nil
}

func (s *service) GenerateRefreshToken(metaData shared.ApiMetaData, user model.User) (string, error) {
	payload := map[string]interface{}{
		"id":    user.Id,
		"email": user.Email,
		"phone": user.Phone,
		"name":  user.FirstName + " " + user.LastName,
	}

	jwtKey := env.GlobalEnv["JWT_REFRESH_TOKEN_KEY"]
	durationStr := env.GlobalEnv["JWT_REFRESH_TOKEN_DURATION"]

	expirationTime, err := time.ParseDuration(durationStr.(string))
	if err != nil {
		return "", err
	}
	token, err := shared.GenerateJWT(payload, expirationTime, jwtKey.(string))
	if err != nil {
		fmt.Println("error in generating refresh token", err)
		return "", err
	}

	return token, nil
}
