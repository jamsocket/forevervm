import httpx
from typing import Type, cast


from .types import (
    CreateMachineResponse,
    ExecResponse,
    ExecResultResponse,
    ListMachinesResponse,
    WhoamiResponse,
)


API_BASE_URL = "https://api.forevervm.com"


class ForeverVM:
    __client: httpx.Client | None = None
    __client_async: httpx.AsyncClient | None = None

    def __init__(self, token: str, base_url=API_BASE_URL):
        self.token = token
        self.base_url = base_url

    def _url(self, path: str):
        return f"{self.base_url}{path}"

    @property
    def _client(self):
        if self.__client == None:
            self.__client = httpx.Client()
        return self.__client

    @property
    def _client_async(self):
        if self.__client_async == None:
            self.__client_async = httpx.AsyncClient()
        return self.__client_async

    def _get[T](self, path: str, type: Type[T]):
        response = self._client.get(
            self._url(path), headers={"Authorization": f"Bearer {self.token}"}
        )

        response.raise_for_status()

        json = response.json()
        return cast(T, json) if type else json

    async def _get_async[T](self, path: str, type: Type[T]):
        response = await self._client_async.get(
            self._url(path), headers={"Authorization": f"Bearer {self.token}"}
        )

        response.raise_for_status()

        json = response.json()
        return cast(T, json) if type else json

    def _post[T](self, path, type: Type[T], data=None):
        response = self._client.post(
            self._url(path),
            headers={"Authorization": f"Bearer {self.token}"},
            json=data,
        )

        response.raise_for_status()

        json = response.json()
        return cast(T, json) if type else json

    async def _post_async[T](self, path, type: Type[T], data=None):
        response = await self._client_async.post(
            self._url(path),
            headers={"Authorization": f"Bearer {self.token}"},
            json=data,
        )

        response.raise_for_status()

        json = response.json()
        return cast(T, json) if type else json

    def whoami(self):
        return self._get("/v1/whoami", type=WhoamiResponse)

    def whoami_async(self):
        return self._get_async("/v1/whoami", type=WhoamiResponse)

    def create_machine(self):
        return self._post("/v1/machine/new", type=CreateMachineResponse)

    def create_machine_async(self):
        return self._post_async("/v1/machine/new", type=CreateMachineResponse)

    def list_machines(self):
        return self._get("/v1/machine/list", type=ListMachinesResponse)

    def list_machines_async(self):
        return self._get_async("/v1/machine/list", type=ListMachinesResponse)

    def exec(self, code: str, machine_name: str | None = None, interrupt: bool = False):
        if not machine_name:
            new_machine = self.create_machine()
            machine_name = new_machine["machine_name"]

        return self._post(
            f"/v1/machine/{machine_name}/exec",
            type=ExecResponse,
            data={"instruction": {"code": code}, "interrupt": interrupt},
        )

    async def exec_async(
        self, code: str, machine_name: str | None = None, interrupt: bool = False
    ):
        if not machine_name:
            new_machine = await self.create_machine_async()
            machine_name = new_machine["machine_name"]

        return self._post_async(
            f"/v1/machine/{machine_name}/exec",
            type=ExecResponse,
            data={"instruction": {"code": code}, "interrupt": interrupt},
        )

    def exec_result(self, machine_name: str, instruction_id: int):
        return self._get(
            f"/v1/machine/{machine_name}/exec/{instruction_id}/result",
            type=ExecResultResponse,
        )

    def exec_result_async(self, machine_name: str, instruction_id: int):
        return self._get_async(
            f"/v1/machine/{machine_name}/exec/{instruction_id}/result",
            type=ExecResultResponse,
        )

    def repl(self):
        pass
