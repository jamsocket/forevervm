#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { getBinary } from './get-binary.js'

async function runBinary() {
  let binpath = await getBinary()

  spawnSync(binpath, process.argv.slice(2), { stdio: 'inherit', stderr: 'inherit' })
}

runBinary()
