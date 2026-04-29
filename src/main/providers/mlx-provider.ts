import { app } from 'electron'
import { spawn, ChildProcess, spawnSync } from 'child_process'
import { join } from 'path'
import { existsSync, rmSync } from 'fs'
import type { ModelProvider, ProviderStatus, ChatMessage, StreamChunk } from './types'

const MLX_PORT = 11434
const MLX_HOST = `127.0.0.1:${MLX_PORT}`
const MLX_URL = `http://${MLX_HOST}`

let serverProc: ChildProcess | null = null
let currentModel: string | null = null

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function dataDir(): string {
  return join(app.getPath('userData'), 'mlx')
}

function venvDir(): string {
  return join(dataDir(), 'venv')
}

function venvPython(): string {
  return join(venvDir(), 'bin', 'python3')
}

function modelsDir(): string {
  return join(dataDir(), 'models')
}

// ---------------------------------------------------------------------------
// Python detection
// ---------------------------------------------------------------------------

function findSystemPython(): string | null {
  const versionedCandidates = [
    '/opt/homebrew/bin/python3.13',
    '/opt/homebrew/bin/python3.12',
    '/opt/homebrew/bin/python3.11',
    '/opt/homebrew/bin/python3.10',
    '/opt/homebrew/opt/python@3.13/bin/python3.13',
    '/opt/homebrew/opt/python@3.12/bin/python3.12',
    '/opt/homebrew/opt/python@3.11/bin/python3.11',
    '/opt/homebrew/opt/python@3.10/bin/python3.10',
    '/usr/local/bin/python3.13',
    '/usr/local/bin/python3.12',
    '/usr/local/bin/python3.11',
    '/usr/local/bin/python3.10'
  ]

  for (const c of versionedCandidates) {
    try {
      const s = spawnSync(c, ['--version'], { timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] })
      if (s.status === 0) return c
    } catch { /* skip */ }
  }

  const fallbacks = ['/opt/homebrew/bin/python3', '/usr/local/bin/python3', '/usr/bin/python3']
  for (const c of fallbacks) {
    try {
      const s = spawnSync(c, ['--version'], { timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] })
      if (s.status === 0) {
        const ver = s.stdout.toString().trim()
        const match = ver.match(/Python 3\.(\d+)/)
        const minor = match ? parseInt(match[1], 10) : 99
        if (minor >= 10 && minor <= 13) return c
      }
    } catch { /* skip */ }
  }
  return null
}

// ---------------------------------------------------------------------------
// MLX detection
// ---------------------------------------------------------------------------

export interface MLXStatus {
  python: string
  installed: boolean
}

export function locateMLX(): MLXStatus | null {
  const vPy = venvPython()
  if (existsSync(vPy)) {
    try {
      const verCheck = spawnSync(vPy, ['--version'], { timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] })
      const verStr = verCheck.stdout?.toString().trim() || ''
      const verMatch = verStr.match(/Python 3\.(\d+)/)
      const minor = verMatch ? parseInt(verMatch[1], 10) : 0
      if (minor < 10) {
        try { rmSync(venvDir(), { recursive: true, force: true }) } catch { /* ok */ }
      } else {
        try {
          const check = spawnSync(vPy, ['-c', 'import mlx_lm; print("ok")'], { timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] })
          if (check.status === 0 && check.stdout?.toString().includes('ok')) {
            return { python: vPy, installed: true }
          }
        } catch { /* skip */ }
        return { python: vPy, installed: false }
      }
    } catch {
      try { rmSync(venvDir(), { recursive: true, force: true }) } catch { /* ok */ }
    }
  }

  const sysPython = findSystemPython()
  if (!sysPython) return null
  return { python: sysPython, installed: false }
}

export async function installMLX(onProgress: (p: { stage: string; message: string }) => void): Promise<string> {
  const sysPython = findSystemPython()
  if (!sysPython) throw new Error('Python 3.10–3.13 not found. Install via Homebrew: brew install python@3.13')

  const vDir = venvDir()
  const vPy = venvPython()

  if (!existsSync(vPy)) {
    onProgress({ stage: 'install', message: 'Creating Python virtual environment…' })
    await runProcess(sysPython, ['-m', 'venv', vDir])
  }

  onProgress({ stage: 'install', message: 'Upgrading pip…' })
  await runProcess(vPy, ['-m', 'pip', 'install', '--upgrade', 'pip', '--index-url', 'https://pypi.org/simple/'])
  onProgress({ stage: 'install', message: 'Installing mlx-lm (this may take a few minutes)…' })
  await runProcess(vPy, ['-m', 'pip', 'install', '--upgrade', 'mlx-lm>=0.24.0', '--index-url', 'https://pypi.org/simple/'])

  const check = spawnSync(vPy, ['-c', 'import mlx_lm; print("ok")'], { timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] })
  if (check.status !== 0 || !check.stdout?.toString().includes('ok')) {
    throw new Error(`mlx-lm install failed: ${check.stderr?.toString().slice(-300)}`)
  }
  return vPy
}

