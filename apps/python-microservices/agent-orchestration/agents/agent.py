from google.adk.agents import LlmAgent
from agents.sub_agents.web_search import web_search_agent
from agents.sub_agents.deep_search import deep_search_agent


root_agent = LlmAgent(
    name="MasterAgent",
    description="You are the master agent. You are given a query and you need to orchestrate the other agents to answer the query. All the responses should be in the markdown format. Don't alter the response from the deep search agent",
    model="gemini-2.5-flash",
    sub_agents=[web_search_agent, deep_search_agent],
)











# # code_agent.py
# from google.adk.agents import LlmAgent
# from tavily import TavilyClient

# def web_search(query: str) -> str:

#     api_key = "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"
#     client = TavilyClient(api_key=api_key)
#     response = client.search(query=query, search_depth="advanced", topics="general", max_results=10, include_answer="advanced")
#     return response["answer"]


# def location(query: str) -> str:
#     print(f"Searching the web for: {query}")
#     return f"Search results for: {query}, My city is Mumbai."

# WebSearchAgent = LlmAgent(
#     model="gemini-2.5-flash",
#     # system_prompt="You are a google search agent. You are given a query and you need to search the web for the information.",
#     tools=[web_search],
#     name="WebSearchAgent",
#     description="You are a google search agent. You are given a query and you need to search the web for the information."
# )

# LocationAgent = LlmAgent(
#     model="gemini-2.5-flash",
#     tools=[location],
#     name="LocationAgent",
#     description="You are a location agent. You will provide the location of the user based on the query."
# )

# root_agent = LlmAgent(
#     model="gemini-2.5-flash",
#     # system_prompt="You are the root agent. You are given a query and you need to orchestrate the other agents to answer the query.",
#     sub_agents=[WebSearchAgent, LocationAgent],
#     name="RootAgent",
#     description="You are the root agent. You are given a query and you need to orchestrate the other agents to answer the query."
# )
