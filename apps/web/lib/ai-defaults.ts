export const DEFAULT_AI_PROVIDER = 'openai';
export const DEFAULT_OPENAI_TEXT_MODEL = 'gpt-5.5';
export const DEFAULT_OPENAI_IMAGE_MODEL = 'gpt-image-2';

export const TEXT_MODEL_OPTIONS = [
  { value: DEFAULT_OPENAI_TEXT_MODEL, label: 'GPT-5.5 (default)' },
  { value: 'gpt-5.4', label: 'GPT-5.4 (lower cost)' },
  { value: 'gpt-5.4-mini', label: 'GPT-5.4 mini (budget)' },
  { value: 'gpt-5.4-nano', label: 'GPT-5.4 nano (lowest cost)' }
] as const;

export const IMAGE_MODEL_OPTIONS = [
  { value: DEFAULT_OPENAI_IMAGE_MODEL, label: 'gpt-image-2 (default)' },
  { value: 'gpt-image-1.5', label: 'gpt-image-1.5 (fallback)' },
  { value: 'gpt-image-1', label: 'gpt-image-1 (legacy fallback)' },
  { value: 'gpt-image-1-mini', label: 'gpt-image-1-mini (legacy fallback)' }
] as const;
