import { useState, useEffect } from 'react'
import type { ModelInfo, ProviderType } from '@shared/types'

interface Conversation {
  id: string
  title: string
  createdAt: number
}

interface Props {
  conversations: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  selectedModel: string
  models: ModelInfo[]
  onModelChange: (model: string) => void
}

const PROVIDERS: { id: ProviderType; label: string }[] = [
  { id: 'mlx', label: '🖥 MLX' },
  { id: 'lmstudio', label: '💻 LM Studio' },
  { id: 'ollama', label: '🦙 Ollama' }
]

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  selectedModel,
  models,
  onModelChange
}: Props) {
  const [activeProvider, setActiveProvider] = useState<ProviderType>('mlx')

  const filteredModels = models.filter((m) => m.provider === activeProvider)

  // Auto-switch provider when selected model changes
  useEffect(() => {
    const model = models.find((m) => m.name === selectedModel)
    if (model && model.provider !== activeProvider) {
      setActiveProvider(model.provider)
    }
  }, [selectedModel])

  return (
    <div className="drag flex h-full w-60 shrink-0 flex-col border-r border-white/[0.06] bg-black/20">
      <div className="h-11 shrink-0" />

      {/* New chat */}
      <div className="no-drag px-3 pb-3">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] font-medium text-white transition hover:border-white/20 hover:bg-white/[0.07]"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          New chat
        </button>
      </div>

      {/* Provider tabs */}
      <div className="no-drag flex border-b border-white/[0.06] px-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => setActiveProvider(p.id)}
            className={`flex-1 py-2 text-[10px] font-medium transition-all ${
              activeProvider === p.id
                ? 'border-b-2 border-white/60 text-white'
                : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Model selector */}
      <div className="no-drag px-3 py-2">
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] text-ink-200 outline-none transition hover:border-white/20 focus:border-white/30"
        >
          <option value="" disabled>Select model…</option>
          {filteredModels.map((m) => (
            <option key={m.name} value={m.name}>
              {m.label} {m.recommended ? '★' : ''}
            </option>
          ))}
        </select>
        {filteredModels.length === 0 && (
          <p className="mt-1 text-[10px] text-ink-400">
            {activeProvider === 'lmstudio'
              ? 'Start LM Studio to see models'
              : activeProvider === 'ollama'
              ? 'Start Ollama to see models'
              : 'Download a model to get started'}
          </p>
        )}
      </div>

      {/* Conversation list */}
      <div className="no-drag min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {conversations.map((c) => (
          <div key={c.id} className="group relative">
            <button
              onClick={() => onSelect(c.id)}
              className={`w-full truncate rounded-lg px-3 py-2 text-left text-[13px] transition-all duration-200 ease-out ${
                activeId === c.id
                  ? 'bg-white/[0.07] text-white'
                  : 'text-ink-200 hover:bg-white/[0.03]'
              }`}
            >
              {c.title}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('Delete this chat?')) onDelete(c.id)
              }}
              className="absolute right-1.5 top-1.5 hidden h-6 w-6 items-center justify-center rounded-md text-ink-400 hover:bg-white/10 hover:text-white group-hover:flex"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
                <path d="M4 4l8 8M12 4L4 12" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
