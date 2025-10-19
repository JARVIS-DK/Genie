from mongo_services.mongo_service import mongo_service
from mongo_services.collections import MongoDBCollections

def get_api_keys(code: str) -> str:
    """
    This function is used to get the api keys from the database.
    """
    collection_name = MongoDBCollections["API_KEYS"]
    query = {"code": code}
    mongo_resp = mongo_service.find_one(collection_name=collection_name, query=query)
    if mongo_resp["status"] == "error":
        raise Exception(mongo_resp["message"])

    return mongo_resp["data"]["api_key"]