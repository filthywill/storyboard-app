-- Investigation Query: Check GoogleTest project data
-- Run this in Supabase SQL Editor to see what data is stored

-- 1. Check project metadata
SELECT 
  id,
  name,
  user_id,
  created_at,
  updated_at
FROM projects
WHERE name = 'GoogleTest' OR id = 'df44143d-75d5-446c-92b1-f044266fa3bb';

-- 2. Check project_data table for this project
SELECT 
  project_id,
  jsonb_array_length(pages) as page_count,
  jsonb_object_keys(shots) as shot_keys,
  jsonb_array_length(shot_order) as shot_count,
  project_settings->>'projectName' as stored_project_name,
  updated_at
FROM project_data
WHERE project_id = 'df44143d-75d5-446c-92b1-f044266fa3bb';

-- 3. Check if there are any other projects with data for comparison
SELECT 
  p.id,
  p.name,
  jsonb_array_length(pd.pages) as page_count,
  cardinality(pd.shot_order) as shot_count,
  pd.project_settings->>'projectName' as stored_project_name,
  pd.updated_at
FROM projects p
LEFT JOIN project_data pd ON p.id = pd.project_id
WHERE p.user_id = (SELECT user_id FROM projects WHERE name = 'GoogleTest' LIMIT 1)
ORDER BY pd.updated_at DESC;

-- 4. Check project_images to see if images exist
SELECT 
  project_id,
  COUNT(*) as image_count
FROM project_images
WHERE project_id = 'df44143d-75d5-446c-92b1-f044266fa3bb'
GROUP BY project_id;

