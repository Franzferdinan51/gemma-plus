export type SetupStage =
  | 'checking'
  | 'installing-mlx'
  | 'starting-mlx'
  | 'downloading-model'
  | 'ready'
  | 'error'

export interface SetupStatus {
  stage: SetupStage
  message: string
  progress?: number
  bytesDone?: number
  bytesTotal?: number
  error?: string
}

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  result?: string
  error?: string
  running?: boolean
}

export type Role = 'user' | 'assistant' | 'system' | 'tool'

export interface ChatMessage {
  id: string
  role: Role
  content: string
  toolCalls?: ToolCall[]
  createdAt: number
  model?: string
  done?: boolean
  activity?: AgentActivity
}

export type AgentMode = 'chat' | 'code'

export interface ChatRequest {
  conversationId: string
  messages: Array<{ role: Role; content: string; toolCalls?: ToolCall[] }>
  model: string
  enableTools: boolean
  mode: AgentMode
  provider?: string
}

export interface WorkspaceInfo {
  conversationId: string
  path: string
  previewUrl: string
}

export interface WorkspaceFile {
  path: string
  kind: 'file' | 'dir'
  size?: number
}

export interface FileChangeEvent {
  conversationId: string
}

export type AgentActivity =
  | { kind: 'idle' }
  | { kind: 'thinking'; chars?: number }
  | { kind: 'generating'; chars?: number }
  | { kind: 'tool'; tool: string; target?: string; chars?: number }

export type StreamChunk =
  | { type: 'token'; text: string }
  | { type: 'tool_call'; call: ToolCall }
  | { type: 'tool_result'; id: string; result?: string; error?: string }
  | { type: 'activity'; activity: AgentActivity }
  | { type: 'done' }
  | { type: 'error'; error: string }

export type ProviderType = 'mlx' | 'lmstudio' | 'ollama'

export interface ModelInfo {
  name: string
  label: string
  size: string
  sizeBytes: number
  description: string
  recommended?: boolean
  provider: ProviderType
  backendUrl?: string
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  // MLX models (Apple Silicon)
  {
    name: 'mlx-community/gemma-4-e2b-it-4bit',
    label: 'Gemma 4 E2B',
    size: '1.5 GB',
    sizeBytes: 1_500_000_000,
    description: 'Edge-sized. Fast & lightweight. Text + image + audio. Runs on 8GB+ Macs.',
    provider: 'mlx'
  },
  {
    name: 'mlx-community/gemma-4-e4b-it-4bit',
    label: 'Gemma 4 E4B',
    size: '3 GB',
    sizeBytes: 3_000_000_000,
    description: 'Best all-rounder. Text + image + audio. Runs on 8GB+ Macs.',
    recommended: true,
    provider: 'mlx'
  },
  {
    name: 'mlx-community/gemma-4-26b-a4b-it-4bit',
    label: 'Gemma 4 27B MoE',
    size: '16 GB',
    sizeBytes: 16_000_000_000,
    description: 'Mixture-of-Experts (26B, 4B active). 16GB+ RAM recommended.',
    provider: 'mlx'
  },
  {
    name: 'mlx-community/gemma-4-31b-it-4bit',
    label: 'Gemma 4 31B',
    size: '18 GB',
    sizeBytes: 18_000_000_000,
    description: 'Frontier dense model. Best quality. 32GB+ RAM recommended.',
    provider: 'mlx'
  },
  // LM Studio models (shown when LM Studio is running)
  {
    name: 'lmstudio-local/qwen3.5-9b',
    label: 'Qwen 3.5 9B (LM Studio)',
    size: '~5 GB',
    sizeBytes: 5_000_000_000,
    description: 'Fast local reasoning. Great for code and conversation.',
    provider: 'lmstudio',
    backendUrl: 'http://localhost:1234'
  },
  {
    name: 'lmstudio-local/qwen3.6-35b',
    label: 'Qwen 3.6 35B (LM Studio)',
    size: '~18 GB',
    sizeBytes: 18_000_000_000,
    description: 'Powerful reasoning. Excellent for complex tasks.',
    provider: 'lmstudio',
    backendUrl: 'http://localhost:1234'
  },
  {
    name: 'lmstudio-local/gemma-4-31b',
    label: 'Gemma 4 31B (LM Studio)',
    size: '~18 GB',
    sizeBytes: 18_000_000_000,
    description: 'Gemma 4 31B served via LM Studio.',
    provider: 'lmstudio',
    backendUrl: 'http://localhost:1234'
  },
  // Ollama models (shown when Ollama is running)
  {
    name: 'ollama/llama3.3-70b',
    label: 'Llama 3.3 70B (Ollama)',
    size: '~40 GB',
    sizeBytes: 40_000_000_000,
    description: 'Powerful general-purpose model.',
    provider: 'ollama',
    backendUrl: 'http://localhost:11434'
  },
  {
    name: 'ollama/qwen3-14b',
    label: 'Qwen 3 14B (Ollama)',
    size: '~9 GB',
    sizeBytes: 9_000_000_000,
    description: 'Fast and capable reasoning model.',
    provider: 'ollama',
    backendUrl: 'http://localhost:11434'
  }
]

export const DEFAULT_MODEL = 'mlx-community/gemma-4-e4b-it-4bit'
