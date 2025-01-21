# ForeverVM Client

A TypeScript/JavaScript client library for interacting with ForeverVM.

## Installation

```bash
npm install @jamsocket/forevervm-client
```

## Usage

```typescript
import { ForeverVMClient } from '@jamsocket/forevervm-client';

// Create a client instance
const client = new ForeverVMClient('https://api.forevervm.com', 'your-token');

// Create a new machine
const { machine_name } = await client.createMachine();

// Execute code on a machine
const result = await client.execMachine('console.log("Hello, World!")', machine_name);

// Use REPL mode for interactive sessions
const replClient = await client.repl(machine_name);
const execResult = await replClient.exec({ code: 'console.log("Hello from REPL!")' });

// Get output and results
const output = await execResult.nextOutput();
const result = await execResult.result();
```

## API Reference

### ForeverVMClient

The main client class for interacting with ForeverVM.

#### Methods

- `whoami()`: Get information about the current user
- `createMachine()`: Create a new ForeverVM machine
- `listMachines()`: List all machines for the current user
- `execMachine(code, machineName?, interrupt?)`: Execute code on a machine
- `execResult(machineName, instructionSeq)`: Get the result of a specific execution
- `repl(machineName)`: Create a REPL client for interactive sessions

### ReplClient

A client for interactive REPL sessions.

#### Methods

- `exec(instruction)`: Execute code in the REPL session

## License

MIT
