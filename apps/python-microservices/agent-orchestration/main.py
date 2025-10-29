# from fastapi import FastAPI

# app = FastAPI(title="Agent Orchestration Service", version="1.0.0")

# @app.get("/")
# async def root():
#     return {"message": "Agent Orchestration Service is running"}

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)


# main.py

from agent import WebSearchAgent
from google.adk.agents import LlmAgent

root_agent = LlmAgent(
    model="gemini-2.5-flash",
    instructions="You are the root agent. You are given a query and you need to orchestrate the other agents to answer the query.",
    sub_agents=[WebSearchAgent],
    name="RootAgent",
    description="You are the root agent. You are given a query and you need to orchestrate the other agents to answer the query."
)
