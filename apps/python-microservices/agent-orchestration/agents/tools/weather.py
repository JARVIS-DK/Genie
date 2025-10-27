import requests
from agents.helpers.helpers import get_api_keys

def get_weather(city_name: str) -> str:
    api_key = get_api_keys("OPENWEATHERMAP")
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city_name}&appid={api_key}"
    response = requests.get(url)
    data = response.json()
    print(f"Weather response: {data}\n\n")

    if data["cod"] != 200:
        return {"error": data["message"]}


    weather = data["weather"][0]["main"]
    weather_description = data["weather"][0]["description"]
    weather_temperature = data["main"]["temp"]
    weather_humidity = data["main"]["humidity"]

    temperature_in_celsius = weather_temperature - 273.15


    return {"weather": weather, "weather_description": weather_description, "temperature": temperature_in_celsius, "humidity": weather_humidity}
