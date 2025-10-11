package repository

import (
	"context"
	"errors"
	"libs/shared/db_connectors/db"
	"libs/shared/utils/helpers"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoRepositoryFunctions interface {
	CreateOne(credentials interface{}, collectionName string, data map[string]interface{}) (interface{}, error)
	UpdateOne(credentials interface{}, collectionName string, data map[string]interface{}, query interface{}) (interface{}, error)
	UpdateMany(credentials interface{}, collectionName string, data map[string]interface{}, query interface{}) (interface{}, error)
	UpdateManyWithCustomPayload(credentials interface{}, collectionName string, updatePayload bson.M, query interface{}) (interface{}, error)
	GetOne(credentials interface{}, collectionName string, query interface{}, optionalParams ...interface{}) (interface{}, error)
	GetOneWithSort(credentials interface{}, collectionName string, query interface{}, sort interface{}) (interface{}, error)
	DeleteOne(credentials interface{}, collectionName string, query interface{}) (interface{}, error)
	DeleteMany(credentials interface{}, collectionName string, query interface{}) (interface{}, error)
	GetMany(credentials interface{}, collectionName string, query interface{}) ([]interface{}, error)
	GetManyWithPagination(credentials interface{}, collectionName string, query interface{}, sortings interface{}, perPage int, pageNo int, optionalParams ...interface{}) (map[string]interface{}, error)
	CountDocuments(credentials interface{}, collectionName string, query interface{}) (int64, error)
	UpdateOneWithArrayFilters(credentials interface{}, collectionName string, updatePayload bson.M, query interface{}, arrayFilters []interface{}) (interface{}, error)
	UpsertOne(credentials interface{}, collectionName string, data map[string]interface{}, query interface{}) (interface{}, error)
}

type mongoRepository struct{}

var newMongoRepoObj *mongoRepository //singleton object

// singleton method
func NewMongoRepo() *mongoRepository {
	if newMongoRepoObj != nil {
		return newMongoRepoObj
	}
	return &mongoRepository{}
}

func (r *mongoRepository) getNextSequenceValue(collection *mongo.Collection, sequenceName string) (int, error) {
	filter := bson.M{"_id": sequenceName}
	update := bson.M{"$inc": bson.M{"sequence_value": 1}}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)

	var updatedDocument bson.M
	err := collection.FindOneAndUpdate(context.TODO(), filter, update, opts).Decode(&updatedDocument)
	if err != nil {
		return 0, err
	}

	if val, ok := updatedDocument["sequence_value"].(int32); ok {
		return int(val), nil
	}

	return 0, errors.New("unable to retrieve the next sequence value")
}

