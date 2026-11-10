import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { sfx } from '../audio/sfx';
import { cleanName, specialGreeting } from '../domain/greeting';
import type { Translate } from '../i18n';
import { useStore } from '../state/store';
import { Fenn } from './Fenn';
import { Btn, Confetti, Modal } from './ui';

/** Greets once per visit, not on every return to the path. */
let greetedThisVisit = false;

/**
 * Greets the learner by name when the app opens, floating over the page so it is seen even after the
 * path scrolls to the current lesson. Learners from before names were asked are asked once. One name
 * gets its own greeting; everyone else sees the usual welcome.
 */
export function Greeting({ t }: { t: Translate }) {
  const name = useStore((s) => s.name);
  const setName = useStore((s) => s.setName);
  const [draft, setDraft] = useState('');
  const [showing, setShowing] = useState(false);
  const special = name ? specialGreeting(name) : null;

  useEffect(() => {
    if (!name || greetedThisVisit) return;
    greetedThisVisit = true;
    setShowing(true);
    if (special) window.setTimeout(() => sfx.complete(), 250);
    const timer = window.setTimeout(() => setShowing(false), special ? 7000 : 3200);
    return () => window.clearTimeout(timer);
  }, [name, special]);

  if (!name) {
    return (
      <Modal>
        <Fenn size={100} mood="happy" />
        <h3>{t('askName')}</h3>
        <p>{t('askNameBody')}</p>
        <form
          className="name-prompt"
          onSubmit={(e) => {
            e.preventDefault();
            if (cleanName(draft)) setName(cleanName(draft));
          }}
        >
          <input
            className="name-input"
            autoFocus
            maxLength={30}
            aria-label={t('askName')}
            placeholder={t('namePlaceholder')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <p className="name-notice">{t('nameNotice')}</p>
          <Btn block type="submit" disabled={!cleanName(draft)}>{t('askNameSave')}</Btn>
        </form>
      </Modal>
    );
  }

  return (
    <AnimatePresence>
      {showing && (
        <motion.button
          type="button"
          className={`greeting${special ? ' is-special' : ''}`}
          initial={{ y: -40, opacity: 0, scale: 0.9, x: '-50%' }}
          animate={{ y: 0, opacity: 1, scale: 1, x: '-50%' }}
          exit={{ y: -40, opacity: 0, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
          onClick={() => setShowing(false)}
          role="status"
        >
          {special && <Confetti count={30} />}
          <Fenn size={special ? 64 : 44} mood={special ? 'cheer' : 'happy'} />
          <span>{special ?? t('greetBack', { name })}</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
