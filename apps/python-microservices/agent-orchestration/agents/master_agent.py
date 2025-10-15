# master_agent.py
from google.adk.agents import Agent, ParallelAgent
from agents.finance_agent import FinanceAgent
from agents.weather_agent import WeatherAgent
from agents.code_agent import CodeAgent

all_agents = [FinanceAgent, WeatherAgent, CodeAgent]

def select_agents(user_query: str):
    """
    Simple logic: uses model reasoning to select relevant agents.
    You can make it smarter with embeddings or keyword detection.
    """
    # Here we use Gemini model to classify which agents fit
    from google.adk.models import Model
    classifier = Model("gemini-2.5-flash")

    prompt = f"""
    You are a router. Select which of the following agents should handle the query:
    Agents: {', '.join([a.name for a in all_agents])}
    Query: "{user_query}"
    Return agent names as a comma-separated list.
    """

    response = classifier.generate_text(prompt)
    selected = [a for a in all_agents if a.name.lower() in response.lower()]
    return selected or [FinanceAgent]  # fallback

def MasterAgent(user_query: str):
    selected_agents = select_agents(user_query)
    print(f"🔍 Selected agents: {[a.name for a in selected_agents]}")

    if len(selected_agents) == 1:
        result = selected_agents[0].run(user_query)
    else:
        # run in parallel and combine outputs
        multi = ParallelAgent(agents=selected_agents)
        result = multi.run(user_query)

    return result
