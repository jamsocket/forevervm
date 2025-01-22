import { ForeverVM } from '@forevervm/sdk'

async function main() {
  const token = process.env.FOREVERVM_TOKEN
  if (!token) {
    throw new Error('FOREVERVM_TOKEN is not set')
  }

  // Initialize ForeverVM
  const fvm = new ForeverVM(token)

  // Connect to a new machine.
  const repl = await fvm.repl(null)

  // Execute some code
  let execResult = await repl.exec('4 + 4')

  // Get the result
  let result = await execResult.result()
  console.log('result:', result)

  // We can also print stdout and stderr
  execResult = await repl.exec('for i in range(10):\n  print(i)')

  while (true) {
    let output = await execResult.nextOutput()
    if (output === null) break
    console.log(output.stream, output.data)
  }

  process.exit(0)
}

main().catch(console.error)
