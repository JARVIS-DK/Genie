import requests
import json
from agents.helpers.helpers import get_api_keys

def coding_agent(query: str) -> str:
    """
    Gemini-powered coding agent that generates or debugs code dynamically.
    Returns the response in Markdown format.
    """

    # Gemini API setup
    GEMINI_API_KEY = get_api_keys("GOOGLE_TEXT_TO_IMAGE_API_KEY") # 🔐 Replace with your actual Gemini API key
    print(GEMINI_API_KEY, "Gemini API Key")
    GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

    # Craft a strong, context-rich system prompt
    system_prompt = f"""
    You are a coding assistant. Respond ONLY with programming-related answers.
    You must return all responses in clean Markdown format with proper syntax highlighting.
    If debugging code, explain the bug clearly and show the corrected code.
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
        text = "⚠️ Error: Unable to parse Gemini response.\n\n" + json.dumps(result, indent=2)

    # Wrap result in Markdown
    markdown_response = f"```markdown\n{text}\n```"
    return markdown_response