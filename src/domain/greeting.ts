/**
 * How Ohrly greets a learner by name. One name gets a personal greeting; it is matched by a hash
 * and the words are stored encoded, so they do not show up in a search of the public source.
 */
function fnv1a(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Trims, collapses spaces, keeps it short. Names are only ever shown back to their owner. */
export function cleanName(raw: string): string {
  return raw.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 30);
}

const SPECIAL = new Map<number, string>([[0x14d0dcfe, 'V2VsY29tZSBTdW5kYXIgRHIgamk=']]);

/** The personal greeting for this name, if it has one. */
export function specialGreeting(name: string): string | null {
  const key = fnv1a(cleanName(name).toLowerCase());
  const encoded = SPECIAL.get(key);
  return encoded ? decodeURIComponent(escape(atob(encoded))) : null;
}

export { fnv1a as nameHash };