func (r *mongoRepository) CreateOne(credentials interface{}, collectionName string, data map[string]interface{}) (interface{}, error) {

	var err error

	collection := db.GetMongoDb(credentials).Collection(collectionName)

	countersCollection := db.GetMongoDb(credentials).Collection("counters") // The collection for tracking sequences

	// Generate the next auto-increment ID
	id, err := r.getNextSequenceValue(countersCollection, collectionName)
	if err != nil {
		return nil, err
	}

	data["_id"] = id // Set the auto-generated ID
	data["id"] = id
	data["created_at"] = time.Now().UTC()
	data["updated_at"] = time.Now().UTC()

	result, err := collection.InsertOne(context.TODO(), data)
	if err != nil {
		return nil, err
	}

	var insertedDocument bson.M
	err = collection.FindOne(context.TODO(), bson.M{"_id": result.InsertedID}).Decode(&insertedDocument)
	if err != nil {
		return nil, err
	}

	var respData map[string]interface{}
	helpers.JsonMarshaller(insertedDocument, &respData)

	return respData, nil
}
func (r *mongoRepository) UpdateOne(credentials interface{}, collectionName string, data map[string]interface{}, query interface{}) (interface{}, error) {

	var err error
	var dataBsonM bson.M

	collection := db.GetMongoDb(credentials).Collection(collectionName)

	err = collection.FindOne(context.Background(), query).Decode(&dataBsonM)
	if err != nil {
		return nil, err
	}
	updateDoc := bson.M{}
	setFields := bson.M{}

	for key, value := range data {
		if key[0] == '$' {
			// This is an update operator, add it directly to the update document
			updateDoc[key] = value
		} else {
			// This is a field to be set, add it to the $set operator
			setFields[key] = value
		}
	}

	// Always include updated_at in the $set operator
	setFields["updated_at"] = time.Now().UTC()

	// created_at is comming as null while updating as it is in dto , so we are deleting it
	if setFields["created_at"] == nil || setFields["created_at"] == "0001-01-01T00:00:00Z" {
		delete(setFields, "created_at")
	}
	// If we have fields to set, add the $set operator to the update document
	if len(setFields) > 0 {
		updateDoc["$set"] = setFields
	}

	_, err = collection.UpdateOne(context.TODO(), query, updateDoc)
	if err != nil {
		return nil, err
	}

	err = collection.FindOne(context.Background(), query).Decode(&dataBsonM)
	if err != nil {
		return nil, err
	}

	var respData map[string]interface{}
	helpers.JsonMarshaller(dataBsonM, &respData)

	return respData, nil
}
func (r *mongoRepository) UpdateMany(credentials interface{}, collectionName string, data map[string]interface{}, query interface{}) (interface{}, error) {
	var err error
	var dataBsonM []bson.M

	collection := db.GetMongoDb(credentials).Collection(collectionName)

	updateDoc := bson.M{}
	setFields := bson.M{}

	for key, value := range data {
		if key[0] == '$' {
			// This is an update operator, add it directly to the update document
			updateDoc[key] = value
		} else {
			// This is a field to be set, add it to the $set operator
			setFields[key] = value
		}
	}

	// Always include updated_at in the $set operator
	setFields["updated_at"] = time.Now().UTC()

	// If we have fields to set, add the $set operator to the update document
	if len(setFields) > 0 {
		updateDoc["$set"] = setFields
	}

	// Perform the UpdateMany operation
	_, err = collection.UpdateMany(context.TODO(), query, updateDoc)
	if err != nil {
		return nil, err
	}

	// Find and retrieve the updated documents after the operation
	cursor, err := collection.Find(context.Background(), query)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	// Decode the documents into a BSON array
	err = cursor.All(context.Background(), &dataBsonM)
	if err != nil {
		return nil, err
	}

	var respData []map[string]interface{}
	for _, doc := range dataBsonM {
		var docMap map[string]interface{}
		helpers.JsonMarshaller(doc, &docMap)
		respData = append(respData, docMap)
	}

	return respData, nil
}

func (r *mongoRepository) UpdateManyWithCustomPayload(credentials interface{}, collectionName string, updatePayload bson.M, query interface{}) (interface{}, error) {
	collection := db.GetMongoDb(credentials).Collection(collectionName)

	// Perform the UpdateMany operation
	result, err := collection.UpdateMany(context.TODO(), query, updatePayload)
	if err != nil {

		return nil, err
	}

	return result, nil
}

func (r *mongoRepository) GetOneOld(credentials interface{}, collectionName string, query interface{}) (interface{}, error) {

	var err error
	var dataBsonM bson.M
	var data map[string]interface{}

	collection := db.GetMongoDb(credentials).Collection(collectionName)

	err = collection.FindOne(context.Background(), query).Decode(&dataBsonM)
	if err != nil {
		return nil, err
	}

	err = helpers.JsonMarshaller(dataBsonM, &data)
	if err != nil {
		return nil, err
	}

	return data, nil
}

