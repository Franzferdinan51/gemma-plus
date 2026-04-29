import { WebSocket } from 'ws'
import { readFileSync, existsSync } from 'fs'

const MESH_URL = process.env.MESH_API_URL || 'http://localhost:4000'
const MESH_WS = MESH_URL.replace('http', 'ws') + '/ws'
const API_KEY = 'openclaw-mesh-default-key'

let ws: WebSocket | null = null
let connected = false
let messageHandlers: Array<(msg: unknown) => void> = []

export async function startMeshService(): Promise<void> {
  try {
    // Check if mesh API is reachable first
    try {
      const { default: fetch } = await import('node:fetch')
      const res = await fetch(`${MESH_URL}/api/mesh/status`, {
        headers: { Authorization: `Bearer ${API_KEY}` }
      })
      if (!res.ok) return
    } catch {
      console.log('[mesh] API not reachable at', MESH_URL)
      return
    }

    ws = new WebSocket(MESH_WS, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    })

    ws.on('open', () => {
      connected = true
      console.log('[mesh] connected')
    })

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        for (const h of messageHandlers) h(msg)
      } catch { /* ignore */ }
    })

    ws.on('close', () => {
      connected = false
      console.log('[mesh] disconnected')
      // Reconnect after 10s
      setTimeout(() => { startMeshService().catch(() => {}) }, 10_000)
    })

    ws.on('error', (e) => {
      console.log('[mesh] error:', e.message)
    })
  } catch (e) {
    console.log('[mesh] start failed:', e)
  }
}

export function stopMeshService(): void {
  if (ws) {
    ws.terminate()
    ws = null
    connected = false
    messageHandlers = []
  }
}

export function getMeshStatus(): { connected: boolean; url: string } {
  return { connected, url: MESH_WS }
}

export function meshBroadcast(message: string): Promise<string> {
  return fetchMesh('/api/mesh/broadcast', { content: message })
}

export function meshSendMessage(to: string, message: string): Promise<string> {
  return fetchMesh('/api/mesh/message', { to, content: message })
}

async function fetchMesh(path: string, body: Record<string, string>): Promise<string> {
  try {
    const { default: fetch } = await import('node:fetch')
    const res = await fetch(`${MESH_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify(body)
    })
    const data = await res.json() as { success?: boolean; error?: string; message?: string }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    return data.message || JSON.stringify(data)
  } catch (e) {
    return `Error: ${(e as Error).message}`
  }
}
