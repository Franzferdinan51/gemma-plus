import type { ModelInfo } from '../../shared/types'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

export interface StreamChunk {
  content?: string
  done?: boolean
  done_reason?: string
  error?: string
}

export interface ProviderStatus {
  available: boolean
  models: string[]
  error?: string
}

export interface ModelProvider {
  readonly name: string
  readonly type: 'mlx' | 'lmstudio' | 'ollama'

  status(): Promise<ProviderStatus>

  listModels(): Promise<string[]>

  chatStream(opts: {
    model: string
    messages: ChatMessage[]
    signal?: AbortSignal
  }): AsyncGenerator<StreamChunk>

  startServer?(model: string, onProgress?: (p: ProgressInfo) => void): Promise<void>
  stopServer?(): Promise<void>
  isServerRunning?(): boolean
}

export interface ProgressInfo {
  message: string
  progress?: number
  bytesDone?: number
  bytesTotal?: number
}