func (r *mongoRepository) GetOne(credentials interface{}, collectionName string, query interface{}, optionalParams ...interface{}) (interface{}, error) {
	collection := db.GetMongoDb(credentials).Collection(collectionName)

	// Check if aggregation pipeline is provided in optionalParams
	var aggregationPipeline []bson.D
	if len(optionalParams) > 0 {
		if agg, ok := optionalParams[0].([]bson.D); ok {
			aggregationPipeline = agg
		}
	}

	// Perform either aggregation or regular query
	if len(aggregationPipeline) > 0 {
		// If aggregation is provided, add a $limit stage to ensure only one document is returned
		aggregationPipeline = append(aggregationPipeline, bson.D{{"$limit", 1}})

		// Run the aggregation
		cur, err := collection.Aggregate(context.TODO(), aggregationPipeline)
		if err != nil {
			return nil, err
		}
		defer cur.Close(context.TODO())

		// Check if there's a result
		if cur.Next(context.TODO()) {
			var result bson.M
			err := cur.Decode(&result)
			if err != nil {
				return nil, err
			}
			return result, nil
		}
		return nil, mongo.ErrNoDocuments
	} else {
		// Regular query execution
		var result bson.M
		err := collection.FindOne(context.Background(), query).Decode(&result)
		if err != nil {
			return nil, err
		}
		return result, nil
	}
}

func (r *mongoRepository) DeleteOne(credentials interface{}, collectionName string, query interface{}) (interface{}, error) {

	var err error
	var dataBsonM bson.M

	collection := db.GetMongoDb(credentials).Collection(collectionName)

	err = collection.FindOne(context.Background(), query).Decode(&dataBsonM)
	if err != nil {
		return nil, err
	}
	result, err := collection.DeleteOne(context.TODO(), query)

	if err != nil {
		return nil, err
	}

	return result, nil
}
func (r *mongoRepository) GetMany(credentials interface{}, collectionName string, query interface{}) ([]interface{}, error) {
	var results []interface{}
	collection := db.GetMongoDb(credentials).Collection(collectionName)

	totalCount, err := collection.CountDocuments(context.TODO(), query)
	if err != nil {
		return nil, err
	}

	if totalCount == 0 {
		return results, nil
	}

	cursor, err := collection.Find(context.TODO(), query)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())

	for cursor.Next(context.TODO()) {
		var document map[string]interface{}
		err := cursor.Decode(&document)
		if err != nil {
			return nil, err
		}
		results = append(results, document)
	}

	if err := cursor.Err(); err != nil {
		return nil, err
	}

	// 	results["data"] = resp_arr

	return results, nil
}

// func (r *mongoRepository) GetManyWithPagination(credentials interface{}, collectionName string, query interface{}, sortings interface{}, perPage int, pageNo int, optionalParams ...interface{}) (map[string]interface{}, error) {
// 	var results = map[string]interface{}{
// 		"data": []interface{}{},
// 		"pagination": map[string]interface{}{
// 			"per_page":    perPage,
// 			"page_no":     pageNo,
// 			"total_rows":  0,
// 			"total_pages": 0,
// 		},
// 	}

// 	collection := db.GetMongoDb(credentials).Collection(collectionName)

// 	// Check if aggregation pipeline is provided in optionalParams
// 	var aggregationPipeline []bson.D
// 	if len(optionalParams) > 0 {
// 		if agg, ok := optionalParams[0].([]bson.D); ok {
// 			aggregationPipeline = agg
// 		}
// 	}

// 	// Regular query pagination settings
// 	findOptions := options.Find()

// 	var sortBson bson.D
// 	var sortMap map[string]interface{}
// 	helpers.JsonMarshaller(sortings, &sortMap)
// 	for key, value := range sortMap {
// 		sortBson = append(sortBson, bson.E{Key: key, Value: value})
// 	}

// 	if sortings != nil {
// 		findOptions.SetSort(sortBson)
// 	}
// 	if perPage > 0 {
// 		findOptions.SetLimit(int64(perPage))
// 	}
// 	if pageNo > 0 {
// 		findOptions.SetSkip(int64((pageNo - 1) * perPage))
// 	}

// 	// Perform either aggregation or regular query
// 	var totalCount int64
// 	var err error
// 	if len(aggregationPipeline) > 0 {
// 		// If aggregation is provided, modify the pipeline for pagination
// 		aggregationPipeline := []bson.D{
// 			// Add a $facet stage
// 			{{"$facet", bson.D{
// 				{"totalCount", bson.A{
// 					bson.D{{"$count", "count"}},
// 				}},
// 				{"paginatedResults", bson.A{
// 					bson.D{{"$skip", int64((pageNo - 1) * perPage)}},
// 					bson.D{{"$limit", int64(perPage)}},
// 				}},
// 			}}},
// 		}

