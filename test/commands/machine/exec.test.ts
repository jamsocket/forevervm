import { runCommand } from '@oclif/test'
import { expect } from 'chai'

describe('machine:exec', () => {
  it('runs machine:exec cmd', async () => {
    const { stdout } = await runCommand('machine:exec')
    expect(stdout).to.contain('hello world')
  })

  it('runs machine:exec --name oclif', async () => {
    const { stdout } = await runCommand('machine:exec --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
