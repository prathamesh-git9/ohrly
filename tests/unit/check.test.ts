import { describe, expect, it } from 'vitest';
import { checkAnswer, normalize, speechScore, tokenize } from '../../src/domain/check';

describe('checkAnswer', () => {
  it('ignores case and punctuation', () => {
    expect(checkAnswer('ich bin müde', ['Ich bin müde.'], 'de').result).toBe('correct');
  });

  it('accepts listed alternatives', () => {
    expect(checkAnswer('Hi', ['Hello', 'Hi'], 'en').result).toBe('correct');
  });

  it('treats English contractions as the full form', () => {
    expect(checkAnswer("I'm tired", ['I am tired.'], 'en').result).toBe('correct');
    expect(checkAnswer('I am tired', ["I'm tired."], 'en').result).toBe('correct');
    expect(checkAnswer('She doesn’t know', ['She does not know.'], 'en').result).toBe('correct');
  });

  it('flags a missing umlaut as a near miss, not a mistake', () => {
    const v = checkAnswer('ich bin muede', ['Ich bin müde.'], 'de');
    expect(v).toMatchObject({ result: 'typo', reason: 'umlaut', expected: 'Ich bin müde.' });
    expect(checkAnswer('die strasse', ['die Straße'], 'de').result).toBe('typo');
  });

  it('forgives a typo in a long content word', () => {
    expect(checkAnswer('das Fruhstück', ['das Frühstück'], 'de').result).toBe('typo');
    expect(checkAnswer('I like my hosue', ['I like my house.'], 'en').result).toBe('typo');
  });

  it('never forgives wrong grammar words, however close', () => {
    for (const [given, expected] of [
      ['Ich sehe dem Hund', 'Ich sehe den Hund'],
      ['der Hund', 'die Hund'],
      ['Er hat einem Hund', 'Er hat einen Hund'],
      ['ich bist müde', 'ich bin müde'],
    ]) {
      expect(checkAnswer(given!, [expected!], 'de').result).toBe('wrong');
    }
    expect(checkAnswer('He have a dog', ['He has a dog'], 'en').result).toBe('wrong');
    expect(checkAnswer('this dog', ['that dog'], 'en').result).toBe('wrong');
  });

  it('never treats a different real word as a typo', () => {
    const known = new Set(['hause', 'haus', 'maus']);
    expect(checkAnswer('die Maus', ['das Haus'], 'de', { knownTokens: known }).result).toBe('wrong');
    expect(checkAnswer('Hause', ['Haus'], 'de', { knownTokens: known }).result).toBe('wrong');
  });

  it('does not treat short words as typos', () => {
    expect(checkAnswer('Hut', ['gut'], 'de').result).toBe('wrong');
  });

  it('rejects empty and missing-word answers', () => {
    expect(checkAnswer('   ', ['Hallo'], 'de').result).toBe('wrong');
    expect(checkAnswer('Ich bin', ['Ich bin müde'], 'de').result).toBe('wrong');
  });

  it('allows no typos on word-bank answers', () => {
    expect(checkAnswer('Frühstuck', ['Frühstück'], 'de', { allowTypos: false }).result).toBe('wrong');
  });

  it('reports the primary answer when wrong', () => {
    expect(checkAnswer('nope', ['Hello', 'Hi'], 'en')).toEqual({ result: 'wrong', expected: 'Hello' });
  });
});

describe('normalize', () => {
  it('collapses German quotes, dashes and whitespace', () => {
    expect(normalize('„Guten   Morgen“ – Anna!', 'de')).toBe('guten morgen anna');
  });
});

describe('tokenize', () => {
  it('strips outer punctuation but keeps apostrophes inside', () => {
    expect(tokenize("Hallo, wie geht's?")).toEqual(['Hallo', 'wie', "geht's"]);
  });
});

describe('speechScore', () => {
  it('scores in-order hits', () => {
    expect(speechScore('ich bin müde', 'Ich bin müde.', 'de')).toBe(1);
    expect(speechScore('ich bin', 'Ich bin müde.', 'de')).toBeCloseTo(2 / 3);
    expect(speechScore('', 'Ich bin müde.', 'de')).toBe(0);
  });
});