// 		// Run the aggregation
// 		cur, err := collection.Aggregate(context.TODO(), aggregationPipeline)
// 		if err != nil {
// 			return nil, err
// 		}
// 		defer cur.Close(context.TODO())

// 		var result []bson.M
// 		if err := cur.All(context.TODO(), &result); err != nil {
// 			return nil, err
// 		}

// 		// Extract total count and paginated results
// 		var totalCount int64
// 		var paginatedResults []bson.M

// 		if len(result) > 0 {
// 			if countArray, ok := result[0]["totalCount"].([]interface{}); ok && len(countArray) > 0 {
// 				if countDoc, ok := countArray[0].(bson.M); ok {
// 					totalCount = countDoc["count"].(int64)
// 				}
// 			}
// 			if paginatedArray, ok := result[0]["paginatedResults"].([]interface{}); ok {
// 				for _, item := range paginatedArray {
// 					if bsonItem, ok := item.(bson.M); ok {
// 						paginatedResults = append(paginatedResults, bsonItem)
// 					}
// 				}
// 			}
// 		}

// 		// Marshal the results
// 		var resp_arr []interface{}
// 		err = helpers.JsonMarshaller(paginatedResults, &resp_arr)
// 		if err != nil {
// 			return nil, err
// 		}

// 		results := make(map[string]interface{})
// 		results["total"] = totalCount
// 		if resp_arr != nil {
// 			results["data"] = resp_arr
// 		} else {
// 			results["data"] = []interface{}{}
// 		}

// 		return results, nil

// 	} else {
// 		// Regular query execution
// 		totalCount, err = collection.CountDocuments(context.TODO(), query)
// 		if err != nil {
// 			return nil, err
// 		}

// 		if totalCount == 0 {
// 			return results, nil
// 		}

// 		cur, err := collection.Find(context.TODO(), query, findOptions)
// 		if err != nil {
// 			return nil, err
// 		}

// 		var bsonResults []bson.M
// 		for cur.Next(context.TODO()) {
// 			var elem bson.M
// 			err := cur.Decode(&elem)
// 			if err != nil {
// 				return nil, err
// 			}
// 			bsonResults = append(bsonResults, elem)
// 		}

// 		var resp_arr []interface{}
// 		err = helpers.JsonMarshaller(bsonResults, &resp_arr)
// 		if err != nil {
// 			return nil, err
// 		}

// 		results["data"] = resp_arr
// 	}

// 	// Pagination logic
// 	totalPages := 1
// 	if perPage != -1 {
// 		totalPages = int((totalCount + int64(perPage) - 1) / int64(perPage))
// 	}

// 	results["pagination"] = map[string]interface{}{
// 		"per_page":    perPage,
// 		"page_no":     pageNo,
// 		"total_rows":  totalCount,
// 		"total_pages": totalPages,
// 	}

// 	return results, nil
// }

