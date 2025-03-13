from os import environ
import pytest
from forevervm_sdk import ForeverVM

FOREVERVM_API_BASE = environ.get("FOREVERVM_API_BASE")
FOREVERVM_TOKEN = environ.get("FOREVERVM_TOKEN")

if not FOREVERVM_API_BASE:
    raise Exception("FOREVERVM_API_BASE is not set")
if not FOREVERVM_TOKEN:
    raise Exception("FOREVERVM_TOKEN is not set")


def test_whoami():
    fvm = ForeverVM(FOREVERVM_TOKEN, base_url=FOREVERVM_API_BASE)
    assert fvm.whoami()["account"]


def test_create_machine():
    fvm = ForeverVM(FOREVERVM_TOKEN, base_url=FOREVERVM_API_BASE)
    machine = fvm.create_machine()
    assert machine["machine_name"]
    machine_name = machine["machine_name"]

    machines = fvm.list_machines()["machines"]
    assert machine_name in [m["name"] for m in machines]


@pytest.mark.asyncio
async def test_exec():
    fvm = ForeverVM(FOREVERVM_TOKEN, base_url=FOREVERVM_API_BASE)
    machine_name = fvm.create_machine()["machine_name"]

    # sync
    code = "print(123) or 567"
    result = fvm.exec(code, machine_name)
    instruction_seq = result["instruction_seq"]
    exec_result = fvm.exec_result(machine_name, instruction_seq)
    assert exec_result["result"]["value"] == "567"

    # async
    result = await fvm.exec_async(code, machine_name)
    instruction_seq = result["instruction_seq"]
    exec_result = await fvm.exec_result_async(machine_name, instruction_seq)
    assert exec_result["result"]["value"] == "567"


def test_repl():
    fvm = ForeverVM(FOREVERVM_TOKEN, base_url=FOREVERVM_API_BASE)
    machine_name = fvm.create_machine()["machine_name"]
    repl = fvm.repl(machine_name)
    assert repl

    result = repl.exec("for i in range(5):\n  print(i)")
    output = list(result.output)
    assert output == [
        {"data": "0", "stream": "stdout", "seq": 0},
        {"data": "1", "stream": "stdout", "seq": 1},
        {"data": "2", "stream": "stdout", "seq": 2},
        {"data": "3", "stream": "stdout", "seq": 3},
        {"data": "4", "stream": "stdout", "seq": 4},
    ]

    result = repl.exec("1 / 0")

    assert "ZeroDivisionError" in result.result["error"]


def test_repl_timeout():
    fvm = ForeverVM(FOREVERVM_TOKEN, base_url=FOREVERVM_API_BASE)
    machine_name = fvm.create_machine()["machine_name"]
    repl = fvm.repl(machine_name)
    assert repl

    result = repl.exec("from time import sleep")
    result.result

    result = repl.exec("sleep(10)", timeout_seconds=1)
    assert "Timed out" in result.result["error"]

    result = repl.exec("sleep(1); print('done')", timeout_seconds=5)
    output = list(result.output)
    assert output == [
        {"data": "done", "stream": "stdout", "seq": 0},
    ]
    result.result


@pytest.mark.asyncio
async def test_exec_timeout():
    fvm = ForeverVM(FOREVERVM_TOKEN, base_url=FOREVERVM_API_BASE)
    machine_name = fvm.create_machine()["machine_name"]

    result = fvm.exec("from time import sleep", machine_name)
    instruction_seq = result["instruction_seq"]
    fvm.exec_result(machine_name, instruction_seq)

    # sync
    code = "sleep(10)"
    result = fvm.exec(code, machine_name, timeout_seconds=1)
    instruction_seq = result["instruction_seq"]
    exec_result = fvm.exec_result(machine_name, instruction_seq)
    assert "Timed out" in exec_result["result"]["error"]

    # async
    result = await fvm.exec_async(code, machine_name, timeout_seconds=1)
    instruction_seq = result["instruction_seq"]
    exec_result = await fvm.exec_result_async(machine_name, instruction_seq)
    assert "Timed out" in exec_result["result"]["error"]


def test_machine_tags():
    fvm = ForeverVM(FOREVERVM_TOKEN, base_url=FOREVERVM_API_BASE)

    # Create machine with tags
    tags = {"environment": "test", "purpose": "sdk-test"}
    machine = fvm.create_machine(tags=tags)
    assert machine["machine_name"]
    machine_name = machine["machine_name"]

    # Verify the tags are returned when listing machines
    machines = fvm.list_machines()["machines"]
    tagged_machine = next((m for m in machines if m["name"] == machine_name), None)
    assert tagged_machine is not None
    assert "tags" in tagged_machine
    assert tagged_machine["tags"] == tags

    # Create another machine with different tags
    tags2 = {"environment": "test", "version": "1.0.0"}
    machine2 = fvm.create_machine(tags=tags2)
    assert machine2["machine_name"]
    machine_name2 = machine2["machine_name"]

    # Verify both machines with their respective tags
    machines = fvm.list_machines()["machines"]
    tagged_machine1 = next((m for m in machines if m["name"] == machine_name), None)
    tagged_machine2 = next((m for m in machines if m["name"] == machine_name2), None)

    assert tagged_machine1 is not None
    assert tagged_machine2 is not None
    assert tagged_machine1["tags"] == tags
    assert tagged_machine2["tags"] == tags2


@pytest.mark.asyncio
async def test_machine_tags_async():
    fvm = ForeverVM(FOREVERVM_TOKEN, base_url=FOREVERVM_API_BASE)

    # Create machine with tags asynchronously
    tags = {"environment": "test-async", "purpose": "async-test"}
    machine = await fvm.create_machine_async(tags=tags)
    assert machine["machine_name"]
    machine_name = machine["machine_name"]

    # Verify the tags are returned when listing machines asynchronously
    machines = await fvm.list_machines_async()
    machines_list = machines["machines"]
    tagged_machine = next((m for m in machines_list if m["name"] == machine_name), None)

    assert tagged_machine is not None
    assert "tags" in tagged_machine
    assert tagged_machine["tags"] == tags