function runProcess(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PIP_DISABLE_PIP_VERSION_CHECK: '1', PIP_INDEX_URL: 'https://pypi.org/simple/', PIP_EXTRA_INDEX_URL: '' }
    })
    proc.stdout?.on('data', (d) => { /* swallow */ })
    proc.stderr?.on('data', (d) => { /* swallow */ })
    proc.on('error', reject)
    proc.on('exit', (code) => { code === 0 ? resolve() : reject(new Error(`${cmd} failed (exit ${code})`)) })
  })
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

export async function startMLXServer(
  python: string,
  model: string,
  onProgress?: (p: { message: string; progress?: number }) => void
): Promise<void> {
  if (serverProc && !serverProc.killed && currentModel === model) return
  stopMLXServer()

  const env = { ...process.env, HF_HOME: modelsDir(), TRANSFORMERS_CACHE: modelsDir(), HF_HUB_DISABLE_TELEMETRY: '1' }
  let earlyExit: { code: number | null; stderr: string } | null = null
  let stderrBuf = ''

  serverProc = spawn(python, ['-m', 'mlx_lm.server', '--model', model, '--port', String(MLX_PORT)], { env, stdio: ['ignore', 'pipe', 'pipe'], detached: false })
  currentModel = model

  serverProc.stdout?.on('data', (d) => console.log('[mlx]', d.toString().trim()))
  serverProc.stderr?.on('data', (d) => {
    const text = d.toString()
    stderrBuf += text
    console.log('[mlx]', text.trim())
    if (onProgress && text.includes('Starting httpd')) onProgress({ message: 'Starting server…', progress: 1.0 })
  })
  serverProc.on('exit', (code) => { earlyExit = { code, stderr: stderrBuf }; serverProc = null; currentModel = null })

  await waitForHealth(600_000, () => earlyExit)
}

export function stopMLXServer(): void {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM')
    serverProc = null
    currentModel = null
  }
}

function isServerRunning(): boolean {
  return serverProc !== null && !serverProc.killed
}

async function waitForHealth(timeoutMs: number, checkEarlyExit: () => { code: number | null; stderr: string } | null): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const exit = checkEarlyExit()
    if (exit) throw new Error(`MLX server exited with code ${exit.code}. ${exit.stderr.slice(-500)}`)
    try {
      const res = await fetch(`${MLX_URL}/v1/models`)
      if (res.ok) return
    } catch { /* wait */ }
    await new Promise((r) => setTimeout(r, 1500))
  }
  throw new Error(`MLX server did not become healthy within ${timeoutMs / 1000}s`)
}

export async function listMLXModels(): Promise<string[]> {
  try {
    const res = await fetch(`${MLX_URL}/v1/models`)
    if (!res.ok) return []
    const data = (await res.json()) as { data?: Array<{ id: string }> }
    return (data.data ?? []).map((m) => m.id)
  } catch { return [] }
}

// ---------------------------------------------------------------------------
// Chat streaming
// ---------------------------------------------------------------------------

export async function* mlxChatStream(opts: {
  model: string
  messages: ChatMessage[]
  signal?: AbortSignal
}): AsyncGenerator<StreamChunk> {
  const res = await fetch(`${MLX_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: 0.7,
      max_tokens: 8192
    }),
    signal: opts.signal
  })

  if (!res.ok || !res.body) {
    throw new Error(`Chat request failed: ${res.status} ${res.statusText}`)
  }

  const stream = res.body as unknown as ReadableStream<Uint8Array>
  for await (const event of readSSE(stream)) {
    if (event === '[DONE]') { yield { done: true }; return }
    try {
      const parsed = JSON.parse(event) as { choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }> }
      const choice = parsed.choices?.[0]
      if (choice?.delta?.content) yield { content: choice.delta.content }
      if (choice?.finish_reason === 'stop' || choice?.finish_reason === 'length') { yield { done: true }; return }
    } catch { /* skip */ }
  }
  yield { done: true }
}

async function* readSSE(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, idx).trim()
      buf = buf.slice(idx + 2)
      if (!block) continue
      for (const line of block.split('\n')) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data) yield data
        }
      }
    }
  }
  if (buf.trim()) {
    for (const line of buf.trim().split('\n')) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim()
        if (data) yield data
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export const mlxProvider: ModelProvider = {
  name: 'MLX (Apple Silicon)',
  type: 'mlx',

  async status() {
    const mlx = locateMLX()
    if (!mlx) return { available: false, models: [], error: 'Python 3.10–3.13 not found' }
    const models = await listMLXModels()
    return { available: mlx.installed && models.length > 0, models }
  },

  async listModels() {
    return listMLXModels()
  },

  async *chatStream(opts) {
    yield* mlxChatStream(opts)
  },

  startServer: async (model, onProgress) => {
    const mlx = locateMLX()
    if (!mlx) throw new Error('MLX not found')
    let pythonToUse = mlx.python
    if (!mlx.installed) {
      pythonToUse = await installMLX((p) => onProgress?.({ message: p.message }))
    }
    await startMLXServer(pythonToUse, model, onProgress)
  },

  stopServer: () => { stopMLXServer() },
  isServerRunning: () => isServerRunning()
}
