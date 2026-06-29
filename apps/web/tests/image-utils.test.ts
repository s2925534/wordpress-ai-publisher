import { describe, expect, it } from 'vitest';

import { buildImageFileName, validateAltText } from '@/lib/image-utils';

describe('image utils', () => {
  it('builds a lowercase hyphenated file name', () => {
    expect(buildImageFileName('Practical WordPress Publishing')).toBe('practical-wordpress-publishing');
  });

  it('validates alt text before image assignment', () => {
    expect(validateAltText('')).toMatchObject({ valid: false });
    expect(validateAltText('Featured image for WordPress publishing workflow.')).toMatchObject({ valid: true });
  });
});
