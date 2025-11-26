# Supabase Migration Instructions

## Manual Migration Required

Due to MCP tool limitations, please run this migration manually in your Supabase SQL Editor:

### 1. Navigate to Supabase Dashboard
- Project: `storyboard-app` (dckjzivtrhzdwsooinln)
- Go to: SQL Editor

### 2. Run This Migration:

```sql
-- Migration: Create user_storyboard_themes table
-- Purpose: Store user-created custom storyboard themes
-- Date: December 2024

-- Create the user_storyboard_themes table
CREATE TABLE IF NOT EXISTS user_storyboard_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

### 3. Verify Table Creation

After running the migration, verify with:

```sql
-- Check table exists
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_storyboard_themes';

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_storyboard_themes';

-- Check policies
SELECT policyname, tablename FROM pg_policies WHERE tablename = 'user_storyboard_themes';
```

### Expected Results:
- Table: `user_storyboard_themes` created
- RLS: Enabled (`rowsecurity = true`)
- Policies: 4 policies (view, create, update, delete)

---

**Status:** Migration pending manual execution  
**Required before:** Phase 3 UI testing (theme saving)




