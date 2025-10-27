from agents.tools.weather import get_weather
from google.adk.agents import LlmAgent

weather_agent = LlmAgent(
    name="WeatherAgent",
    description="You are a weather agent. You are given a city name and you need to search the web for the weather. don't alter the answer and retain the markdown format",
    model="gemini-2.5-flash",
    tools=[get_weather],
)