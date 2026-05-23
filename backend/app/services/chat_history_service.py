chat_history = []


def save_chat(chat_data):
    chat_history.append(chat_data)


def get_chat_history():
    return chat_history