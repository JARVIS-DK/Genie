package db

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var db *mongo.Database

func GetMongoDb(credentials interface{}) *mongo.Database {
	mongo_credentials := credentials.(map[string]interface{})

	MONGO_DB_NAME := mongo_credentials["MONGO_DB_NAME"].(string)
	MONGO_DB_HOST := mongo_credentials["MONGO_DB_HOST"].(string)
	MONGO_DB_PORT := mongo_credentials["MONGO_DB_PORT"].(string)
	MONGO_DB_USER := mongo_credentials["MONGO_DB_USER"].(string)
	MONGO_DB_PASSWORD := mongo_credentials["MONGO_DB_PASSWORD"].(string)
	MONGO_DB_SRV := mongo_credentials["MONGO_DB_SRV"].(bool)

	var MONGO_DB_USERNAME_AND_PASSWORD string
	if MONGO_DB_USER != "" && MONGO_DB_PASSWORD != "" {
		MONGO_DB_USERNAME_AND_PASSWORD = fmt.Sprintf("%s:%s@", MONGO_DB_USER, MONGO_DB_PASSWORD)
	}

	MONGO_DB_HOST_AND_PORT := MONGO_DB_HOST

	if !MONGO_DB_SRV {
		if MONGO_DB_PORT != "" {
			MONGO_DB_HOST_AND_PORT = fmt.Sprintf("%s:%s", MONGO_DB_HOST, MONGO_DB_PORT)
		} else if MONGO_DB_PORT == "" {
			MONGO_DB_HOST_AND_PORT = fmt.Sprintf("%s:27017", MONGO_DB_HOST)
		}
	}

	var MONGO_DB_SRV_VALUE string
	if MONGO_DB_SRV {
		MONGO_DB_SRV_VALUE = "+srv"
		MONGO_DB_HOST_AND_PORT = MONGO_DB_HOST
	}

	connectionString := fmt.Sprintf("mongodb%s://%s%s/%s", MONGO_DB_SRV_VALUE, MONGO_DB_USERNAME_AND_PASSWORD, MONGO_DB_HOST_AND_PORT, MONGO_DB_NAME)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(connectionString))
	if err != nil {
		fmt.Println("Error connecting to MongoDB", err)
		return nil
	}
	if err := mongoClient.Ping(ctx, nil); err != nil {
		fmt.Println("Error pinging MongoDB", err)
		return nil
	}

	db = mongoClient.Database(MONGO_DB_NAME)

	return db

}
