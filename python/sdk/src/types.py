from typing import List, Optional, TypedDict


class WhoamiResponse(TypedDict):
    account: str


class CreateMachineResponse(TypedDict):
    machine_name: str


class Machine(TypedDict):
    name: str
    created_at: str
    running: bool
    has_pending_instructions: bool
    expires_at: Optional[str]


class ListMachinesResponse(TypedDict):
    machines: List[Machine]


class ExecResultBase(TypedDict):
    runtime_ms: int


class ExecResultValue(ExecResultBase):
    value: Optional[str]


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
