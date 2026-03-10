import { supabase } from './supabase'

export interface ProjectRecord {
  id: string
  name: string
  brief: Record<string, unknown>
  theme_id: string
  selected_variant: Record<string, unknown> | null
  slides: Record<string, unknown>[] | null
  carousel_data: Record<string, unknown> | null
  status: string
  created_at: string
  updated_at: string
}

export async function saveProject(
  brief: Record<string, unknown>,
  themeId: string,
  slides?: Record<string, unknown>[] | null,
  carouselData?: Record<string, unknown> | null,
  projectId?: string,
): Promise<ProjectRecord | null> {
  if (!supabase) return null

  const data = {
    brief,
    theme_id: themeId,
    slides: slides ?? null,
    carousel_data: carouselData ?? null,
    name: (brief.topic as string) ?? 'Untitled Carousel',
    status: slides ? 'complete' : 'draft',
  }

  if (projectId) {
    const { data: updated, error } = await supabase
      .from('projects')
      .update(data)
      .eq('id', projectId)
      .select()
      .single()

    if (error) throw error
    return updated as ProjectRecord
  }

  const { data: created, error } = await supabase
    .from('projects')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return created as ProjectRecord
}

export async function loadProject(projectId: string): Promise<ProjectRecord | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error) throw error
  return data as ProjectRecord
}

export async function listProjects(): Promise<ProjectRecord[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ProjectRecord[]
}

export async function createSharedPost(projectId: string): Promise<string | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('shared_posts')
    .insert({ project_id: projectId })
    .select('share_token')
    .single()

  if (error) throw error
  return data?.share_token ?? null
}
