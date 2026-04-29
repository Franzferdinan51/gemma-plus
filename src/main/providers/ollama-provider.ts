import type { ModelProvider, ProviderStatus, ChatMessage, StreamChunk } from './types'

const OLLAMA_BASE = 'http://localhost:11434'

export const ollamaProvider: ModelProvider = {
  name: 'Ollama',
  type: 'ollama',

  async status() {
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) })
      if (!res.ok) return { available: false, models: [], error: `HTTP ${res.status}` }
      const data = (await res.json()) as { models?: Array<{ name: string }> }
      const models = (data.models ?? []).map((m) => m.name)
      return { available: models.length > 0, models }
    } catch (e) {
      return { available: false, models: [], error: String(e) }
    }
  },

  async listModels() {
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) })
      if (!res.ok) return []
      const data = (await res.json()) as { models?: Array<{ name: string }> }
      return (data.models ?? []).map((m) => m.name)
    } catch { return [] }
  },

  async *chatStream(opts) {
    // Ollama uses a different API format
    const modelName = opts.model.replace(/^ollama\//, '')
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true
      }),
      signal: opts.signal
    })

    if (!res.ok || !res.body) {
      throw new Error(`Ollama request failed: ${res.status} ${res.statusText}`)
    }

    const stream = res.body as unknown as ReadableStream<Uint8Array>
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx)
        buf = buf.slice(idx + 1)
        if (!line.trim()) continue
        try {
          const parsed = JSON.parse(line) as {
            message?: { content?: string }
            done?: boolean
          }
          if (parsed.message?.content) yield { content: parsed.message.content }
          if (parsed.done) { yield { done: true }; return }
        } catch { /* skip */ }
      }
    }
    yield { done: true }
  }
}
