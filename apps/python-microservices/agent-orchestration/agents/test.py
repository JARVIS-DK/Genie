# Test that imports are working correctly
from agents.tools.web_search import web_search
from agents.tools.deep_search import deep_search

print("✅ Import test successful!")
print("✅ web_search function imported successfully")
print("✅ deep_search function imported successfully")

# Test the function (this will fail due to API key issues, but import works)
try:
    result = web_search(query="What is the capital of France?")
    print(f"Web search result: {result}")
except Exception as e:
    print(f"Web search failed (expected due to API key): {e}")