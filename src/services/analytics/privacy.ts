import type { AnalyticsProperties, AnalyticsPropertyValue } from './AnalyticsAdapter';

const BLOCKED_PROPERTY_KEYS = new Set([
  'email',
  'filename',
  'filenames',
  'file_name',
  'file_names',
  'url',
  'urls',
  'caption',
  'captions',
  'dialogue',
  'project_name',
  'project_json',
  'project_data',
  'storyboard_json',
  'storyboard_text',
  'theme_json',
  'theme_data',
  'shot_notes',
  'shot_note',
  'notes',
  'note',
  'image_content',
  'image_contents',
  'uploaded_image',
  'user_generated_content',
  'ugc',
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isBlockedKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  if (BLOCKED_PROPERTY_KEYS.has(normalized)) {
    return true;
  }

  return (
    normalized.includes('email') ||
    normalized.includes('filename') ||
    normalized.includes('file_name') ||
    normalized.includes('project_json') ||
    normalized.includes('shot_note') ||
    normalized.includes('storyboard_text') ||
    normalized.includes('image_content')
  );
}

function isBlockedValue(value: AnalyticsPropertyValue): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (EMAIL_PATTERN.test(trimmed)) {
    return true;
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return true;
  }

  return false;
}

export function sanitizeAnalyticsProperties(
  properties?: AnalyticsProperties,
): AnalyticsProperties | undefined {
  if (!properties) {
    return undefined;
  }

  const sanitized: AnalyticsProperties = {};

  for (const [key, value] of Object.entries(properties)) {
    if (isBlockedKey(key) || isBlockedValue(value)) {
      continue;
    }
    sanitized[key] = value;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}
