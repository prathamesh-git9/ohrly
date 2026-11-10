import type { Session } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import type { SyncedState } from '../domain/merge';
import { useStore } from '../state/store';
import { cloudEnabled, currentSession, onAuthChange, push, reconcile } from './cloud';

export type SyncStatus = 'off' | 'signed-out' | 'syncing' | 'synced' | 'error';

function snapshot(): SyncedState {
  const s = useStore.getState();
  return {
    name: s.name,
    courseId: s.courseId,
    dailyGoal: s.dailyGoal,
    xp: s.xp,
    xpByDay: s.xpByDay,
    gems: s.gems,
    perfectLessons: s.perfectLessons,
    streak: s.streak,
    courses: s.courses,
    seenAchievements: s.seenAchievements,
  };
}

let shared: { session: Session | null; status: SyncStatus } = {
  session: null,
  status: cloudEnabled ? 'signed-out' : 'off',
};
const listeners = new Set<() => void>();
function publish(next: Partial<typeof shared>) {
  shared = { ...shared, ...next };
  listeners.forEach((l) => l());
}

/** Mounted once, in App: signs in from a stored session, merges, then saves every change. */
export function useCloudSyncEngine(): void {
  const userId = useRef<string | null>(null);
  useEffect(() => {
    if (!cloudEnabled) return;
    let timer: number | undefined;

    const begin = async (session: Session | null) => {
      publish({ session });
      if (!session) {
        userId.current = null;
        publish({ status: 'signed-out' });
        return;
      }
      if (userId.current === session.user.id) return;
      userId.current = session.user.id;
      publish({ status: 'syncing' });
      try {
        const merged = await reconcile(session.user.id, snapshot());
        useStore.setState({ ...merged, onboarded: true });
        publish({ status: 'synced' });
      } catch {
        publish({ status: 'error' });
      }
    };

    void currentSession().then(begin);
    const stopAuth = onAuthChange((session) => void begin(session));
    // Save a few seconds after the last change, so a lesson's many updates make one request.
    const stopStore = useStore.subscribe(() => {
      if (!userId.current) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const id = userId.current;
        if (!id) return;
        publish({ status: 'syncing' });
        push(id, snapshot()).then(
          () => publish({ status: 'synced' }),
          () => publish({ status: 'error' }),
        );
      }, 3000);
    });
    return () => {
      stopAuth();
      stopStore();
      window.clearTimeout(timer);
    };
  }, []);
}

/** The current account and sync state, for any screen. */
export function useCloud() {
  const [state, setState] = useState(shared);
  useEffect(() => {
    const l = () => setState(shared);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return state;
}
