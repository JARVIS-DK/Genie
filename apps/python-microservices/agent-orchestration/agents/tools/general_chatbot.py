import requests
import json
from agents.helpers.helpers import get_api_keys

def general_chatbot(query: str) -> str:
    """
    Gemini-powered general chatbot agent that chats with the user.
    Returns the response in Markdown format.
    """

    # Gemini API setup
    GEMINI_API_KEY = get_api_keys("GOOGLE_TEXT_TO_IMAGE_API_KEY") 
    GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

    
    system_prompt = f"""
    You are a general chatbot assistant. You are given a query and you need to answer the query.
    User Query: {query}
    """

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": system_prompt}]
            }
        ]
    }

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
    }

    # Make the API call
    response = requests.post(GEMINI_API_URL, headers=headers, data=json.dumps(payload))
    result = response.json()

    # Extract text safely
    try:
        text = result["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        text = "Error: Unable to parse Gemini response.\n\n" + json.dumps(result, indent=2)

    # Wrap result in Markdown
    markdown_response = f"```markdown\n{text}\n```"
    return markdown_response