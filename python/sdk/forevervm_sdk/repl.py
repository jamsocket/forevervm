from collections import deque
from warnings import warn
import re
from typing import Any

import httpx
from httpx_ws import WebSocketSession, connect_ws
from forevervm_sdk.config import DEFAULT_INSTRUCTION_TIMEOUT_SECONDS

from .config import API_BASE_URL
from .types import ExecResult, StandardOutput


class ReplException(Exception):
    pass


class ReplExecResult:
    _request_id = -1
    _instruction_id = -1
    _output: deque[StandardOutput]

    def __init__(self, request_id: int, ws: WebSocketSession):
        self._request_id = request_id
        self._ws = ws
        self._output = deque()

    def _recv(self) -> str | None:
        msg = self._ws.receive_json()

        if msg["type"] == "exec_received":
            if msg["request_id"] != self._request_id:
                warn(f"Expected request ID {self._request_id} with message {msg}")
                return None
            self._instruction_id = msg["seq"]

        elif msg["type"] == "output":
            if msg["instruction_id"] != self._instruction_id:
                warn(
                    f"Expected instruction ID {self._instruction_id} with message {msg}"
                )
                return None
            self._output.append(msg["chunk"])

        elif msg["type"] == "result":
            if msg["instruction_id"] != self._instruction_id:
                warn(
                    f"Expected instruction ID {self._instruction_id} with message {msg}"
                )
                return None
            self._result = msg["result"]

        elif msg["type"] == "error":
            raise ReplException(msg["code"])

        return msg["type"]

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


class Repl:
    _request_id = 0
    _instruction: ReplExecResult | None = None
    _connection: Any

    def __init__(
        self,
        token: str,
        machine_name="new",
        base_url=API_BASE_URL,
    ):
        client = httpx.Client(
            headers={"authorization": f"Bearer {token}", "x-forevervm-sdk": "python"}
        )

        base_url = re.sub(r"^http(s)?://", r"ws\1://", base_url)

        self._connection = connect_ws(
            f"{base_url}/v1/machine/{machine_name}/repl", client
        )
        self._ws = self._connection.__enter__()

    def __del__(self):
        self._connection.__exit__(None, None, None)

    def __enter__(self):
        return self

    def __exit__(self, type, value, traceback):
        self._connection.__exit__(type, value, traceback)

    def exec(
        self, code: str, timeout_seconds: int = DEFAULT_INSTRUCTION_TIMEOUT_SECONDS
    ) -> ReplExecResult:
        if self._instruction is not None and self._instruction._result is None:
            raise ReplException("Instruction already running")

        request_id = self._request_id
        self._request_id += 1

        instruction = {"code": code, "timeout_seconds": timeout_seconds}
        self._ws.send_json(
            {"type": "exec", "instruction": instruction, "request_id": request_id}
        )

        self._instruction = ReplExecResult(request_id, self._ws)
        return self._instruction
