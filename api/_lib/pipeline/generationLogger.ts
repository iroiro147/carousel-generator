// ─── Generation Logger ───────────────────────────────────────────────────────
// Fire-and-forget logging to Supabase. Never crashes the response.

import { getServerSupabase } from '../supabase.js'

interface LogEntry {
  styleId: string
  angle: string
  brief: Record<string, unknown>
  visualDecisionXml: string
  stage2Prompt: string
  provider: string
  durationMs: number
}

/**
 * Log a generation to Supabase. Silent on failure.
 */
export async function logGeneration(entry: LogEntry): Promise<void> {
  const supabase = getServerSupabase()
  if (!supabase) return // Supabase not configured — skip silently

  const { error } = await supabase.from('generation_logs').insert({
    style_id: entry.styleId,
    angle: entry.angle,
    brief_topic: (entry.brief.topic as string) ?? '',
    visual_decision_xml: entry.visualDecisionXml,
    stage2_prompt: entry.stage2Prompt,
    provider: entry.provider,
    duration_ms: entry.durationMs,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.warn(`[generationLogger] Insert failed: ${error.message}`)
  }
}
