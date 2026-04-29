import { spawn } from 'child_process'
import { join } from 'path'
import { lookup } from 'dns'
import { promisify } from 'util'

const pLookup = promisify(lookup)

const AGENT_TEAMS_DIR = '/tmp/agent-teams-local/agent-swarm-system'
const SWARM_SCRIPT = join(AGENT_TEAMS_DIR, 'swarm-orchestrator.py')

export interface AgentTeamsStatus {
  installed: boolean
  agents: number
  running: boolean
}

export async function getAgentTeamsStatus(): Promise<AgentTeamsStatus> {
  try {
    const { existsSync } = await import('fs')
    const agentRegistry = join(AGENT_TEAMS_DIR, 'agent-registry.json')
    if (!existsSync(agentRegistry)) {
      return { installed: false, agents: 0, running: false }
    }
    const { readFileSync } = await import('fs')
    const data = JSON.parse(readFileSync(agentRegistry, 'utf-8'))
    const agents = Array.isArray(data) ? data.length : (data.agents?.length ?? 0)
    return { installed: true, agents, running: false }
  } catch {
    return { installed: false, agents: 0, running: false }
  }
}

export function runAgentTeamsCommand(
  action: 'spawn' | 'delegate' | 'status',
  task: string,
  agent?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [SWARM_SCRIPT]
    if (action === 'spawn') {
      args.push('run', '--task', task, '--format', 'json')
    } else if (action === 'delegate' && agent) {
      args.push('delegate', '--task', task, '--agent', agent, '--format', 'json')
    } else {
      args.push('status', '--format', 'json')
    }

    const proc = spawn('python3', args, {
      cwd: AGENT_TEAMS_DIR,
      timeout: 120_000
    })

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', (d) => { stdout += d.toString() })
    proc.stderr?.on('data', (d) => { stderr += d.toString() })

    proc.on('error', (e) => reject(new Error(`spawn error: ${e.message}`)))
    proc.on('exit', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout.trim())
          resolve(JSON.stringify(result, null, 2))
        } catch {
          resolve(stdout.trim() || 'Done.')
        }
      } else {
        reject(new Error(stderr.trim() || `Exited with code ${code}`))
      }
    })

    setTimeout(() => {
      proc.kill()
      reject(new Error('Agent Teams timed out after 120s'))
    }, 120_000)
  })
}
