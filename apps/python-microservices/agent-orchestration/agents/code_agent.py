# code_agent.py
from google.adk.agents import Agent

CodeAgent = Agent(
    name="CodeAgent",
    description="Handles programming or code-related questions.",
    model="gemini-2.5-flash",
    instruction="You are a coding assistant. Write and debug code snippets."
)
