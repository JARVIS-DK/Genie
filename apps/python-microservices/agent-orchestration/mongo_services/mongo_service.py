from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from config.env import GlobalEnv

class MongoDBService:
    def __init__(self, uri: str, db_name: str):

        try:
            self.client = MongoClient(uri, serverSelectionTimeoutMS=30000)
            self.client.server_info()
            self.db = self.client[db_name]
            print(f"Connected to MongoDB database: {db_name}\n\n")
        except ServerSelectionTimeoutError as e:
            print(f"Server selection timeout error: {e}")
            self.client = None
            self.db = None
        except Exception as e:
            print(f"Error connecting to MongoDB: {e}")
            self.client = None
            self.db = None
    
    def insert_one(self, collection_name: str, data: dict):
        if self.client is None or self.db is None:
            print("Error: MongoDB client or database not initialized")
            return {"status": "error", "message": "MongoDB client or database not initialized"}
        try:
            collection = self.db[collection_name]
            result = collection.insert_one(data)
            return {"status": "success", "message": "Document inserted successfully"}
        except Exception as e:
            print(f"Error inserting one document into MongoDB: {e}")
            return {"status": "error", "message": f"Error inserting one document into MongoDB: {e}"}

    def find_one(self, collection_name: str, query: dict):
        if self.client is None or self.db is None:
            print("Error: MongoDB client or database not initialized")
            return {"status": "error", "message": "MongoDB client or database not initialized"}
        try:
            collection = self.db[collection_name]
            result = collection.find_one(query)
            return {"status": "success", "message": "Document found successfully", "data": result}
        except Exception as e:
            print(f"Error finding one document in MongoDB: {e}")
            return {"status": "error", "message": f"Error finding one document in MongoDB: {e}"}

    def find_many(self, collection_name: str, query: dict):
        if self.client is None or self.db is None:
            print("Error: MongoDB client or database not initialized")
            return {"status": "error", "message": "MongoDB client or database not initialized"}
        try:
            collection = self.db[collection_name]
            result = collection.find(query)
            return {"status": "success", "message": "Documents found successfully", "data": list(result)}
        except Exception as e:
            print(f"Error finding many documents in MongoDB: {e}")
            return {"status": "error", "message": f"Error finding many documents in MongoDB: {e}"}

    def update_one(self, collection_name: str, query: dict, data: dict):
        if self.client is None or self.db is None:
            print("Error: MongoDB client or database not initialized")
            return {"status": "error", "message": "MongoDB client or database not initialized"}
        try:
            collection = self.db[collection_name]
            result = collection.update_one(query, data)
            return {"status": "success", "message": "Document updated successfully", "data": result}
        except Exception as e:
            print(f"Error updating one document in MongoDB: {e}")
            return {"status": "error", "message": f"Error updating one document in MongoDB: {e}"}



def get_mongo_uri(mongo_credentials: dict):
    mongo_uri = ""
    if mongo_credentials['MONGO_DB_SRV'] == True:
        mongo_uri = f"mongodb+srv://{mongo_credentials['MONGO_DB_USER']}:{mongo_credentials['MONGO_DB_PASSWORD']}@{mongo_credentials['MONGO_DB_HOST']}"
    else:
        mongo_uri = f"mongodb://{mongo_credentials['MONGO_DB_HOST']}:{mongo_credentials['MONGO_DB_PORT']}"
    print(f"MongoDB URI: {mongo_uri}\n\n")
    return mongo_uri



mongo_credentials = GlobalEnv["MONGO_CREDENTIAL"]
mongo_db_name = mongo_credentials['MONGO_DB_NAME']
mongo_uri = get_mongo_uri(mongo_credentials)


mongo_service = MongoDBService(mongo_uri, mongo_db_name)


