import httpx
from typing import Type, cast, TypeVar

from .config import API_BASE_URL
from .repl import Repl
from .types import (
    CreateMachineRequest,
    CreateMachineResponse,
    ExecResponse,
    ExecResultResponse,
    ListMachinesResponse,
    RequestOptions,
    WhoamiResponse,
)
from forevervm_sdk.config import DEFAULT_INSTRUCTION_TIMEOUT_SECONDS

T = TypeVar("T")


class ForeverVM:
    __client: httpx.Client | None = None
    __client_async: httpx.AsyncClient | None = None

    def __init__(self, token: str, base_url=API_BASE_URL):
        self._token = token
        self._base_url = base_url

    def _url(self, path: str):
        return f"{self._base_url}{path}"

    def _headers(self):
        return {"authorization": f"Bearer {self._token}", "x-forevervm-sdk": "python"}

    @property
    def _client(self):
        if self.__client is None:
            self.__client = httpx.Client(headers=self._headers())
        return self.__client

    @property
    def _client_async(self):
        if self.__client_async is None:
            self.__client_async = httpx.AsyncClient()
        return self.__client_async

    def _get(self, path: str, type: Type[T], **kwargs: RequestOptions) -> T:
        response = self._client.get(self._url(path), headers=self._headers(), **kwargs)

        response.raise_for_status()

        json = response.json()
        return cast(T, json) if type else json

    async def _get_async(self, path: str, type: Type[T], **kwargs: RequestOptions) -> T:
        response = await self._client_async.get(
            self._url(path), headers=self._headers(), **kwargs
        )

        response.raise_for_status()

        json = response.json()
        return cast(T, json) if type else json

    def _post(self, path, type: Type[T], data=None, **kwargs: RequestOptions):
        response = self._client.post(
            self._url(path), headers=self._headers(), json=data, **kwargs
        )

        response.raise_for_status()

        json = response.json()
        return cast(T, json) if type else json

    async def _post_async(
        self, path, type: Type[T], data=None, **kwargs: RequestOptions
    ):
        response = await self._client_async.post(
            self._url(path), headers=self._headers(), json=data, **kwargs
        )

        response.raise_for_status()

        json = response.json()
        return cast(T, json) if type else json

    def whoami(self):
        return self._get("/v1/whoami", type=WhoamiResponse)

    def whoami_async(self):
        return self._get_async("/v1/whoami", type=WhoamiResponse)

    def create_machine(self, tags: dict[str, str] = None):
        request: CreateMachineRequest = {}
        if tags:
            request["tags"] = tags
        return self._post("/v1/machine/new", type=CreateMachineResponse, data=request)

    def create_machine_async(self, tags: dict[str, str] = None):
        request: CreateMachineRequest = {}
        if tags:
            request["tags"] = tags
        return self._post_async(
            "/v1/machine/new", type=CreateMachineResponse, data=request
        )

    def list_machines(self):
        return self._get("/v1/machine/list", type=ListMachinesResponse)

    def list_machines_async(self):
        return self._get_async("/v1/machine/list", type=ListMachinesResponse)

    def exec(
        self,
        code: str,
        machine_name: str | None = None,
        interrupt: bool = False,
        timeout_seconds: int = DEFAULT_INSTRUCTION_TIMEOUT_SECONDS,
    ):
        if not machine_name:
            new_machine = self.create_machine()
            machine_name = new_machine["machine_name"]

        return self._post(
            f"/v1/machine/{machine_name}/exec",
            type=ExecResponse,
            data={
                "instruction": {"code": code, "timeout_seconds": timeout_seconds},
                "interrupt": interrupt,
            },
        )

    async def exec_async(
        self,
        code: str,
        machine_name: str | None = None,
        interrupt: bool = False,
        timeout_seconds: int = DEFAULT_INSTRUCTION_TIMEOUT_SECONDS,
    ):
        if not machine_name:
            new_machine = await self.create_machine_async()
            machine_name = new_machine["machine_name"]

        return await self._post_async(
            f"/v1/machine/{machine_name}/exec",
            type=ExecResponse,
            data={
                "instruction": {"code": code, "timeout_seconds": timeout_seconds},
                "interrupt": interrupt,
            },
        )

    def exec_result(self, machine_name: str, instruction_id: int):
        return self._get(
            f"/v1/machine/{machine_name}/exec/{instruction_id}/result",
            type=ExecResultResponse,
            timeout=1_200,
        )

    def exec_result_async(self, machine_name: str, instruction_id: int):
        return self._get_async(
            f"/v1/machine/{machine_name}/exec/{instruction_id}/result",
            type=ExecResultResponse,
            timeout=1_200,
        )

    def repl(self, machine_name="new") -> Repl:
        return Repl(
            token=self._token, machine_name=machine_name, base_url=self._base_url
        )
