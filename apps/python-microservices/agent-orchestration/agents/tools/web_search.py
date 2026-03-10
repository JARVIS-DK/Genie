
from tavily import TavilyClient
from mongo_services.collections import MongoDBCollections
from mongo_services.mongo_service import mongo_service
from agents.helpers.helpers import get_api_keys
import time

def web_search(query: str, search_depth: str = "basic" or "advanced", topics: str = "general" or "news") -> str:
    """
    This function is used to search the web for the answer.
    """

    retry_count = 0
    while retry_count < 3:
        try:

            tavily_api_key = get_api_keys(code="TAVILY_WEB_SEARCH")
            client = TavilyClient(api_key=tavily_api_key)
            response = client.search(
                query=query, 
                search_depth=search_depth, 
                topics=topics, 
                max_results=10, 
                include_answer="advanced"
            )
            print(f"Web search response: {response}\n\n")
            return {"status": "success", "message": "Web search successful", "data": response["answer"]}
        except Exception as e:
            print(f"Error in web_search: {e}\n\n")
            retry_count += 1
            time.sleep(1)
    
    return {"status": "error", "message": "Failed to search the web, Please try again later"}

