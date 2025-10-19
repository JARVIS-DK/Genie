from agents.tools.deep_search import deep_search
from google.adk.agents import LlmAgent

deep_search_agent = LlmAgent(
    name="DeepSearchAgent",
    description="You are a deep search agent. You are given a query and you need to search the web for the answer.",
    model="gemini-2.5-flash",
    tools=[deep_search],
)