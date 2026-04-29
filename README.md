# Gemma-Plus 🦆

**Multi-provider local AI coding agent** — runs Gemma models via MLX, Qwen models via LM Studio, and Ollama models, all in one Electron app.

Forked from [Gemma Chat](https://github.com/ammaarreshi/gemma-chat-public) by Ammaar Reshi and extended with multi-backend support.

---

## Providers

| Provider | Backend | Best For |
|---------|---------|---------|
| **MLX** | `mlx_lm.server` (Apple Silicon) | Gemma 4 models, zero-setup |
| **LM Studio** | `http://localhost:1234` | Qwen 3.6 35B, Gemma 4 31B, any GGUF model |
| **Ollama** | `http://localhost:11434` | Any Ollama model |

## Available Models

### MLX (built-in, auto-downloads)
- **Gemma 4 E2B** — 1.5 GB, fastest
- **Gemma 4 E4B** ★ — 3 GB, recommended
- **Gemma 4 27B MoE** — 16 GB RAM
- **Gemma 4 31B** — 18 GB RAM, best quality

### LM Studio (start LM Studio first)
- Qwen 3.6 35B, Qwen 3.5 9B, Gemma 4 31B, any loaded model

### Ollama (start Ollama first)
- Any model you've pulled with `ollama pull`

## Getting Started

```bash
git clone https://github.com/Franzferdinan51/gemma-plus.git
cd gemma-plus
npm install
npm run dev
```

For production build:
```bash
npm run dist
# Output: dist/mac-arm64/Gemma Chat.app
```

## Requirements

- **macOS** on Apple Silicon (MLX)
- **Python 3.10–3.13** (for MLX provider)
- **LM Studio** (optional, for Qwen/Gemma via LM Studio)
- **Ollama** (optional, for Ollama models)

## Features

- 🔄 **Hot model switching** — switch backends without restarting
- 💻 **Build Mode** — coding agent with live preview canvas
- 💬 **Chat Mode** — conversational AI with tools
- 🖥️ **Provider tabs** — MLX / LM Studio / Ollama selector
- 🌐 **Agent Teams** — spawn swarm agents (Python orchestrator)
- 🌐 **Agent Mesh** — broadcast to mesh network
- ✈️ **Works offline** — MLX models run without internet

## Integrations

### Agent Teams
Python swarm orchestrator from [Agent-Teams](https://github.com/Franzferdinan51/Agent-Teams):
- 133+ specialized agents
- Swarm coding, research, audit modes
- IPC via `src/main/agent-teams.ts`

### Agent Mesh
WebSocket mesh client from [agent-mesh-api](https://github.com/Franzferdinan51/agent-mesh-api):
- Connects to mesh at `localhost:4000`
- Broadcast and direct messaging
- IPC via `src/main/mesh.ts`

## Architecture

```
src/
├── main/
│   ├── index.ts              # Electron main process
│   ├── providers/             # Multi-provider layer
│   │   ├── types.ts          # Provider interface
│   │   ├── mlx-provider.ts   # MLX backend (mlx_lm.server)
│   │   ├── lmstudio-provider.ts  # LM Studio HTTP client
│   │   ├── ollama-provider.ts    # Ollama HTTP client
│   │   └── index.ts         # Unified provider router
│   ├── tools.ts              # Agent tools (file, bash, web search)
│   ├── workspace.ts          # Live preview file server
│   ├── mesh.ts               # Agent Mesh client
│   └── agent-teams.ts       # Agent Teams orchestrator
├── renderer/                 # React UI
│   └── src/components/
│       ├── Sidebar.tsx       # Provider tabs + model selector
│       └── ...
└── shared/
    └── types.ts             # Model catalog (all providers)
```

## Workflow

1. Pick provider tab (MLX / LM Studio / Ollama)
2. Select model from the dropdown
3. Start chatting or enter Build Mode for coding

## Credits

- [Gemma Chat](https://github.com/ammaarreshi/gemma-chat-public) — original MLX Electron app by Ammaar Reshi
- [mlx-lm](https://github.com/ml-explore/mlx-examples/tree/main/llms/mlx_lm) — Apple MLX team
- [LM Studio](https://lmstudio.ai/) — local model serving
- [Ollama](https://ollama.ai/) — local model serving
