import { EventEmitter } from 'node:events'
import type { Chain, TokenAnalysis } from './types.js'

export type PipelineEvents = {
  'convergence:detected': { tokenAddress: string; chain: Chain; strength: number }
  'research:complete': { tokenAddress: string; analysis: TokenAnalysis }
  'scan:qualified': { tokenAddress: string; chain: Chain }
}

type EventMap = Record<string, unknown>

class TypedEventEmitter<T extends EventMap> extends EventEmitter {
  override on<K extends keyof T & string>(event: K, listener: (payload: T[K]) => void): this {
    return super.on(event, listener as (...args: unknown[]) => void)
  }

  override emit<K extends keyof T & string>(event: K, payload: T[K]): boolean {
    return super.emit(event, payload)
  }

  override off<K extends keyof T & string>(event: K, listener: (payload: T[K]) => void): this {
    return super.off(event, listener as (...args: unknown[]) => void)
  }
}

export const pipelineEvents = new TypedEventEmitter<PipelineEvents>()
