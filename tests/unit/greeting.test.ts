import { describe, expect, it } from 'vitest';
import { cleanName, specialGreeting } from '../../src/domain/greeting';

// Encoded so the name and message stay out of plain-text searches of the public repo, like the source.
const NAME = atob('UmVzaGFs');
const MESSAGE = atob('V2VsY29tZSBTdW5kYXIgRHIgamk=');

describe('greeting', () => {
  it('gives the one special name its greeting, in any capitalisation and spacing', () => {
    for (const name of [NAME, NAME.toLowerCase(), NAME.toUpperCase(), `  ${NAME}  `]) {
      expect(specialGreeting(name)).toBe(MESSAGE);
    }
  });

  it('gives every other name nothing special', () => {
    for (const name of ['Mara', `${NAME}l`, NAME.slice(0, -1), `${NAME} Kumar`, 'Prathamesh', '']) {
      expect(specialGreeting(name)).toBeNull();
    }
  });

  it('cleans names: trims, collapses spaces, caps the length', () => {
    expect(cleanName('  Anna   Maria ')).toBe('Anna Maria');
    expect(cleanName('x'.repeat(50))).toHaveLength(30);
  });
});
