import { describe, expect, it } from 'vitest';
import { cleanName } from '../../src/domain/greeting';

describe('greeting', () => {
  it('cleans names: trims, collapses spaces, caps the length', () => {
    expect(cleanName('  Anna   Maria ')).toBe('Anna Maria');
    expect(cleanName('x'.repeat(50))).toHaveLength(30);
  });
});
