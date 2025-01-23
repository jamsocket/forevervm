import { ForeverVM } from "@forevervm/sdk";

const token = process.env.FOREVERVM_TOKEN;
if (!token) {
  throw new Error("FOREVERVM_TOKEN is not set");
}

// Initialize foreverVM
const fvm = new ForeverVM(token);

// Connect to a new machine.
const repl = await fvm.repl();

// Execute some code
let execResult = repl.exec("4 + 4");

// Get the result
console.log("result:", await execResult.result);

// We can also print stdout and stderr
execResult = repl.exec("for i in range(10):\n  print(i)");

for await (const output of execResult.output) {
  console.log(output.stream, output.data);
}

process.exit(0);
