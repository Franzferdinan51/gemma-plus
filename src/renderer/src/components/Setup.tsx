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
                onClick={() => onStart(model, model.split('/')[0] as ProviderType)}
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
// Step 1: choose provider
// ---------------------------------------------------------------------------
type Step = 'provider' | 'model'

function WelcomeScreen({ model, onModelChange, onStart }: Props) {
  const [step, setStep] = useState<Step>('provider')
  const [provider, setProvider] = useState<ProviderType | null>(null)
  const [availLMStudio, setAvailLMStudio] = useState<ModelInfo[]>([])
  const [availOllama, setAvailOllama] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (step !== 'provider') return
    setLoading(true)
    window.api.getProvidersStatus().then((s) => {
      const lm = AVAILABLE_MODELS.filter(
        (m) => m.provider === 'lmstudio' && (s['lmstudio'] ?? false)
      )
      const ol = AVAILABLE_MODELS.filter(
        (m) => m.provider === 'ollama' && (s['ollama'] ?? false)
      )
      setAvailLMStudio(lm.length > 0 ? lm : [])
      setAvailOllama(ol.length > 0 ? ol : [])
      setLoading(false)
    })
  }, [step])

  function handleProviderChoice(p: ProviderType) {
    setProvider(p)
    setStep('model')
  }

  const selectedModel = AVAILABLE_MODELS.find((m) => m.name === model)
    ?? AVAILABLE_MODELS.find((m) => m.provider === provider)
    ?? AVAILABLE_MODELS[1]

  return (
    <div className="drag flex h-full w-full flex-col">
      <div className="h-9" />
      <div className="flex flex-1 items-center justify-center px-8">
        <div className="no-drag w-full max-w-md">
          <GemmaLogo className="mx-auto mb-5 h-20 w-20" />
          <h1 className="mb-1 text-center text-[22px] font-semibold tracking-tight">
            {step === 'provider' ? 'Choose your backend' : 'Choose a model'}
          </h1>
          <p className="mb-6 text-center text-[13px] text-ink-400">
            {step === 'provider'
              ? 'Where should Gemma Plus run?'
              : provider === 'mlx'
              ? `Downloading ${selectedModel?.label}`
              : `Using ${provider?.toUpperCase()} server`}
          </p>

          {step === 'provider' && (
            <ProviderChoice onChoose={handleProviderChoice} loading={loading} />
          )}

          {step === 'model' && provider && (
            <ModelChoice
              provider={provider}
              model={model}
              availLMStudio={availLMStudio}
              availOllama={availOllama}
              onModelChange={onModelChange}
              onBack={() => setStep('provider')}
            />
          )}

          {step === 'model' && (
            <button
              onClick={() => selectedModel && onStart(selectedModel.name, provider!)}
              className="mt-6 w-full rounded-xl bg-white py-3 text-sm font-medium text-ink-900 transition hover:bg-white/90 active:scale-[0.99]"
            >
              {provider === 'mlx' && selectedModel
                ? `Download ${selectedModel.label}  ·  ${selectedModel.size}`
                : provider === 'lmstudio'
                ? `Start chatting  ·  ${availLMStudio.length} model${availLMStudio.length !== 1 ? 's' : ''} detected`
                : `Start chatting  ·  ${availOllama.length} model${availOllama.length !== 1 ? 's' : ''} detected`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Provider choice cards
// ---------------------------------------------------------------------------
function ProviderChoice({
  onChoose,
  loading
}: {
  onChoose: (p: ProviderType) => void
  loading: boolean
}) {
  return (
    <div className="space-y-3">
      {/* MLX */}
      <button
        onClick={() => onChoose('mlx')}
        className="group w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🍎</span>
            <span className="font-semibold">MLX (Apple Silicon)</span>
          </div>
          <span className="text-xs text-ink-400 group-hover:text-white">Download models</span>
        </div>
        <div className="mt-1 text-[12.5px] text-ink-400">
          Runs Gemma natively on your Mac with MLX. Download once, use forever.
          Best on Apple Silicon (M1–M4).
        </div>
      </button>

      {/* LM Studio */}
      <button
        onClick={() => onChoose('lmstudio')}
        className="group w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💻</span>
            <span className="font-semibold">LM Studio</span>
          </div>
          {loading ? (
            <span className="text-xs text-ink-400 animate-pulse">Checking…</span>
          ) : (
            <span className="text-xs text-ink-400 group-hover:text-white">Connect to LM Studio</span>
          )}
        </div>
        <div className="mt-1 text-[12.5px] text-ink-400">
          Connect to a local LM Studio server. Load any GGUF model (Qwen 3.6 35B, Gemma 4 31B, and more).
          Works on Mac, Linux, or Windows.
        </div>
      </button>

      {/* Ollama */}
      <button
        onClick={() => onChoose('ollama')}
        className="group w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🦙</span>
            <span className="font-semibold">Ollama</span>
          </div>
          {loading ? (
            <span className="text-xs text-ink-400 animate-pulse">Checking…</span>
          ) : (
            <span className="text-xs text-ink-400 group-hover:text-white">Connect to Ollama</span>
          )}
        </div>
        <div className="mt-1 text-[12.5px] text-ink-400">
          Connect to Ollama running locally. Pull any model with{' '}
          <code className="text-[11px]">ollama pull</code>. Works on Mac, Linux, or Windows.
        </div>
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Model choice list
// ---------------------------------------------------------------------------
function ModelChoice({
  provider,
  model,
  availLMStudio,
  availOllama,
  onModelChange,
  onBack
}: {
  provider: ProviderType
  model: string
  availLMStudio: ModelInfo[]
  availOllama: ModelInfo[]
  onModelChange: (m: string) => void
  onBack: () => void
}) {
  const mlxModels = AVAILABLE_MODELS.filter((m) => m.provider === 'mlx')
  const lmModels = AVAIL_LM_STUDIO_WITH_MODELS(model, availLMStudio)
  const olModels = AVAIL_OLLAMA_WITH_MODELS(model, availOllama)
  const show = provider === 'mlx' ? mlxModels : provider === 'lmstudio' ? lmModels : olModels

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-3 flex items-center gap-1 text-[12px] text-ink-400 hover:text-white"
      >
        ← Back
      </button>

      {provider !== 'mlx' && show.length === 0 && (
        <div className="mb-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-300">
          <div className="font-medium">No models detected</div>
          <div className="mt-1 text-yellow-300/80">
            {provider === 'lmstudio'
              ? 'Start LM Studio, load a model, then click "Server" → Start server.'
              : 'Run ollama serve and pull some models with ollama pull <model>.'}
          </div>
        </div>
      )}

      <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-ink-400">
        {provider === 'mlx' ? 'Pick a model to download' : 'Available models'}
      </div>

      <div className="space-y-2">
        {show.map((m) => (
          <button
            key={m.name}
            onClick={() => onModelChange(m.name)}
            className={`group w-full rounded-xl border px-4 py-3 text-left transition active:scale-[0.99] ${
              model === m.name
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
function AVAIL_LM_STUDIO_WITH_MODELS(selected: string, detected: ModelInfo[]): ModelInfo[] {
  if (detected.length > 0) return detected
  return AVAILABLE_MODELS.filter((m) => m.provider === 'lmstudio')
}

function AVAIL_OLLAMA_WITH_MODELS(selected: string, detected: ModelInfo[]): ModelInfo[] {
  if (detected.length > 0) return detected
  return AVAILABLE_MODELS.filter((m) => m.provider === 'ollama')
}

// ---------------------------------------------------------------------------
// Progress stages
// ---------------------------------------------------------------------------
function StageList({ status }: { status: SetupStatus }) {
  const baseStages: Array<{ key: SetupStatus['stage']; label: string }> = [
    { key: 'installing-mlx', label: 'Install MLX runtime' },
    { key: 'downloading-model', label: 'Download model' },
    { key: 'starting-mlx', label: 'Start runtime & load model' },
    { key: 'connecting-lmstudio', label: 'Connect to LM Studio' },
    { key: 'connecting-ollama', label: 'Connect to Ollama' },
    { key: 'ready', label: 'Ready to chat' }
  ]

  const order: SetupStatus['stage'][] = [
    'checking', 'installing-mlx', 'downloading-model',
    'starting-mlx', 'connecting-lmstudio', 'connecting-ollama', 'ready'
  ]
  const currentIdx = order.indexOf(status.stage)
  const stages = baseStages.filter((s) => s.key !== 'connecting-lmstudio' && s.key !== 'connecting-ollama')
    .concat(
      status.stage === 'connecting-lmstudio' ? [{ key: 'connecting-lmstudio' as SetupStatus['stage'], label: 'Connect to LM Studio' }] : [],
      status.stage === 'connecting-ollama' ? [{ key: 'connecting-ollama' as SetupStatus['stage'], label: 'Connect to Ollama' }] : []
    )

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
    return (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center">
        <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
      </div>
    )
  }
  return <div className="h-4 w-4 rounded-full border border-white/20" />
}

function GemmaLogo({ className }: { className?: string }) {
  return (
    <img
      src={gemmaLogoUrl}
      alt="Gemma"
      className={className}
    />
  )
}
