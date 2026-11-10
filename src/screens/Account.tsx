import { CheckCircle2, Cloud, CloudOff, LogOut, RefreshCw } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Fenn } from '../components/Fenn';
import { Btn, Modal } from '../components/ui';
import type { Translate } from '../i18n';
import { navigate } from '../router';
import { cloudEnabled, deleteAccount, isNetworkError, resetPassword, signIn, signOut, signUp } from '../sync/cloud';
import { useCloud } from '../sync/useCloudSync';

export function Account({ t }: { t: Translate }) {
  const { session, status } = useCloud();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!cloudEnabled) {
    return (
      <div className="page account-page">
        <h1 className="page-title">{t('account')}</h1>
        <div className="empty-state">
          <Fenn mood="think" size={110} />
          <p>{t('accountsOff')}</p>
        </div>
      </div>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (error) {
      // The server's own messages ("Invalid login credentials") are clear; a dropped connection is not.
      setMessage({
        kind: 'error',
        text: isNetworkError(error) ? t('networkError') : (error as Error).message || t('authError'),
      });
    } finally {
      setBusy(false);
    }
  };

  if (session) {
    const StatusIcon = status === 'error' ? CloudOff : status === 'syncing' ? RefreshCw : CheckCircle2;
    return (
      <div className="page account-page">
        <h1 className="page-title">{t('account')}</h1>
        <section className="account-card">
          <Cloud size={32} />
          <p>{t('signedInAs', { email: session.user.email ?? '' })}</p>
          <p className={`sync-status is-${status}`}>
            <StatusIcon size={18} />{' '}
            {status === 'error' ? t('syncFailed') : status === 'syncing' ? t('syncing') : t('synced')}
          </p>
          <p className="muted">{t('syncOn')}</p>
          <Btn variant="secondary" onClick={() => run(signOut)} disabled={busy}>
            <LogOut size={18} /> {t('signOut')}
          </Btn>
          <button type="button" className="danger-link" onClick={() => setConfirmDelete(true)}>
            {t('deleteAccount')}
          </button>
        </section>
        {message && <p className={`form-msg is-${message.kind}`} role="alert">{message.text}</p>}
        <AnimatePresence>
          {confirmDelete && (
            <Modal onClose={() => setConfirmDelete(false)}>
              <h3>{t('deleteTitle')}</h3>
              <p>{t('deleteBody')}</p>
              <Btn block variant="bad" disabled={busy} onClick={() => run(async () => {
                await deleteAccount();
                setConfirmDelete(false);
                navigate('/');
              })}>
                {t('deleteAccount')}
              </Btn>
              <Btn block variant="ghost" onClick={() => setConfirmDelete(false)}>{t('notNow')}</Btn>
            </Modal>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (mode === 'signup') {
        const { needsConfirmation } = await signUp(email.trim(), password);
        if (needsConfirmation) {
          setMessage({ kind: 'info', text: t('confirmSent') });
          setMode('login');
        }
      } else {
        await signIn(email.trim(), password);
      }
    });
  };

  return (
    <div className="page account-page">
      <h1 className="page-title">{mode === 'signup' ? t('signUp') : t('signIn')}</h1>
      <p className="muted">{t('accountWhy')}</p>
      <form className="account-form" onSubmit={submit}>
        <label>
          <span>{t('email')}</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          <span>{t('password')}</span>
          <input
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === 'signup' && <small>{t('passwordHint')}</small>}
        </label>
        {mode === 'signup' && <p className="age-note">{t('ageNote')} <a href="#/legal">{t('legalLink')}</a></p>}
        <Btn block type="submit" disabled={busy}>
          {mode === 'signup' ? t('createAccount') : t('signIn')}
        </Btn>
      </form>
      {message && <p className={`form-msg is-${message.kind}`} role="alert">{message.text}</p>}
      <div className="account-switch">
        <button type="button" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setMessage(null); }}>
          {mode === 'signup' ? t('haveAccount') : t('noAccount')}
        </button>
        {mode === 'login' && (
          <button
            type="button"
            onClick={() => {
              if (!email.trim()) return setMessage({ kind: 'error', text: t('email') });
              void run(async () => {
                await resetPassword(email.trim());
                setMessage({ kind: 'info', text: t('resetSent') });
              });
            }}
          >
            {t('forgot')}
          </button>
        )}
      </div>
    </div>
  );
}
