import { runCommand } from '@oclif/test'
import { expect } from 'chai'

describe('machine:list', () => {
  it('runs machine:list cmd', async () => {
    const { stdout } = await runCommand('machine:list')
    expect(stdout).to.contain('hello world')
  })

  it('runs machine:list --name oclif', async () => {
    const { stdout } = await runCommand('machine:list --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
