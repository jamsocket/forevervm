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

Add the following to `claude_desktop_config.json`. On Mac, you can find this in `~/Library/Application Support/Claude/`; see [the docs](https://modelcontextprotocol.io/quickstart/user). Then, restart Claude.

```json
{
  "mcpServers": {
    "forevervm": {
      "command": "npx",
      "args": ["forevervm-mcp"],
      "env": {
        "FOREVERVM_TOKEN": "YOUR_FOREVERVM_TOKEN"
      }
    }
  }
}
```

Or you can run

```bash
npx forevervm-mcp install --claude
```

to automate the setup step.
