from fastapi import FastAPI

app = FastAPI(title="Agent Orchestration Service", version="1.0.0")

@app.get("/")
async def root():
    return {"message": "Agent Orchestration Service is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
