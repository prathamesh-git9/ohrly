import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { mergeState, type SyncedState } from '../domain/merge';

/**
 * Optional accounts. Without the two build-time settings the app works exactly as before, entirely
 * in the browser. With them, a signed-in learner's progress is kept in one row of `progress`, which
 * row-level security lets only its owner read or write.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudEnabled = !!(url && key);

let client: SupabaseClient | null = null;
export function cloud(): SupabaseClient | null {
  if (!cloudEnabled) return null;
  client ??= createClient(url!, key!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'ohrly-auth' },
  });
  return client;
}

export async function currentSession(): Promise<Session | null> {
  const c = cloud();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session;
}

export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const c = cloud();
  if (!c) return () => {};
  const { data } = c.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/** Where confirmation emails send people back to: wherever the app is being served from. */
function homeUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

export async function signUp(email: string, password: string) {
  const c = cloud();
  if (!c) throw new Error('Accounts are not set up');
  const { data, error } = await c.auth.signUp({ email, password, options: { emailRedirectTo: homeUrl() } });
  if (error) throw error;
  // With email confirmation on, there is a user but no session until the link is clicked.
  return { needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string) {
  const c = cloud();
  if (!c) throw new Error('Accounts are not set up');
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const c = cloud();
  if (!c) throw new Error('Accounts are not set up');
  const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: homeUrl() });
  if (error) throw error;
}

export async function signOut() {
  await cloud()?.auth.signOut();
}

/** Deletes the account and its saved progress, through a database function only the owner can call. */
export async function deleteAccount() {
  const c = cloud();
  if (!c) return;
  const { error } = await c.rpc('delete_my_account');
  if (error) throw error;
  await c.auth.signOut();
}

export async function pull(userId: string): Promise<SyncedState | null> {
  const c = cloud();
  if (!c) return null;
  const { data, error } = await c.from('progress').select('data').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return (data?.data as SyncedState | undefined) ?? null;
}

export async function push(userId: string, state: SyncedState): Promise<void> {
  const c = cloud();
  if (!c) return;
  const { error } = await c
    .from('progress')
    .upsert({ user_id: userId, data: state, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Signs in on a new device: what is there and what is here are combined, never overwritten. */
export async function reconcile(userId: string, local: SyncedState): Promise<SyncedState> {
  const remote = await pull(userId);
  const merged = remote ? mergeState(local, remote) : local;
  await push(userId, merged);
  return merged;
}
