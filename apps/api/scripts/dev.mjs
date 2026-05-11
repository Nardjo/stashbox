/* global console, process */

import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const children = new Set()
let shuttingDown = false

const env = {
  ...process.env,
  PORT: process.env.PORT ?? '3337',
}

start('api', ['ace', 'serve', '--hmr'])
start('worker', ['--watch', '--watch-preserve-output', 'ace', 'queue:listen'])

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => shutdown(signal))
}

function start(name, args) {
  const child = spawn('node', args, {
    cwd: appRoot,
    env,
    stdio: 'inherit',
  })

  children.add(child)

  child.on('exit', (code, signal) => {
    children.delete(child)
    if (shuttingDown) return

    shuttingDown = true
    const reason = signal
      ? `${name} exited with ${signal}`
      : `${name} exited with code ${code ?? 0}`
    console.error(reason)

    for (const other of children) {
      other.kill('SIGTERM')
    }

    process.exitCode = code ?? 1
  })

  child.on('error', (error) => {
    if (shuttingDown) return
    shuttingDown = true
    console.error(`${name} failed to start: ${error.message}`)

    for (const other of children) {
      other.kill('SIGTERM')
    }

    process.exitCode = 1
  })

  return child
}

function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true

  for (const child of children) {
    child.kill(signal)
  }
}
