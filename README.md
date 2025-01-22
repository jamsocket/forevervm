foreverVM
=========

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
npx forevervm login
```

Once logged in, you can open a REPL interface with a new machine:

```bash
npx forevervm repl
```

When foreverVM starts your machine, it gives it an ID that you can later use to reconnect to it. You can reconnect to a machine like this:

```bash
npx forevervm repl [machine_name]
```

You can list your machines (in reverse order of creation) like this:

```bash
npx forevervm machine list
```

You don't need to terminate machines -- foreverVM will automatically swap them from memory to disk when they are idle, and then
automatically swap them back when needed. This is what allows foreverVM to run repls “forever”.

Using the API
-------------

(TODO: paste in example when it is ready)
