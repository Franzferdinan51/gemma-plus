import { useEffect, useState, useCallback } from 'react'
import type { SetupStatus } from '@shared/types'
import { AVAILABLE_MODELS } from '@shared/types'
import Setup from './components/Setup'
import Chat from './components/Chat'

type AppMode = 'chat' | 'code' | 'teams' | 'media'
type AppState =
  | { phase: 'boot' }
  | { phase: 'setup'; status: SetupStatus; model: string }
  | { phase: 'ready'; model: string; mode: AppMode }
  | { phase: 'switching'; model: string; toModel: string; status: SetupStatus; mode: AppMode }

export default function App() {
  const [state, setState] = useState<AppState>({ phase: 'boot', mode: 'chat' })
  const [model, setModel] = useState('mlx-community/gemma-4-e4b-it-4bit')
  const [mode, setMode] = useState<AppMode>('chat')
  const [teamsResult, setTeamsResult] = useState('')
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [meshStatus, setMeshStatus] = useState<{ connected: boolean; url: string } | null>(null)
  const [meshBroadcastMsg, setMeshBroadcastMsg] = useState('')

  useEffect(() => {
    const rawUnsub = window.api.onRawChunk((ev) => {
      // eslint-disable-next-line no-console
      console.log('[gemma]', ev.chunk)
    })
    let unsub: (() => void) | undefined
    const meshTimer = setTimeout(async () => {
      try {
        const ms = await window.api.meshStatus()
        setMeshStatus(ms)
      } catch { /* mesh optional */ }
    }, 2000)

    ;(async () => {
      unsub = window.api.onSetupStatus((status) => {
        clearTimeout(meshTimer)
        setState((prev) => {
          if (status.stage === 'ready') {
            if (prev.phase === 'switching') {
              return { phase: 'ready', model: prev.toModel, mode: prev.mode }
            }
            return { phase: 'ready', model: prev.phase === 'setup' ? prev.model : model, mode: prev.mode }
          }
          if (status.stage === 'error') {
            if (prev.phase === 'switching') {
              return { phase: 'ready', model: prev.model, mode: prev.mode }
            }
          }
          if (prev.phase === 'switching') {
            return { ...prev, status }
          }
          const m = prev.phase === 'setup' ? prev.model : model
          return { phase: 'setup', status, model: m, mode: prev.mode }
        })
      })
      // Show WelcomeScreen immediately — do NOT auto-start backend
      setState({ phase: 'setup', status: { stage: 'checking', message: 'Welcome' }, model })
    })()
    return () => { clearTimeout(meshTimer); rawUnsub(); unsub?.() }
  }, [])

  const handleSwitchModel = useCallback(async (newModel: string) => {
    setState({ phase: 'switching', model, toModel: newModel, status: { stage: 'checking', message: 'Switching…' }, mode })
    setModel(newModel)
    await window.api.startSetup(newModel)
  }, [model, mode])

  const handleModeChange = useCallback((m: AppMode) => {
    setMode(m)
    if (state.phase === 'ready') {
      setState({ ...state, mode: m })
    }
  }, [state])

  const handleStartChat = useCallback((selectedModel: string) => {
    setModel(selectedModel)
    setState({ phase: 'setup', status: { stage: 'checking', message: 'Checking system…' }, model: selectedModel })
    window.api.startSetup(selectedModel)
  }, [])

  // Agent Teams actions
  async function runTeamsAction(action: 'spawn' | 'status' | 'delegate', task?: string, agent?: string) {
    setTeamsLoading(true)
    setTeamsResult('')
    try {
      let result = ''
      if (action === 'status') {
        result = await window.api.agentTeamsStatus()
      } else if (action === 'spawn' && task) {
        result = await window.api.agentTeamsSpawn(task)
      } else if (action === 'delegate' && task && agent) {
        result = await window.api.agentTeamsDelegate(agent, task)
      }
      setTeamsResult(result)
    } catch (e) {
      setTeamsResult(`Error: ${e}`)
    }
    setTeamsLoading(false)
  }

  // Mesh actions
  async function runMeshBroadcast() {
    if (!meshBroadcastMsg.trim()) return
    try {
      const r = await window.api.meshBroadcast(meshBroadcastMsg)
      setMeshBroadcastMsg('')
      setTeamsResult(`Mesh broadcast: ${r}`)
    } catch (e) {
      setTeamsResult(`Error: ${e}`)
    }
  }

  async function refreshMeshStatus() {
    try {
      const ms = await window.api.meshStatus()
      setMeshStatus(ms)
    } catch {}
  }

  // ===== Boot =====
  if (state.phase === 'boot') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink-980">
        <div className="text-center">
          <div className="shimmer h-1 w-32 rounded-full" />
          <p className="mt-3 text-sm text-ink-400">Loading Gemma Plus…</p>
        </div>
      </div>
    )
  }

  // ===== Setup =====
  if (state.phase === 'setup') {
    return (
      <div className="anim-fade-in h-full w-full">
        <Setup
          status={state.status}
          model={state.model}
          onModelChange={(m) => setModel(m)}
          onStart={(m, p) => { setModel(m); handleStartChat(m) }}
        />
      </div>
    )
  }

  // ===== Switching =====
  if (state.phase === 'switching') {
    return (
      <div className="anim-fade-in h-full w-full">
        <Chat model={state.model} onSwitchModel={handleSwitchModel} />
        <SwitchingOverlay status={state.status} />
      </div>
    )
  }

  // ===== Ready — Mode Router =====
  if (state.phase === 'ready') {
    return (
      <div className="anim-fade-in h-full w-full flex flex-col">
        <ModeBar mode={mode} onModeChange={handleModeChange} meshStatus={meshStatus} />

        {mode === 'chat' || mode === 'code' ? (
          <Chat model={model} onSwitchModel={handleSwitchModel} />
        ) : mode === 'teams' ? (
          <AgentTeamsPanel
            result={teamsResult}
            loading={teamsLoading}
            onAction={runTeamsAction}
          />
        ) : (
          <MediaHub />
        )}
      </div>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Top mode bar
// ---------------------------------------------------------------------------
function ModeBar({
  mode,
  onModeChange,
  meshStatus
}: {
  mode: AppMode
  onModeChange: (m: AppMode) => void
  meshStatus: { connected: boolean; url: string } | null
}) {
  const tabs: { id: AppMode; label: string; icon: string }[] = [
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'code', label: 'Build', icon: '🔨' },
    { id: 'teams', label: 'Teams', icon: '🐝' },
    { id: 'media', label: 'Media', icon: '🎨' },
  ]

  return (
    <div className="no-drag flex h-10 shrink-0 items-center gap-1 border-b border-white/5 bg-ink-975 px-3">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onModeChange(t.id)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
            mode === t.id
              ? 'bg-white/10 text-white'
              : 'text-ink-400 hover:bg-white/5 hover:text-ink-200'
          }`}
        >
          <span>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}

      <div className="flex-1" />

      {/* Mesh status indicator */}
      <div className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ${meshStatus?.connected ? 'text-green-400' : 'text-ink-400'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${meshStatus?.connected ? 'bg-green-400' : 'bg-ink-500'}`} />
        <span>Mesh {meshStatus?.connected ? 'Online' : 'Offline'}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Agent Teams panel
// ---------------------------------------------------------------------------
function AgentTeamsPanel({
  result,
  loading,
  onAction
}: {
  result: string
  loading: boolean
  onAction: (a: 'spawn' | 'status' | 'delegate', t?: string, ag?: string) => void
}) {
  const [task, setTask] = useState('')
  const [agent, setAgent] = useState('')
  const [mode, setMode] = useState<'spawn' | 'status' | 'delegate'>('status')

  const presets = [
    { label: '🔍 Research', desc: 'Code research agent', agent: 'researcher' },
    { label: '🔧 Coder', desc: 'Write code', agent: 'coder' },
    { label: '🔒 Security', desc: 'Security audit', agent: 'security-engineer' },
    { label: '🐛 Debugger', desc: 'Find and fix bugs', agent: 'debugger' },
    { label: '📐 Architect', desc: 'System design', agent: 'solutions-architect' },
    { label: '🧪 QA Engineer', desc: 'Test and quality', agent: 'qa-engineer' },
  ]

  function handleRun() {
    if (mode === 'status') onAction('status')
    else if (mode === 'spawn') onAction('spawn', task)
    else onAction('delegate', task, agent)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Left: controls */}
      <div className="no-drag shrink-0 space-y-3 border-b border-white/5 bg-ink-975 p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setMode('status')} className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === 'status' ? 'bg-white/10 text-white' : 'text-ink-400'}`}>Check Status</button>
          <button onClick={() => setMode('spawn')} className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === 'spawn' ? 'bg-white/10 text-white' : 'text-ink-400'}`}>Spawn</button>
          <button onClick={() => setMode('delegate')} className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === 'delegate' ? 'bg-white/10 text-white' : 'text-ink-400'}`}>Delegate</button>
        </div>

        {(mode === 'spawn' || mode === 'delegate') && (
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder={mode === 'spawn' ? 'Task description…' : 'Task to delegate…'}
            rows={3}
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white placeholder-ink-500 focus:border-white/20 focus:outline-none"
          />
        )}

        {mode === 'delegate' && (
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Agent type</label>
            <input
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              placeholder="e.g. researcher, coder, security-engineer"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white placeholder-ink-500 focus:border-white/20 focus:outline-none"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={loading || (mode !== 'status' && !task.trim())}
            className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-ink-900 transition hover:bg-white/90 disabled:opacity-40"
          >
            {loading ? '⏳ Running…' : mode === 'status' ? 'Check Status' : mode === 'spawn' ? '🐝 Spawn Team' : '🐝 Delegate'}
          </button>
          <button
            onClick={() => onAction('status')}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-ink-400 hover:bg-white/5"
          >
            Refresh
          </button>
        </div>

        {/* Quick presets */}
        {mode === 'delegate' && (
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.agent}
                onClick={() => { setMode('delegate'); setTask(p.desc); setAgent(p.agent) }}
                className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-ink-300 hover:bg-white/5"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: output */}
      <div className="flex-1 overflow-y-auto p-4">
        {result ? (
          <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-ink-200">{result}</pre>
        ) : (
          <div className="text-center text-[13px] text-ink-500">
            🐝 Agent Teams is ready. Choose an action above.
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Media Hub — mmx integration
// ---------------------------------------------------------------------------
function MediaHub() {
  const [activeTab, setActiveTab] = useState<'image' | 'speech' | 'music' | 'video'>('image')
  const [prompt, setPrompt] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [aspect, setAspect] = useState('1:1')
  const [voice, setVoice] = useState('narrator')
  const [speechText, setSpeechText] = useState('')
  const [musicPrompt, setMusicPrompt] = useState('')
  const [videoPrompt, setVideoPrompt] = useState('')

  const tabs = [
    { id: 'image' as const, label: '🖼️ Image', icon: '🖼️' },
    { id: 'speech' as const, label: '🎤 Speech', icon: '🎤' },
    { id: 'music' as const, label: '🎵 Music', icon: '🎵' },
    { id: 'video' as const, label: '🎬 Video', icon: '🎬' },
  ]

  async function runMmx(args: string[]) {
    return window.api.mmxRun(args)
  }

  async function generateImage() {
    if (!prompt.trim()) return
    setLoading(true)
    setOutput('')
    try {
      const result = await runMmx(['image', 'generate', '--prompt', prompt, '--aspect', aspect, '--output-format', 'json', '--quiet'])
      let data
      try { data = JSON.parse(result) } catch { data = { output: result } }
      if (data.output || data.images?.[0]) {
        const url = data.images?.[0] ?? data.output ?? ''
        setOutput(url.startsWith('http') ? url : `✅ ${url}`)
      } else {
        setOutput(result)
      }
    } catch (e) { setOutput(`Error: ${e}`) }
    setLoading(false)
  }

  async function generateSpeech() {
    if (!speechText.trim()) return
    setLoading(true)
    setOutput('')
    try {
      const out = `/tmp/gemma-plus-speech-${Date.now()}.mp3`
      await runMmx(['speech', 'synthesize', '--text', speechText, '--voice', voice, '--output', out, '--quiet'])
      setOutput(`✅ Saved to ${out}`)
    } catch (e) { setOutput(`Error: ${e}`) }
    setLoading(false)
  }

  async function generateMusic() {
    if (!musicPrompt.trim()) return
    setLoading(true)
    setOutput('')
    try {
      const out = `/tmp/gemma-plus-music-${Date.now()}.mp3`
      await runMmx(['music', 'generate', '--prompt', musicPrompt, '--output', out, '--quiet'])
      setOutput(`✅ Saved to ${out}`)
    } catch (e) { setOutput(`Error: ${e}`) }
    setLoading(false)
  }

  async function generateVideo() {
    if (!videoPrompt.trim()) return
    setLoading(true)
    setOutput('')
    try {
      const result = await runMmx(['video', 'generate', videoPrompt])
      setOutput(result)
    } catch (e) { setOutput(`Error: ${e}`) }
    setLoading(false)
  }

  async function checkQuota() {
    setLoading(true)
    try {
      const r = await runMmx(['quota', 'show', '--quiet'])
      setOutput(r)
    } catch (e) { setOutput(`Error: ${e}`) }
    setLoading(false)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tabs */}
      <div className="no-drag flex h-10 shrink-0 items-center gap-1 border-b border-white/5 bg-ink-975 px-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
              activeTab === t.id ? 'bg-white/10 text-white' : 'text-ink-400 hover:bg-white/5'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={checkQuota} className="rounded-md px-2 py-1 text-[11px] text-ink-400 hover:bg-white/5">
          📊 Quota
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — inputs */}
        <div className="no-drag w-80 shrink-0 space-y-3 border-r border-white/5 bg-ink-975 p-4 overflow-y-auto">
          {activeTab === 'image' && (
            <>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-ink-400">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="A cyberpunk city at night, neon lights, rain..."
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white placeholder-ink-500 focus:border-white/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-ink-400">Aspect Ratio</label>
                <div className="flex gap-2">
                  {['1:1','16:9','9:16','4:3','3:2'].map((a) => (
                    <button key={a} onClick={() => setAspect(a)}
                      className={`rounded-md border px-2 py-1 text-[11px] ${aspect === a ? 'border-white/20 bg-white/10 text-white' : 'border-white/5 text-ink-400'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={generateImage} disabled={!prompt.trim() || loading}
                className="w-full rounded-xl bg-white py-2.5 text-sm font-medium text-ink-900 transition hover:bg-white/90 disabled:opacity-40">
                {loading ? '⏳ Generating…' : '🖼️ Generate Image'}
              </button>
            </>
          )}

          {activeTab === 'speech' && (
            <>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-ink-400">Text to Speak</label>
                <textarea
                  value={speechText}
                  onChange={(e) => setSpeechText(e.target.value)}
                  rows={4}
                  placeholder="Hello, this is a voice synthesis test..."
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white placeholder-ink-500 focus:border-white/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-ink-400">Voice</label>
                <div className="flex flex-wrap gap-2">
                  {['narrator','casual','sad','english_narrator'].map((v) => (
                    <button key={v} onClick={() => setVoice(v)}
                      className={`rounded-md border px-2 py-1 text-[11px] ${voice === v ? 'border-white/20 bg-white/10 text-white' : 'border-white/5 text-ink-400'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={generateSpeech} disabled={!speechText.trim() || loading}
                className="w-full rounded-xl bg-white py-2.5 text-sm font-medium text-ink-900 transition hover:bg-white/90 disabled:opacity-40">
                {loading ? '⏳ Synthesizing…' : '🎤 Synthesize Speech'}
              </button>
            </>
          )}

          {activeTab === 'music' && (
            <>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-ink-400">Music Prompt</label>
                <textarea
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  rows={3}
                  placeholder="Upbeat electronic, driving drums and bass, high energy..."
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white placeholder-ink-500 focus:border-white/20 focus:outline-none"
                />
              </div>
              <button onClick={generateMusic} disabled={!musicPrompt.trim() || loading}
                className="w-full rounded-xl bg-white py-2.5 text-sm font-medium text-ink-900 transition hover:bg-white/90 disabled:opacity-40">
                {loading ? '⏳ Generating…' : '🎵 Generate Music'}
              </button>
            </>
          )}

          {activeTab === 'video' && (
            <>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-ink-400">Video Prompt</label>
                <textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  rows={3}
                  placeholder="A drone flying through redwood trees at sunset..."
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white placeholder-ink-500 focus:border-white/20 focus:outline-none"
                />
              </div>
              <button onClick={generateVideo} disabled={!videoPrompt.trim() || loading}
                className="w-full rounded-xl bg-white py-2.5 text-sm font-medium text-ink-900 transition hover:bg-white/90 disabled:opacity-40">
                {loading ? '⏳ Generating…' : '🎬 Generate Video'}
              </button>
            </>
          )}
        </div>

        {/* Right panel — output */}
        <div className="flex flex-1 flex-col overflow-hidden p-4">
          {output ? (
            <div className="flex-1 overflow-y-auto">
              {output.startsWith('http') ? (
                <div className="space-y-3">
                  <img src={output} alt="Generated" className="max-w-full rounded-xl" />
                  <div className="flex gap-2">
                    <a href={output} target="_blank" rel="noopener noreferrer"
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-ink-300 hover:bg-white/5">
                      🔗 Open
                    </a>
                    <button onClick={() => navigator.clipboard.writeText(output)}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-ink-300 hover:bg-white/5">
                      📋 Copy URL
                    </button>
                  </div>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-[12px] text-ink-200">{output}</pre>
              )}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-[13px] text-ink-500">
              {loading ? '⏳ Working…' : 'Output will appear here'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Switching overlay
// ---------------------------------------------------------------------------
function SwitchingOverlay({ status }: { status: SetupStatus }) {
  return (
    <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="anim-fade-up flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-ink-950 px-10 py-8 shadow-2xl">
        <div className="shimmer h-1 w-32 rounded-full" />
        <p className="text-sm text-ink-200">{status.message}</p>
        {status.progress != null && status.progress > 0 && (
          <div className="w-48">
            <div className="h-1 w-full rounded-full bg-white/10">
              <div className="h-full rounded-full bg-white/60 transition-all duration-500"
                style={{ width: `${Math.round(status.progress * 100)}%` }} />
            </div>
            <p className="mt-1 text-center text-[10px] text-ink-400">
              {Math.round(status.progress * 100)}%
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
