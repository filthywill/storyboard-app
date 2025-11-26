-- Migration: Create user_storyboard_themes table
-- Purpose: Store user-created custom storyboard themes
-- Date: December 2024

-- Create the user_storyboard_themes table
CREATE TABLE IF NOT EXISTS user_storyboard_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  theme_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate theme names for the same user
  UNIQUE(user_id, name)
);

-- Create index for fast user theme lookups
CREATE INDEX IF NOT EXISTS idx_user_themes_user_id ON user_storyboard_themes(user_id);

-- Enable Row Level Security
ALTER TABLE user_storyboard_themes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own themes
CREATE POLICY "Users can view their own themes"
  ON user_storyboard_themes
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can create their own themes
CREATE POLICY "Users can create their own themes"
  ON user_storyboard_themes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own themes
CREATE POLICY "Users can update their own themes"
  ON user_storyboard_themes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own themes
CREATE POLICY "Users can delete their own themes"
  ON user_storyboard_themes
  FOR DELETE
  USING (auth.uid() = user_id);




