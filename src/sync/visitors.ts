import { cloud } from './cloud';

/**
 * Lets Ohrly's creator see who is learning: the name a visitor enters, their course and the date.
 * Visitors are told this where they type their name, and can use a nickname or remove it later.
 * The table accepts inserts only; nobody can read it through the app, only the owner in Supabase.
 */
const DEVICE_KEY = 'ohrly-device';
const SENT_KEY = 'ohrly-visitor-sent';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** A random id for this browser, known only to it. It is what lets this visitor remove their name. */
function deviceId(): string {
  const s = storage();
  let id = s?.getItem(DEVICE_KEY) ?? null;
  if (!id) {
    id = crypto.randomUUID();
    s?.setItem(DEVICE_KEY, id);
  }
  return id;
}

/** Sends the name once per name per browser. Failures are silent: this must never get in the way. */
export async function registerVisitor(name: string, course: string | null): Promise<void> {
  const c = cloud();
  const s = storage();
  if (!c || !name) return;
  // Automated browsers (test runs, crawlers) are not visitors. Tests that check this flow opt in.
  const optIn = (window as unknown as { __ohrlyCountAutomation?: boolean }).__ohrlyCountAutomation;
  if (navigator.webdriver && !optIn) return;
  const marker = `${name}|${course ?? ''}`;
  if (s?.getItem(SENT_KEY) === marker) return;
  // A plain insert: "ignore duplicates" would need read access, which the public deliberately lacks.
  const { error } = await c.from('visitors').insert({ device_id: deviceId(), name, course });
  // 23505: this browser already sent this name, which is the outcome wanted.
  if (!error || error.code === '23505') s?.setItem(SENT_KEY, marker);
}

/** Removes every name this browser has sent. */
export async function forgetVisitor(): Promise<void> {
  const c = cloud();
  if (!c) return;
  const { error } = await c.rpc('forget_visitor', { p_device: deviceId() });
  if (error) throw error;
  storage()?.removeItem(SENT_KEY);
}
