import requests
from forevervm.client.types import WhoamiResponse

API_BASE_URL = "https://api.forevervm.com"


class ForeverVM:
    def __init__(self, token, base_url=API_BASE_URL):
        self.token = token
        self.base_url = base_url

    def get(self, path):
        result = requests.get(
            f"{self.base_url}{path}", headers={"Authorization": f"Bearer {self.token}"}
        )
        result.raise_for_status()
        return result

    def post(self, path, data):
        result = requests.post(
            f"{self.base_url}{path}",
            headers={"Authorization": f"Bearer {self.token}"},
            json=data,
        )
        result.raise_for_status()
        return result

    def whoami(self) -> WhoamiResponse:
        return self.get("/v1/whoami").json()
