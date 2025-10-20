-- Create session_templates table for storing personal session templates
-- Users can save session configurations as templates and reuse them when creating new sessions

CREATE TABLE IF NOT EXISTS session_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_data JSONB NOT NULL,
  include_assignments BOOLEAN DEFAULT FALSE,
  assignments_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_session_templates_user_id
  ON session_templates(user_id);

-- Enable Row Level Security
ALTER TABLE session_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see and manage their own templates
CREATE POLICY session_templates_user_policy ON session_templates
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE session_templates IS 'Stores personal session templates for users to save and reuse session configurations';
COMMENT ON COLUMN session_templates.name IS 'User-defined name for the template';
COMMENT ON COLUMN session_templates.template_data IS 'JSONB object containing session configuration (title, description, date, time, duration, classroom, color, etc.)';
COMMENT ON COLUMN session_templates.include_assignments IS 'Whether to include assignments when applying this template';
COMMENT ON COLUMN session_templates.assignments_data IS 'JSONB array of assignment data if include_assignments is true';
