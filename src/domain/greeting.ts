/** Trims, collapses spaces, keeps it short. Names are only ever shown back to their owner. */
export function cleanName(raw: string): string {
  return raw.normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 30);
}
