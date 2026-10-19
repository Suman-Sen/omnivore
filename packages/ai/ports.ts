export type PlanningHorizon = 'day' | 'week' | 'month';
export interface AIProvider {
  readonly execution: 'on_device' | 'local_network' | 'hosted';
  generate(input: { prompt: string; signal: AbortSignal }): AsyncIterable<string>;
}
/** Speech is independent from model inference; capability disclosure must reflect both. */
export interface VoiceCapabilities {
  recognition: 'on_device' | 'hosted' | 'unavailable';
  synthesis: 'on_device' | 'hosted' | 'unavailable';
}
