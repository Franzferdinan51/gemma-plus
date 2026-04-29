import type { ModelProvider, ProviderStatus, ChatMessage, StreamChunk } from './types'

const LMSTUDIO_BASE = 'http://localhost:1234/v1'

export const lmstudioProvider: ModelProvider = {
  name: 'LM Studio',
  type: 'lmstudio',

  async status() {
    try {
      const res = await fetch(`${LMSTUDIO_BASE}/models`, { signal: AbortSignal.timeout(3000) })
      if (!res.ok) return { available: false, models: [], error: `HTTP ${res.status}` }
      const data = (await res.json()) as { data?: Array<{ id: string }> }
      const models = (data.data ?? []).map((m) => m.id)
      return { available: models.length > 0, models }
    } catch (e) {
      return { available: false, models: [], error: String(e) }
    }
  },

  async listModels() {
    try {
      const res = await fetch(`${LMSTUDIO_BASE}/models`, { signal: AbortSignal.timeout(3000) })
      if (!res.ok) return []
      const data = (await res.json()) as { data?: Array<{ id: string }> }
      return (data.data ?? []).map((m) => m.id)
    } catch { return [] }
  },

  async *chatStream(opts) {
    const res = await fetch(`${LMSTUDIO_BASE}/chat/completions`, {
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
      throw new Error(`LM Studio request failed: ${res.status} ${res.statusText}`)
    }

    const stream = res.body as unknown as ReadableStream<Uint8Array>
    for await (const event of readSSE(stream)) {
      if (event === '[DONE]') { yield { done: true }; return }
      try {
        const parsed = JSON.parse(event) as {
          choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>
        }
        const choice = parsed.choices?.[0]
        if (choice?.delta?.content) yield { content: choice.delta.content }
        if (choice?.finish_reason === 'stop' || choice?.finish_reason === 'length') { yield { done: true }; return }
      } catch { /* skip */ }
    }
    yield { done: true }
  }
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
