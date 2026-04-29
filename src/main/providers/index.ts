import type { ModelProvider } from './types'
import { mlxProvider } from './mlx-provider'
import { lmstudioProvider } from './lmstudio-provider'
import { ollamaProvider } from './ollama-provider'
import { AVAILABLE_MODELS, DEFAULT_MODEL, type ModelInfo } from '../../shared/types'

export { mlxProvider, lmstudioProvider, ollamaProvider }
export type { ModelProvider } from './types'
export { AVAILABLE_MODELS, DEFAULT_MODEL }
export type { ModelInfo } from '../../shared/types'

export const ALL_PROVIDERS: ModelProvider[] = [
  mlxProvider,
  lmstudioProvider,
  ollamaProvider
]

/**
 * Get the provider for a given model name.
 * Falls back to MLX if no provider matches.
 */
export function getProviderForModel(model: string): ModelProvider {
  const info = AVAILABLE_MODELS.find((m) => m.name === model)
  if (!info) return mlxProvider

  switch (info.provider) {
    case 'lmstudio': return lmstudioProvider
    case 'ollama': return ollamaProvider
    default: return mlxProvider
  }
}

/**
 * Get all models for a specific provider.
 */
export function getModelsForProvider(providerType: 'mlx' | 'lmstudio' | 'ollama'): ModelInfo[] {
  return AVAILABLE_MODELS.filter((m) => m.provider === providerType)
}

/**
 * Check which providers are available (LM Studio / Ollama running, MLX installed).
 */
export async function checkProviderAvailability(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = { mlx: false, lmstudio: false, ollama: false }

  // Check MLX
  try {
    const { locateMLX } = await import('./mlx-provider')
    const mlx = locateMLX()
    results.mlx = mlx !== null && mlx.installed
  } catch { results.mlx = false }

  // Check LM Studio
  try {
    const lmStatus = await lmstudioProvider.status()
    results.lmstudio = lmStatus.available
  } catch { results.lmstudio = false }

  // Check Ollama
  try {
    const ollStatus = await ollamaProvider.status()
    results.ollama = ollStatus.available
  } catch { results.ollama = false }

  return results
}
