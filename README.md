# Gemma Plus 🦆

**Multi-provider local AI coding agent** — runs Gemma/Qwen models via MLX, LM Studio, or Ollama, all in one Electron app with built-in workspace tools, live preview, Agent Teams swarm orchestration, Agent Mesh networking, and full MiniMax media generation (image, speech, music, video).

Forked from [Gemma Chat](https://github.com/ammaarreshi/gemma-chat-public) by Ammaar Reshi.

---

## Features

| Feature | Description |
|---------|-------------|
| 🖥️ **3 Backends** | MLX (Apple Silicon) · LM Studio (any model) · Ollama |
| 🔄 **Hot model switching** | Switch backends without restarting |
| 💻 **Build Mode** | Coding agent with live preview canvas |
| 💬 **Chat Mode** | Conversational AI with 10 workspace tools |
| 🐝 **Agent Teams** | Spawn 133+ swarm agents via Python orchestrator |
| 🌐 **Agent Mesh** | WebSocket broadcast to mesh network |
| 🎨 **Media Hub** | Generate images, speech, music, video via mmx/MiniMax |
| ✈️ **Works offline** | MLX models run without internet |
| 🪟 **Cross-platform** | macOS · Linux · Windows |

---

## Supported Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| **macOS ARM** | ✅ Primary | MLX, native performance |
| **macOS Intel** | ✅ | Rosetta or LM Studio fallback |
| **Linux** | ✅ | Python 3.10+ for MLX, LM Studio, Ollama |
| **Windows** | ✅ | NSIS installer, Git Bash for tools |

---

## Model Providers

| Provider | Backend | Best For | Requirements |
|---------|---------|----------|--------------|
| **MLX** | `mlx_lm.server` | Gemma 4, zero-setup | macOS ARM, Python 3.10–3.13 |
| **LM Studio** | `http://localhost:1234` | Qwen 3.6 35B, Gemma 4 31B | LM Studio running |
| **Ollama** | `http://localhost:11434` | Any Ollama model | Ollama running |

### Available Models

**MLX** (auto-downloads on first use)
- Gemma 4 E2B — 1.5 GB, fastest
- Gemma 4 E4B ★ — 3 GB, recommended
- Gemma 4 27B MoE — 16 GB RAM
- Gemma 4 31B — 18 GB RAM, best quality

**LM Studio** — Any GGUF model loaded in LM Studio
- Qwen 3.6 35B, Qwen 3.5 9B, Gemma 4 31B, Llama 3.3 70B

**Ollama** — Any Ollama model
- Llama 3.3 70B, Qwen 3 14B, custom models

---

## Agent Teams

Spawn 133+ specialized sub-agents that work in parallel on complex tasks:

| Command | Description |
|---------|-------------|
| Check Status | View all available agents |
| Spawn | Launch a team for a task |
| Delegate | Route to a specific agent type |

**Preset agents:** researcher, coder, security-engineer, debugger, solutions-architect, qa-engineer, and 128 more across 17 domains.

---

## Agent Mesh

WebSocket-powered inter-agent messaging:
- Broadcast messages to all connected agents
- Direct agent-to-agent messages
- Mesh status indicator in the mode bar

Requires Agent Mesh API server at `localhost:4000` (auto-attempts connection).

---

## Media Hub (MiniMax)

Generate directly from Gemma Plus via `mmx` CLI:

| Tab | Example prompt |
|-----|---------------|
| 🖼️ Image | A cyberpunk city at night, neon lights, rain |
| 🎤 Speech | Hello from Gemma Plus, voice synthesis test |
| 🎵 Music | Upbeat electronic, driving drums and bass |
| 🎬 Video | A drone flying through redwood trees at sunset |

**Aspect ratios:** 1:1 · 16:9 · 9:16 · 4:3 · 3:2

**Voices:** narrator · casual · sad · english_narrator

---

## Setup Flow

1. **Pick a backend** — MLX (download models), LM Studio (connect), or Ollama (connect)
2. **Choose model** — filtered list updates live when LM Studio/Ollama are detected
3. **Start chatting** — Chat Mode (general AI) or Build Mode (coding agent)

---

## How to Run

```bash
# Development
cd /tmp/gemma-plus
npm install
npm run dev        # hot-reload dev server + Electron

# Production build
npm run build      # electron-vite build (TypeScript → JS)

# Package installers
npm run dist
# Output:
#   dist/gemma-plus-0.1.0.dmg           (macOS arm64 + x64)
#   dist/gemma-plus_0.1.0_amd64.deb    (Linux)
#   dist/Gemma Plus Setup.exe           (Windows NSIS)
#   dist/gemma-plus_0.1.0_amd64.AppImage (Linux AppImage)
```

**On macOS:** open `dist/gemma-plus-0.1.0.dmg` and drag Gemma Plus to Applications.

**On Windows:** run `dist/Gemma Plus Setup.exe`.

**On Linux (deb):** `sudo dpkg -i dist/gemma-plus_0.1.0_amd64.deb`

**On Linux (AppImage):** `chmod +x dist/gemma-plus_0.1.0_amd64.AppImage && ./dist/gemma-plus_0.1.0_amd64.AppImage`

---

## Workspace Tools

| Tool | Description |
|------|-------------|
| `write_file` | Create or overwrite a file |
| `read_file` | Read a file from the workspace |
| `edit_file` | Replace text in an existing file |
| `delete_file` | Delete a file or directory |
| `list_files` | List all files in workspace |
| `run_bash` | Run a bash command in workspace |
| `web_search` | DuckDuckGo search |
| `fetch_url` | Fetch a web page |
| `calc` | Evaluate numeric expressions |
| `open_preview` | Reveal the Canvas preview |

---

## Architecture

```
┌─────────────────────────────────────┐
│         Electron (Renderer)           │
│   React UI — Setup · Chat · Teams ·  │
│   Media Hub                         │
└──────────────┬──────────────────────┘
               │ IPC
┌─────────────▼───────────────────────┐
│         Electron (Main Process)      │
│  Provider router (MLX/LM Studio/   │
│  Ollama) · Agent Teams · Agent Mesh │
│  mmx bridge · Workspace server      │
└────────────────────────────────────┘
```

---

## License

MIT — See [LICENSE](LICENSE)
