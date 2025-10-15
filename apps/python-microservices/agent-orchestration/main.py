# from fastapi import FastAPI

# app = FastAPI(title="Agent Orchestration Service", version="1.0.0")

# @app.get("/")
# async def root():
#     return {"message": "Agent Orchestration Service is running"}

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)


# main.py
from agents.master_agent import MasterAgent

while True:
    query = input("\nAsk something: ")
    if query.lower() in ["exit", "quit"]:
        break
    response = MasterAgent(query)
    print("\n🤖:", response)