func (r *mongoRepository) GetManyWithPagination(credentials interface{}, collectionName string, query interface{}, sortings interface{}, perPage int, pageNo int, optionalParams ...interface{}) (map[string]interface{}, error) {
	var results = map[string]interface{}{
		"data": []interface{}{},
		"pagination": map[string]interface{}{
			"per_page":    perPage,
			"page_no":     pageNo,
			"total_rows":  0,
			"total_pages": 0,
		},
	}

	collection := db.GetMongoDb(credentials).Collection(collectionName)

	// Check if aggregation pipeline is provided in optionalParams
	var aggregationPipeline []bson.D
	if len(optionalParams) > 0 {
		if agg, ok := optionalParams[0].([]bson.D); ok {
			aggregationPipeline = agg
		}
	}

	// Sorting options
	var sortBson bson.D
	var sortMap map[string]interface{}
	helpers.JsonMarshaller(sortings, &sortMap)
	for key, value := range sortMap {
		sortBson = append(sortBson, bson.E{Key: key, Value: value})
	}

	// Determine if we should use pagination
	usePagination := perPage > 0 && pageNo > 0

	// Perform either aggregation or regular query
	var totalCount int64
	var err error
	if len(aggregationPipeline) > 0 {
		// If aggregation is provided
		countPipeline := append(aggregationPipeline, bson.D{{"$count", "count"}})

		// Run the count aggregation
		countCur, err := collection.Aggregate(context.TODO(), countPipeline)
		if err != nil {
			return nil, err
		}
		defer countCur.Close(context.TODO())

		var countResult []bson.M
		if err := countCur.All(context.TODO(), &countResult); err != nil {
			return nil, err
		}

		if len(countResult) > 0 {
			// helpers.PrettyPrint("Checking", totalCount)
			totalCount = int64(countResult[0]["count"].(int32))
		}

		// Prepare the main aggregation pipeline
		mainPipeline := aggregationPipeline
		if usePagination {
			mainPipeline = append(mainPipeline,
				bson.D{{"$skip", int64((pageNo - 1) * perPage)}},
				bson.D{{"$limit", int64(perPage)}},
			)
		}
		if sortings != nil {
			mainPipeline = append(mainPipeline, bson.D{{"$sort", sortBson}})
		} else {
			// defaultSorting := bson.D{
			// 	{"$or", bson.A{
			// 		bson.D{{"updated_at", -1}},
			// 		bson.D{{"created_at", -1}},
			// 	}},
			// }
			// mainPipeline = append(mainPipeline, bson.D{{"$sort", defaultSorting}})
		}

		// Run the main aggregation
		cur, err := collection.Aggregate(context.TODO(), mainPipeline)
		if err != nil {
			return nil, err
		}
		defer cur.Close(context.TODO())

		var aggregationResults []bson.M
		if err := cur.All(context.TODO(), &aggregationResults); err != nil {
			return nil, err
		}

		// Marshal the results
		var resp_arr []interface{}
		err = helpers.JsonMarshaller(aggregationResults, &resp_arr)
		if err != nil {
			return nil, err
		}

		if resp_arr != nil {
			results["data"] = resp_arr
		} else {
			results["data"] = []interface{}{}
		}

	} else {
		// Regular query execution
		totalCount, err = collection.CountDocuments(context.TODO(), query)
		if err != nil {
			return nil, err
		}

		if totalCount == 0 {
			return results, nil
		}

		findOptions := options.Find()
		if sortings != nil {
			findOptions.SetSort(sortBson)
		}
		if usePagination {
			findOptions.SetLimit(int64(perPage))
			findOptions.SetSkip(int64((pageNo - 1) * perPage))
		}

		cur, err := collection.Find(context.TODO(), query, findOptions)
		if err != nil {
			return nil, err
		}

		var bsonResults []bson.M
		for cur.Next(context.TODO()) {
			var elem bson.M
			err := cur.Decode(&elem)
			if err != nil {
				return nil, err
			}
			bsonResults = append(bsonResults, elem)
		}

		var resp_arr []interface{}
		err = helpers.JsonMarshaller(bsonResults, &resp_arr)
		if err != nil {
			return nil, err
		}

		results["data"] = resp_arr
	}

	// Pagination info
	totalPages := 1
	if usePagination {
		totalPages = int((totalCount + int64(perPage) - 1) / int64(perPage))
	} else {
		perPage = -1 // Indicate no pagination
		pageNo = 1
	}

	results["pagination"] = map[string]interface{}{
		"per_page":    perPage,
		"page_no":     pageNo,
		"total_rows":  totalCount,
		"total_pages": totalPages,
	}

	return results, nil
}

