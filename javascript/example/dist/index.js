"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("@forevervm/sdk");
async function main() {
    const token = process.env.FOREVERVM_TOKEN;
    if (!token) {
        throw new Error('FOREVERVM_TOKEN is not set');
    }
    const fvm = new sdk_1.ForeverVM(token);
    const { machine_name } = await fvm.createMachine();
    const repl = await fvm.repl(machine_name);
    let result = await repl.exec(`
def foo():
  for x in range(0, 3):
    print(f"{x}")
  return 100
`.trim());
    console.log(await result.result());
    for (let i = 0; i < 100; i++) {
        result = await repl.exec(`foo()`);
        let j = 0;
        while (true) {
            let output = await result.nextOutput();
            if (output === null)
                break;
            j += 1;
            console.log(output.stream, output.data);
        }
        console.log(await result.result());
        if (j !== 3)
            throw new Error("not all logs flushed");
    }
}
main().catch(console.error);
