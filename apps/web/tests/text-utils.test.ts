import { describe, expect, it } from 'vitest';

import { formatTagName, formatTaxonomyName, taxonomyIdentityKey } from '@/lib/text-utils';

describe('text utilities', () => {
  it('formats WordPress tags as no-space PascalCase names', () => {
    expect(formatTagName('#technology strategy')).toBe('TechnologyStrategy');
    expect(formatTagName('software engineering')).toBe('SoftwareEngineering');
    expect(formatTagName('#AIEngineering')).toBe('AIEngineering');
    expect(formatTagName('notLikeThis')).toBe('NotLikeThis');
    expect(formatTagName('#csiro')).toBe('CSIRO');
    expect(formatTagName('#mphil')).toBe('MPhil');
  });

  it('decodes taxonomy labels and builds stable identity keys', () => {
    expect(formatTaxonomyName('Architecture &amp; System Integration')).toBe(
      'Architecture & System Integration'
    );
    expect(taxonomyIdentityKey('#Technology Strategy')).toBe('technologystrategy');
    expect(taxonomyIdentityKey('#TechnologyStrategy')).toBe('technologystrategy');
  });
});
