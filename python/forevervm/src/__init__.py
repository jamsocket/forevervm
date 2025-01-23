API_BASE_URL = "https://api.forevervm.com"


class ForeverVM:
    def __init__(self, token, base_url=API_BASE_URL):
        self.token = token
        self.base_url = base_url
