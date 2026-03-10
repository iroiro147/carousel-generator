-- Carousel Generator Schema
-- Run this in Supabase SQL Editor

-- Create schema
CREATE SCHEMA IF NOT EXISTS carousel_generator;

-- Projects table (main persistence)
CREATE TABLE carousel_generator.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Carousel',
  brief JSONB NOT NULL,
  theme_id TEXT NOT NULL,
  selected_variant JSONB,
  slides JSONB,
  carousel_data JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'complete', 'exported')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Carousel history (versioning)
CREATE TABLE carousel_generator.carousel_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES carousel_generator.projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  slides JSONB NOT NULL,
  carousel_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shared posts (public links)
CREATE TABLE carousel_generator.shared_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES carousel_generator.projects(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Image cache (avoid re-generating)
CREATE TABLE carousel_generator.image_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash TEXT NOT NULL,
  theme_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(prompt_hash, theme_id)
);

-- Style references (uploaded brand assets)
CREATE TABLE carousel_generator.style_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Content references (uploaded content for carousel generation)
CREATE TABLE carousel_generator.content_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'blog_post', 'whitepaper', 'notes', 'other')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_projects_user_id ON carousel_generator.projects(user_id);
CREATE INDEX idx_projects_updated_at ON carousel_generator.projects(updated_at DESC);
CREATE INDEX idx_carousel_history_project_id ON carousel_generator.carousel_history(project_id);
CREATE INDEX idx_shared_posts_token ON carousel_generator.shared_posts(share_token);
CREATE INDEX idx_image_cache_hash ON carousel_generator.image_cache(prompt_hash, theme_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION carousel_generator.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON carousel_generator.projects
  FOR EACH ROW EXECUTE FUNCTION carousel_generator.update_updated_at();

-- RLS Policies
ALTER TABLE carousel_generator.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_generator.carousel_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_generator.shared_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_generator.image_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_generator.style_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_generator.content_references ENABLE ROW LEVEL SECURITY;

-- Projects: users can CRUD their own
CREATE POLICY "Users can view own projects"
  ON carousel_generator.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects"
  ON carousel_generator.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON carousel_generator.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON carousel_generator.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Carousel history: users can view/create for their projects
CREATE POLICY "Users can view own carousel history"
  ON carousel_generator.carousel_history FOR SELECT
  USING (project_id IN (SELECT id FROM carousel_generator.projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can create carousel history"
  ON carousel_generator.carousel_history FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM carousel_generator.projects WHERE user_id = auth.uid()));

-- Shared posts: owners manage, anyone reads active shares
CREATE POLICY "Users can manage own shared posts"
  ON carousel_generator.shared_posts FOR ALL
  USING (project_id IN (SELECT id FROM carousel_generator.projects WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view active shared posts"
  ON carousel_generator.shared_posts FOR SELECT
  USING (is_active = true);

-- Image cache: readable by all authenticated users
CREATE POLICY "Authenticated users can read image cache"
  ON carousel_generator.image_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can write image cache"
  ON carousel_generator.image_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Style references: users can CRUD their own
CREATE POLICY "Users can manage own style refs"
  ON carousel_generator.style_references FOR ALL
  USING (auth.uid() = user_id);

-- Content references: users can CRUD their own
CREATE POLICY "Users can manage own content refs"
  ON carousel_generator.content_references FOR ALL
  USING (auth.uid() = user_id);

-- Storage buckets (run separately in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('cg-style-refs', 'cg-style-refs', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('cg-generated', 'cg-generated', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('cg-exports', 'cg-exports', true);
