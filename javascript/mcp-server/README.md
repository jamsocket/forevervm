# ForeverVM MCP Server

MCP Server for ForeverVM, enabling Claude to execute code in a Python REPL.

## Tools

1. `repl-exec`
   - Execute code in a Python REPL.
   - Required Inputs:
     - `code` (string): code that the Python REPL will run.
   - Returns: Result of the code executed.

## Running Locally

1. Clone this repository
2. Run `npm install`
3. Run `npm run build`
4. Run `node ABSOLUTE_PATH/forevervm-mcp-server/build/index.js`
   - To run with the MCP inspector, run `npx @modelcontextprotocol/inspector node ABSOLUTE_PATH/forevervm-mcp-server/build/index.js`. If you're running ForeverVM with the inspector, make sure to provide the foreverVM token in the environment variables input.

## Usage with Claude Desktop

Add the following to `claude_desktop_config.json`. On Mac, you can find this in `~/Library/Application Support/Claude/`; see [the docs](https://modelcontextprotocol.io/quickstart/user). Then, restart Claude.

```json
{
  "mcpServers": {
    "forevervm": {
      "command": "ABSOLUTE_PATH/.nvm/versions/node/v22.13.1/bin/node",
      "env": {
        "FOREVERVM_TOKEN": "YOUR_FOREVERVM_TOKEN"
      },
      "args": ["ABSOLUTE_PATH/forevervm-mcp-server/build/index.js"]
    }
  }
}
```
