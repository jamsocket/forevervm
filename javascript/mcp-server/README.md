# ForeverVM MCP Server

MCP Server for ForeverVM, enabling Claude to execute code in a Python REPL.

## Tools

1. `create-python-repl`

- Create a Python REPL.
- Returns: ID of the new REPL.

2. `run-python-in-repl`
   - Execute code in a Python REPL.
   - Required Inputs:
     - `code` (string): code that the Python REPL will run.
     - `replId` (string): ID of the REPL to run the code on.
   - Returns: Result of the code executed.

## Usage with Claude Desktop

Run the following command:

```bash
npx forevervm-mcp install --claude
```
