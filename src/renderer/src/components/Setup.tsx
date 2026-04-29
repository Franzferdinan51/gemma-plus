import { useState, useEffect } from 'react'
import { AVAILABLE_MODELS, type SetupStatus, type ProviderType, type ModelInfo } from '@shared/types'
import gemmaLogoUrl from '../assets/gemma-logo.png'

interface Props {
  models?: ModelInfo[]
  status: SetupStatus
  model: string
  onModelChange: (m: string) => void
  onStart: (model: string, provider: ProviderType) => void
}

function formatBytes(n?: number): string {
  if (!n) return ''
  const u = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = n
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`
}

export default function Setup({ model, onModelChange, onStart }: Props) {
  const isWorking =
    status.stage === 'checking' ||
    status.stage === 'installing-mlx' ||
    status.stage === 'starting-mlx' ||
    status.stage === 'downloading-model' ||
    status.stage === 'connecting-lmstudio' ||
    status.stage === 'connecting-ollama'

  if (status.stage === 'checking' && status.message === 'Welcome') {
    return <WelcomeScreen model={model} onModelChange={onModelChange} onStart={onStart} />
  }

  return (
    <div className="drag flex h-full w-full flex-col">
      <div className="h-9" />
      <div className="flex flex-1 items-center justify-center px-8">
        <div className="no-drag w-full max-w-md">
          <div className="mb-8 text-center">
            <GemmaLogo className="mx-auto mb-5 h-20 w-20" />
            <h1 className="text-[22px] font-semibold tracking-tight">Setting things up</h1>
            <p className="mt-1.5 text-sm text-ink-400">
              Everything runs locally. Nothing leaves your Mac.
            </p>
          </div>

          <StageList status={status} />

          {isWorking && status.progress != null && (
            <div className="mt-6">
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-white/70 transition-[width] duration-200 ease-out"
                  style={{ width: `${Math.max(2, Math.round((status.progress ?? 0) * 100))}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] tabular-nums text-ink-400">
                <span>{Math.round((status.progress ?? 0) * 100)}%</span>
                {status.bytesDone != null && status.bytesTotal != null && (
                  <span>{formatBytes(status.bytesDone)} / {formatBytes(status.bytesTotal)}</span>
                )}
              </div>
            </div>
          )}

          {status.stage === 'error' && (
            <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              <div className="font-medium">Something went wrong</div>
              <div className="mt-1 text-red-300/80">{status.error}</div>
              <button
                onClick={() => {
                  const m = AVAILABLE_MODELS.find((m) => m.name === model)
                  onStart(model, (m?.provider ?? 'mlx') as ProviderType)
                }}
                className="mt-3 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Welcome / model-select screen — all providers in one list
// ---------------------------------------------------------------------------
function WelcomeScreen({ model, onModelChange, onStart }: Props) {
  const [availLMStudio, setAvailLMStudio] = useState<ModelInfo[]>([])
  const [availOllama, setAvailOllama] = useState<ModelInfo[]>([])
  const [lmDetected, setLmDetected] = useState(false)
  const [olDetected, setOlDetected] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.getProvidersStatus().then((s) => {
      setLmDetected(s['lmstudio'] ?? false)
      setOlDetected(s['ollama'] ?? false)
      const lm = AVAILABLE_MODELS.filter(
        (m) => m.provider === 'lmstudio' && (s['lmstudio'] ?? false)
      )
      const ol = AVAILABLE_MODELS.filter(
        (m) => m.provider === 'ollama' && (s['ollama'] ?? false)
      )
      setAvailLMStudio(lm)
      setAvailOllama(ol)
      setLoading(false)
    })
  }, [])

  const selected = AVAILABLE_MODELS.find((m) => m.name === model) ?? AVAILABLE_MODELS[1]

  // Build the full unified list:
  //  - MLX models always shown (can download)
  //  - LM Studio models only shown when server is detected
  //  - Ollama models only shown when server is detected
  const mlxModels = AVAILABLE_MODELS.filter((m) => m.provider === 'mlx')
  const lmModels = lmDetected ? AVAIL_LM_STUDIO_WITH_MODELS(model, availLMStudio) : []
  const olModels = olDetected ? AVAIL_OLLAMA_WITH_MODELS(model, availOllama) : []

  function providerGroup(p: ProviderType): string {
    if (p === 'mlx') return '🍎 MLX — Download & run locally'
    if (p === 'lmstudio') return '💻 LM Studio — Connected'
    return '🦙 Ollama — Connected'
  }

  return (
    <div className="drag flex h-full w-full flex-col">
      <div className="h-9" />
      <div className="flex flex-1 items-center justify-center px-8">
        <div className="no-drag w-full max-w-md">
          <div className="mb-6 text-center">
            <GemmaLogo className="mx-auto mb-4 h-20 w-20" />
            <h1 className="text-[22px] font-semibold tracking-tight">Welcome to Gemma Plus</h1>
            <p className="mt-1 text-[13px] text-ink-400">
              Pick any model — download via MLX or connect to a running server.
            </p>
          </div>

          <div className="space-y-5">
            {/* MLX models */}
            <ModelGroup
              label={providerGroup('mlx')}
              models={mlxModels}
              selected={model}
              onModelChange={onModelChange}
            />

            {/* LM Studio models */}
            {lmModels.length > 0 && (
              <ModelGroup
                label={providerGroup('lmstudio')}
                models={lmModels}
                selected={model}
                onModelChange={onModelChange}
              />
            )}

            {/* Ollama models */}
            {olModels.length > 0 && (
              <ModelGroup
                label={providerGroup('ollama')}
                models={olModels}
                selected={model}
                onModelChange={onModelChange}
              />
            )}

            {/* Nothing detected — show connect options */}
            {!loading && !lmDetected && !olDetected && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-400">
                  Other backends
                </div>
                <div className="space-y-2 text-[12.5px] text-ink-400">
                  <div>
                    💻{' '}
                    <strong className="text-ink-200">LM Studio</strong> — load a model, click
                    Server → Start server. It will appear here automatically.
                  </div>
                  <div>
                    🦙{' '}
                    <strong className="text-ink-200">Ollama</strong> — run{' '}
                    <code className="text-[11px]">ollama serve</code>, pull models with{' '}
                    <code className="text-[11px]">ollama pull &lt;name&gt;</code>. They will appear
                    here automatically.
                  </div>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="py-2 text-center text-[12px] text-ink-400 animate-pulse">
                Checking for LM Studio & Ollama…
              </div>
            )}
          </div>

          <button
            onClick={() => selected && onStart(selected.name, selected.provider)}
            className="mt-6 w-full rounded-xl bg-white py-3 text-sm font-medium text-ink-900 transition hover:bg-white/90 active:scale-[0.99]"
          >
            {selected.provider === 'mlx'
              ? `Download ${selected.label}  ·  ${selected.size}`
              : `Start chatting  ·  ${selected.label}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Model group (section header + model cards)
// ---------------------------------------------------------------------------
function ModelGroup({
  label,
  models,
  selected,
  onModelChange
}: {
  label: string
  models: ModelInfo[]
  selected: string
  onModelChange: (m: string) => void
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-400">
        {label}
      </div>
      <div className="space-y-2">
        {models.map((m) => (
          <button
            key={m.name}
            onClick={() => onModelChange(m.name)}
            className={`group w-full rounded-xl border px-4 py-3 text-left transition active:scale-[0.99] ${
              selected === m.name
                ? 'border-white/25 bg-white/[0.06]'
                : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{m.label}</span>
                {m.recommended && (
                  <span className="rounded-full bg-white/10 px-2 py-[1px] text-[10px] font-medium uppercase tracking-wider">
                    Recommended
                  </span>
                )}
              </div>
              <span className="text-xs tabular-nums text-ink-400">{m.size}</span>
            </div>
            <div className="mt-1 text-[12.5px] leading-snug text-ink-400">
              {m.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers: show LM Studio / Ollama models only when provider is active
// ---------------------------------------------------------------------------
function AVAIL_LM_STUDIO_WITH_MODELS(_selected: string, _detected: ModelInfo[]): ModelInfo[] {
  return AVAILABLE_MODELS.filter((m) => m.provider === 'lmstudio')
}

function AVAIL_OLLAMA_WITH_MODELS(_selected: string, _detected: ModelInfo[]): ModelInfo[] {
  return AVAILABLE_MODELS.filter((m) => m.provider === 'ollama')
}

// ---------------------------------------------------------------------------
// Progress stages
// ---------------------------------------------------------------------------
function StageList({ status }: { status: SetupStatus }) {
  const order: SetupStatus['stage'][] = [
    'checking', 'installing-mlx', 'downloading-model',
    'starting-mlx', 'connecting-lmstudio', 'connecting-ollama', 'ready'
  ]
  const currentIdx = order.indexOf(status.stage)

  const stages: Array<{ key: SetupStatus['stage']; label: string }> = [
    { key: 'installing-mlx', label: 'Install MLX runtime' },
    { key: 'downloading-model', label: 'Download model' },
    { key: 'starting-mlx', label: 'Start runtime & load model' },
    { key: 'connecting-lmstudio', label: 'Connect to LM Studio' },
    { key: 'connecting-ollama', label: 'Connect to Ollama' },
    { key: 'ready', label: 'Ready to chat' }
  ]

  return (
    <div className="space-y-3">
      {stages.map((s) => {
        const idx = order.indexOf(s.key)
        const state = idx < currentIdx ? 'done' : idx === currentIdx ? 'active' : 'pending'
        return (
          <div key={s.key} className="flex items-center gap-3">
            <StageDot state={state} />
            <div className="text-sm transition">
              {state === 'active' && status.message ? status.message : s.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StageDot({ state }: { state: 'pending' | 'active' | 'done' }) {
  if (state === 'done') {
    return (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/20">
        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none">
          <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    )
  }
  if (state === 'active') {
    return <div className="flex h-4 w-4 shrink-0 items-center justify-center"><div className="h-2 w-2 animate-pulse rounded-full bg-white" /></div>
  }
  return <div className="h-4 w-4 rounded-full border border-white/20" />
}

function GemmaLogo({ className }: { className?: string }) {
  return <img src={gemmaLogoUrl} alt="Gemma" className={className} />
}