// DeleteMany deletes multiple documents from a collection
func (r *mongoRepository) DeleteMany(credentials interface{}, collectionName string, query interface{}) (interface{}, error) {
	collection := db.GetMongoDb(credentials).Collection(collectionName)

	// Perform the delete operation
	result, err := collection.DeleteMany(context.TODO(), query)
	if err != nil {
		return nil, err
	}

	return result, nil
}
func (r *mongoRepository) CountDocuments(credentials interface{}, collectionName string, query interface{}) (int64, error) {
	collection := db.GetMongoDb(credentials).Collection(collectionName)

	// Perform the count operation
	count, err := collection.CountDocuments(context.TODO(), query)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (r *mongoRepository) UpdateOneWithArrayFilters(credentials interface{}, collectionName string, updatePayload bson.M, query interface{}, arrayFilters []interface{}) (interface{}, error) {
	var dataBsonM bson.M
	collection := db.GetMongoDb(credentials).Collection(collectionName)

	// Create options with array filters
	opts := options.FindOneAndUpdate().
		SetArrayFilters(options.ArrayFilters{
			Filters: arrayFilters,
		}).
		SetReturnDocument(options.After)

	// Perform the update
	err := collection.FindOneAndUpdate(
		context.Background(),
		query,
		updatePayload,
		opts,
	).Decode(&dataBsonM)
	if err != nil {
		return nil, err
	}

	var respData map[string]interface{}
	helpers.JsonMarshaller(dataBsonM, &respData)

	return respData, nil
}

func (r *mongoRepository) UpsertOne(credentials interface{}, collectionName string, data map[string]interface{}, query interface{}) (interface{}, error) {
	collection := db.GetMongoDb(credentials).Collection(collectionName)

	updateDoc := bson.M{}
	setFields := bson.M{}

	// Process the data fields
	for key, value := range data {
		if key[0] == '$' {
			// This is an update operator, add it directly to the update document
			updateDoc[key] = value
		} else {
			// This is a field to be set, add it to the $set operator
			setFields[key] = value
		}
	}

	// Set timestamps
	now := time.Now().UTC()
	setFields["updated_at"] = now

	// Only set created_at if it's a new document
	var existingDoc bson.M
	err := collection.FindOne(context.Background(), query).Decode(&existingDoc)
	if err == mongo.ErrNoDocuments {

		countersCollection := db.GetMongoDb(credentials).Collection("counters") // The collection for tracking sequences

		// Generate the next auto-increment ID
		id, err := r.getNextSequenceValue(countersCollection, collectionName)
		if err != nil {
			return nil, err
		}
		setFields["_id"] = id // Set the auto-generated ID
		setFields["id"] = id
		setFields["created_at"] = time.Now().UTC()

	}

	// If we have fields to set, add the $set operator to the update document
	if len(setFields) > 0 {
		updateDoc["$set"] = setFields
	}

	// Set upsert option to true
	opts := options.Update().SetUpsert(true)

	result, err := collection.UpdateOne(context.TODO(), query, updateDoc, opts)
	if err != nil {
		return nil, err
	}

	// If it was an insert, get the inserted ID
	var finalQuery interface{}
	if result.UpsertedID != nil {
		finalQuery = bson.M{"id": result.UpsertedID}
	} else {
		finalQuery = query
	}

	// Get the final document
	var finalDoc bson.M
	err = collection.FindOne(context.Background(), finalQuery).Decode(&finalDoc)
	if err != nil {
		return nil, err
	}

	var respData map[string]interface{}
	helpers.JsonMarshaller(finalDoc, &respData)

	return respData, nil
}

func (r *mongoRepository) GetOneWithSort(credentials interface{}, collectionName string, query interface{}, sort interface{}) (interface{}, error) {
	collection := db.GetMongoDb(credentials).Collection(collectionName)

	// Create find options with sort
	findOptions := options.FindOne()

	// Convert sort map to BSON
	var sortBson bson.D
	var sortMap map[string]interface{}
	helpers.JsonMarshaller(sort, &sortMap)
	for key, value := range sortMap {
		sortBson = append(sortBson, bson.E{Key: key, Value: value})
	}

	if sort != nil {
		findOptions.SetSort(sortBson)
	}

	// Execute find one with sort
	var result bson.M
	err := collection.FindOne(context.Background(), query, findOptions).Decode(&result)
	if err != nil {
		return nil, err
	}
	return result, nil
}
