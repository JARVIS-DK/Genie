from agents.tools.web_search import web_search
from google.adk.agents import LlmAgent

web_search_agent = LlmAgent(
    name="WebSearchAgent",
    description="You are a web search agent. You are given a query and you need to search the web for the answer. search_depth is the depth of the search(basic or advanced) and topics is the topics of the search(general or news).",
    model="gemini-2.5-flash",
    tools=[web_search],
)



