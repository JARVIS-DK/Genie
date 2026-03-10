from agents.tools.current_time import get_current_time
from google.adk.agents import LlmAgent

current_time_agent = LlmAgent(
    name="CurrentTimeAgent",
    description="You are a current time agent. You are given a query and you need to return the current time in the format DD-MM-YYYY HH:MM:SS",
    model="gemini-2.5-flash",
    tools=[get_current_time],
)