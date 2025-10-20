-- Create academy_custom_colors table for storing custom colors at academy level
-- This allows all managers and teachers in an academy to share custom colors

CREATE TABLE IF NOT EXISTS academy_custom_colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT unique_academy_color UNIQUE (academy_id, color)
);

-- Create index for faster lookups by academy_id
CREATE INDEX IF NOT EXISTS idx_academy_custom_colors_academy_id
  ON academy_custom_colors(academy_id);

-- Add comment for documentation
COMMENT ON TABLE academy_custom_colors IS 'Stores custom colors defined at academy level, shared across all managers and teachers';
COMMENT ON COLUMN academy_custom_colors.color IS 'Hex color code (e.g., #FF5733)';
COMMENT ON COLUMN academy_custom_colors.created_by IS 'User who first used this color in a classroom';
