import datetime

def get_current_time():
    return datetime.datetime.now().strftime("%d-%m-%Y %H:%M:%S")