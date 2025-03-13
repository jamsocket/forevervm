from typing import Any, Dict, List, Literal, Optional, TypedDict


class RequestOptions(TypedDict, total=False):
    timeout: int


class WhoamiResponse(TypedDict):
    account: str


class CreateMachineRequest(TypedDict, total=False):
    tags: Dict[str, str]


class CreateMachineResponse(TypedDict):
    machine_name: str


class Machine(TypedDict):
    name: str
    created_at: str
    running: bool
    has_pending_instructions: bool
    expires_at: Optional[str]
    tags: Dict[str, str]


class ListMachinesResponse(TypedDict):
    machines: List[Machine]


class ExecResultBase(TypedDict):
    runtime_ms: int


class ExecResultValue(ExecResultBase):
    value: Optional[str]
    data: Optional[Dict[str, Any]]


class ExecResultError(ExecResultBase):
    error: str


ExecResult = ExecResultValue | ExecResultError


class ExecResponse(TypedDict):
    instruction_seq: int
    machine: str
    interrupted: bool


class ExecResultResponse(TypedDict):
    instruction_id: int
    result: ExecResult


class StandardOutput(TypedDict):
    stream: Literal["stdout"] | Literal["stderr"]
    data: str
