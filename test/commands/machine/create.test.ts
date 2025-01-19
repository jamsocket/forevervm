import { runCommand } from '@oclif/test'
import { expect } from 'chai'

describe('machine:create', () => {
  it('runs machine:create cmd', async () => {
    const { stdout } = await runCommand('machine:create')
    expect(stdout).to.contain('hello world')
  })

  it('runs machine:create --name oclif', async () => {
    const { stdout } = await runCommand('machine:create --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
