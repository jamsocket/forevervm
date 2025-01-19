import { runCommand } from '@oclif/test'
import { expect } from 'chai'

describe('create-machine', () => {
  it('runs create-machine cmd', async () => {
    const { stdout } = await runCommand('create-machine')
    expect(stdout).to.contain('hello world')
  })

  it('runs create-machine --name oclif', async () => {
    const { stdout } = await runCommand('create-machine --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
