# weather_agent.py
from google.adk.agents import Agent

WeatherAgent = Agent(
    name="WeatherAgent",
    description="Handles weather-related questions.",
    model="gemini-2.5-flash",
    instruction="You are a weather assistant. Give current and forecast details."
)
