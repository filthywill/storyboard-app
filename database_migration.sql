-- Add shot_order column to project_data table
ALTER TABLE project_data 
ADD COLUMN IF NOT EXISTS shot_order jsonb DEFAULT '[]'::jsonb;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_project_data_shot_order 
ON project_data USING gin (shot_order);

-- Update existing records with empty array (since we're starting fresh, this is optional)
UPDATE project_data 
SET shot_order = '[]'::jsonb 
WHERE shot_order IS NULL;
