# finance_agent.py
from google.adk.agents import Agent

FinanceAgent = Agent(
    name="FinanceAgent",
    description="Handles questions about markets, stocks, or finance.",
    model="gemini-2.5-flash",
    instruction="You are an expert financial assistant. Explain clearly and accurately."
)
