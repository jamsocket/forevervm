import { runCommand } from '@oclif/test'
import { expect } from 'chai'

describe('repl', () => {
  it('runs repl cmd', async () => {
    const { stdout } = await runCommand('repl')
    expect(stdout).to.contain('hello world')
  })

  it('runs repl --name oclif', async () => {
    const { stdout } = await runCommand('repl --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
