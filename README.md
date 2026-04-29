# Gemma Plus 🦆

**Multi-provider local AI coding agent** — runs Gemma/Qwen models via MLX, LM Studio, or Ollama, all in one Electron app with built-in workspace tools, live preview, Agent Teams swarm orchestration, and Agent Mesh networking.

Forked from [Gemma Chat](https://github.com/ammaarreshi/gemma-chat-public) by Ammaar Reshi. Extended with multi-backend support, cross-platform compatibility, and AI agent integrations.

---

## Features

| Feature | Description |
|---------|-------------|
| 🔄 **Hot model switching** | Switch backends without restarting |
| 🖥️ **Provider tabs** | MLX / LM Studio / Ollama selector |
| 💻 **Build Mode** | Coding agent with live preview canvas |
| 💬 **Chat Mode** | Conversational AI with 9 workspace tools |
| 🌐 **Agent Teams** | Spawn 133+ swarm agents via Python orchestrator |
| 🌐 **Agent Mesh** | WebSocket broadcast to mesh network |
| ✈️ **Works offline** | MLX models run without internet |

---

## Supported Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| **macOS Apple Silicon** | ✅ Primary | MLX, native performance |
| **macOS Intel** | ✅ | MLX via Rosetta, or LM Studio |
| **Linux (x64)** | ✅ | Python 3.10+ for MLX, LM Studio, Ollama |
| **Windows (x64)** | ✅ | WSL/Git Bash bash for tools, or LM Studio/Ollama |

### Platform-Specific Notes

- **macOS**: Uses `/bin/zsh` as default shell, workspace at `~/Library/Application Support/gemma-plus/workspaces/`
- **Linux**: Uses `$SHELL` (usually bash/zsh), workspace at `~/.config/gemma-plus/workspaces/`
- **Windows**: Uses Git Bash bash if available (WSL also supported), workspace at `%APPDATA%/gemma-plus/workspaces/`

---

## Model Providers

| Provider | Backend | Best For | Requirements |
|---------|---------|----------|--------------|
| **MLX** | `mlx_lm.server` (Apple Silicon) | Gemma 4, zero-setup | macOS ARM, Python 3.10–3.13 |
| **LM Studio** | `http://localhost:1234` | Qwen 3.6 35B, Gemma 4 31B, any GGUF | LM Studio running |
| **Ollama** | `http://localhost:11434` | Any Ollama model | Ollama running |

### Available Models

**MLX (auto-downloads on first use)**
- Gemma 4 E2B — 1.5 GB, fastest
- Gemma 4 E4B ★ — 3 GB, recommended
- Gemma 4 27B MoE — 16 GB RAM
- Gemma 4 31B — 18 GB RAM, best quality

**LM Studio**
- Qwen 3.6 35B, Qwen 3.5 9B, Gemma 4 31B
- Any GGUF model loaded in LM Studio

**Ollama**
- Any model pulled with `ollama pull <model>`

---

## Quick Start

```bash
git clone https://github.com/Franzferdinan51/gemma-plus.git
cd gemma-plus
npm install
npm run dev
```

For a production build:

```bash
npm run dist
# Output: dist/mac-arm64/Gemma Plus.app   (macOS)
#         dist/gemma-plus_0.1.0_amd64.deb  (Linux)
#         dist/gemma-plus Setup.exe         (Windows)
```

---

## Requirements

### All Platforms
- Node.js 20+
- Python 3.10–3.13 (for MLX provider)

### macOS
- macOS 12+ on Apple Silicon (MLX performs best on ARM)
- Rosetta 2 for Intel Mac (MLX)
- Xcode command line tools for native builds

### Linux
- `python3` + `pip` for MLX
- `python3 -m venv` or `virtualenv` for Python environment
- `libgomp1` (OpenMP) for MLX acceleration

### Windows
- Git for Windows, WSL, or Git Bash (for bash tool execution)
- Python 3.10+ via WSL or native Python
- LM Studio or Ollama for non-MLX backends

---

## Integrations

### Agent Teams (133+ Swarm Agents)
Spawns Python swarm orchestrator (`swarm-orchestrator.py`) via IPC:

```bash
# Swarm modes
swarm build "REST API for task management"
swarm game "2D roguelike with procedural generation"
swarm research "Best practices for local AI agents"
swarm audit "Security audit of this codebase"
```

Located at `src/main/agent-teams.ts`. Requires Python 3 and the `agent-swarm-system` directory.

### Agent Mesh (WebSocket Network)
Connects to mesh network at `ws://localhost:4000/ws` for multi-agent broadcast and messaging:

```bash
# Mesh API key (default)
OPENCLAW_MESH_KEY=openclaw-mesh-default-key
```

Located at `src/main/mesh.ts`. Mesh server must be running at `localhost:4000`.

---

## Architecture

```
gemma-plus/
├── src/
│   ├── main/
│   │   ├── index.ts              # Electron main process (490 lines)
│   │   ├── providers/            # Multi-provider layer
│   │   │   ├── types.ts          # ModelProvider interface
│   │   │   ├── mlx-provider.ts   # MLX backend (mlx_lm.server)
│   │   │   ├── lmstudio-provider.ts  # LM Studio HTTP client
│   │   │   ├── ollama-provider.ts    # Ollama HTTP client
│   │   │   └── index.ts          # Provider router + model catalog
│   │   ├── tools.ts              # 9 workspace tools + web search
│   │   ├── workspace.ts          # Live preview file server (400 lines)
│   │   ├── mesh.ts               # Agent Mesh WebSocket client
│   │   └── agent-teams.ts       # Agent Teams orchestrator bridge
│   ├── renderer/
│   │   └── src/components/
│   │       ├── Sidebar.tsx       # Provider tabs + model selector
│   │       ├── Chat.tsx          # Chat interface
│   │       ├── Composer.tsx      # Message composer
│   │       ├── Message.tsx       # Message bubble
│   │       ├── Canvas.tsx        # Live preview canvas
│   │       └── Setup.tsx         # First-run setup wizard
│   ├── preload/
│   │   └── index.ts              # Secure IPC bridge
│   └── shared/
│       └── types.ts              # Shared types + model catalog
└── electron-builder.yml         # Cross-platform build config
```

---

## Workspace Tools

The app provides 9 built-in tools for coding tasks:

| Tool | Description |
|------|-------------|
| `Read` | Read file contents |
| `Write` | Write/create file |
| `Edit` | Edit file with targeted replacement |
| `Bash` | Run shell command in workspace |
| `Glob` | Find files by pattern |
| `Grep` | Search file contents |
| `WebSearch` | DuckDuckGo search |
| `WebFetch` | Fetch URL content |
| `TodoWrite` | Write todo list |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Enter` | Send message |
| `Cmd+K` | New conversation |
| `Cmd+Shift+V` | Toggle live preview |
| `Esc` | Abort current generation |

---

## Environment Variables

| Variable | Default | Description |
|---------|---------|-------------|
| `LM_STUDIO_URL` | `http://localhost:1234` | LM Studio server URL |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `OPENCLAW_MESH_KEY` | `openclaw-mesh-default-key` | Agent Mesh API key |
| `HF_HOME` | auto | HuggingFace cache directory |
| `TRANSFORMERS_CACHE` | auto | Transformers model cache |

---

## Troubleshooting

### MLX Provider

**Python venv not found**
```bash
cd gemma-plus
python3 -m venv .venv
source .venv/bin/activate  # Linux/macOS
# or: .venv\Scripts\activate  # Windows
pip install mlx-lm
```

**Model download slow**
```bash
# Set HuggingFace mirror
HF_HUB_ENABLE_HF_transfer=1
```

### LM Studio Provider

**No models shown**
1. Open LM Studio
2. Load a model (e.g., Qwen 3.6 35B)
3. Click "Server" → Start server
4. Gemma Plus should detect models automatically

### Ollama Provider

**No models shown**
```bash
ollama pull qwen2.5-7b-instruct
ollama list  # verify models
```

**Connection refused**
1. Run `ollama serve`
2. Verify Ollama is at `http://localhost:11434`

### Build Issues

**Native module errors**
```bash
npm install
npm run build
```

**Windows: Electron not found**
```powershell
npm cache clean --force
npm install
```

---

## Credits

- [Gemma Chat](https://github.com/ammaarreshi/gemma-chat-public) — original MLX Electron app by Ammaar Reshi
- [mlx-lm](https://github.com/ml-explore/mlx-examples/tree/main/llms/mlx_lm) — Apple MLX team
- [LM Studio](https://lmstudio.ai/) — local model serving
- [Ollama](https://ollama.ai/) — local model serving
- [Agent Teams](https://github.com/Franzferdinan51/Agent-Teams) — swarm orchestration by DuckBot
- [Agent Mesh API](https://github.com/Franzferdinan51/agent-mesh-api) — mesh networking by DuckBot
