import { z } from 'zod';

const lowercaseHyphenatedSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Expected a lowercase hyphenated value');

export function buildImageFileName(title: string) {
  const value = title
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return lowercaseHyphenatedSchema.parse(value || 'featured-image');
}

export function validateAltText(value: string) {
  const text = value.trim();
  if (!text) {
    return { valid: false, reason: 'Alt text is required before assigning a featured image.' };
  }

  if (text.length < 12) {
    return { valid: false, reason: 'Alt text is too short to be useful.' };
  }

  return { valid: true, reason: '' };
}

export function hasValidAltText(value: string) {
  return validateAltText(value).valid;
}
