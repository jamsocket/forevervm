from collections import deque

import httpx
from httpx_ws import WebSocketSession, connect_ws

from .types import ExecResult, StandardOutput


API_BASE_URL = "wss://api.forevervm.com"


class Repl:
    _request_id = 0

    def __init__(
        self,
        token: str,
        machine_name="new",
        base_url=API_BASE_URL,
    ):
        client = httpx.Client(headers={"authorization": f"Bearer {token}"})
        self._connection = connect_ws(
            f"{API_BASE_URL}/v1/machine/{machine_name}/repl", client
        )
        self._ws = self._connection.__enter__()

    def __del__(self):
        self._connection.__exit__(None, None, None)

    def __enter__(self):
        return self

    def __exit__(self, type, value, traceback):
        self._connection.__exit__(type, value, traceback)

    def exec(self, code: str):
        request_id = self._request_id
        self._request_id += 1

        instruction = {"code": code}
        self._ws.send_json(
            {"type": "exec", "instruction": instruction, "request_id": request_id}
        )
        return ReplExecResult(request_id, self._ws)


class ReplExecResult:
    def __init__(self, request_id: int, ws: WebSocketSession):
        self._request_id = request_id
        self._ws = ws

    def _recv(self):
        msg = self._ws.receive_json()
        if msg["type"] == "exec_received":
            pass
        elif msg["type"] == "output":
            self._output.append(msg["chunk"])
        elif msg["type"] == "result":
            self._result = msg["result"]
        return msg["type"]

    _output = deque[StandardOutput]()

    @property
    def output(self):
        while self._result is None:
            if self._recv() == "output":
                yield self._output.popleft()

        while self._output:
            yield self._output.popleft()

    _result: ExecResult | None = None

    @property
    def result(self):
        while self._result is None:
            self._recv()

        return self._result
