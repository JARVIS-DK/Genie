from agents.tools.code_agent import coding_agent
from google.adk.agents import LlmAgent

coding_agent = LlmAgent(
    name="CodingAgent",
    description="You are a coding agent. You are given a query and you need to search the web for the answer. don't alter the answer and retain the markdown format",
    model="gemini-2.5-flash",
    tools=[coding_agent],
)