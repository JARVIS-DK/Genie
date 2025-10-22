import  requests
from mongo_services.mongo_service import mongo_service
from mongo_services.collections import MongoDBCollections
from agents.helpers.helpers import get_api_keys

def deep_search(query: str) -> str:
    try:
        

        jina_api_key = get_api_keys(code="JINA_DEEP_SEARCH")
        url = "https://deepsearch.jina.ai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {jina_api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "jina-deepsearch-v1",
            "messages": [
                {
                    "role": "user",
                    "content": query
                }
            ],
            "reasoning_effort": "medium"
        }
        response = requests.post(url, headers=headers, json=data)
        if response.status_code != 200:
            raise Exception(response.text)

        data = response.json()
        if data["choices"] is not None:
            print(f"Deep search response: {data['choices'][0]['delta']['content']}\n\n")
            return {"status": "success", "message": "Deep search successful", "data": data["choices"][0]["delta"]["content"]}
        else:
            return {"status": "error", "message": "No response from Deep Search"}
    except Exception as e:
        return {"status": "error", "message": f"Error in Deep Search: {e}"}