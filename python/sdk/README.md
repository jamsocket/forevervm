[foreverVM](https://forevervm.com)
==================================

[![GitHub Repo stars](https://img.shields.io/github/stars/jamsocket/forevervm?style=social)](https://github.com/jamsocket/forevervm)
[![Chat on Discord](https://img.shields.io/discord/939641163265232947?color=404eed&label=discord)](https://discord.gg/N5sEpsuhh9)

| repo                                                | version                     |
|-----------------------------------------------------|-----------------------------|
| [cli](https://github.com/jamsocket/forevervm) | [![pypi](https://img.shields.io/pypi/v/forevervm)](https://pypi.org/project/forevervm/) |
| [sdk](https://github.com/jamsocket/forevervm) | [![pypi](https://img.shields.io/pypi/v/forevervm-sdk)](https://pypi.org/project/forevervm-sdk/) |

foreverVM provides an API for running arbitrary, stateful Python code securely.

The core concepts in foreverVM are **machines** and **instructions**.

**Machines** represent a stateful Python process. You interact with a machine by running **instructions**
(Python statements and expressions) on it, and receiving the results. A machine processes one instruction
at a time.

Getting started
---------------

You will need an API token (if you need one, reach out to [paul@jamsocket.com](mailto:paul@jamsocket.com)).

The easiest way to try out foreverVM is using the CLI. First, you will need to log in:

```bash
uvx forevervm login
```

Once logged in, you can open a REPL interface with a new machine:

```bash
uvx forevervm repl
```

When foreverVM starts your machine, it gives it an ID that you can later use to reconnect to it. You can reconnect to a machine like this:

```bash
uvx forevervm repl [machine_name]
```

You can list your machines (in reverse order of creation) like this:

```bash
uvx forevervm machine list
```

You don't need to terminate machines -- foreverVM will automatically swap them from memory to disk when they are idle, and then
automatically swap them back when needed. This is what allows foreverVM to run repls “forever”.

Using the API
-------------

```python
import os
from forevervm_sdk import ForeverVM

token = os.getenv('FOREVERVM_TOKEN')
if not token:
    raise ValueError('FOREVERVM_TOKEN is not set')

# Initialize foreverVM
fvm = ForeverVM(token)

# Connect to a new machine
with fvm.repl() as repl:

    # Execute some code
    exec_result = repl.exec('4 + 4')

    # Get the result
    print('result:', exec_result.result)

    # Execute code with output
    exec_result = repl.exec('for i in range(10):\n  print(i)')

    for output in exec_result.output:
        print(output["stream"], output["data"])
```
