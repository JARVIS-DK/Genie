from google.adk.agents import LlmAgent
from agents.tools.general_chatbot import general_chatbot

general_chatbot_agent = LlmAgent(
    name="GeneralChatbotAgent",
    description="You are a general chatbot agent. You are given a query. don't alter the answer and retain the markdown format",
    model="gemini-2.5-flash",
    tools=[general_chatbot],
)