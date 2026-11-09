import { Snail, Sparkles, Volume2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { sfx } from '../audio/sfx';
import { speak } from '../audio/speech';
import { tokenize } from '../domain/check';
import type { LangCode } from '../domain/types';

type Variant = 'primary' | 'secondary' | 'ghost' | 'good' | 'bad' | 'gold';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  quiet?: boolean;
}

/** The chunky button: a solid bottom edge the face presses down into. CSS does the travel. */
export function Btn({ variant = 'primary', block, quiet, className = '', onClick, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      className={`btn btn-${variant}${block ? ' btn-block' : ''} ${className}`}
      onClick={(e) => {
        if (!quiet) sfx.tap();
        onClick?.(e);
      }}
      {...rest}
    />
  );
}

export function MadeBy({ label, className = '' }: { label: string; className?: string }) {
  return (
    <a
      className={`made-by ${className}`}
      href="https://github.com/prathamesh-git9"
      target="_blank"
      rel="noreferrer"
    >
      <Sparkles aria-hidden="true" size={13} strokeWidth={2.8} />
      <span>{label}</span>
    </a>
  );
}

export function Flag({ lang, size = 28 }: { lang: LangCode; size?: number }) {
  const h = (size * 3) / 4;
  const common = { width: size, height: h, className: 'flag', role: 'img' as const };
  if (lang === 'de') {
    return (
      <svg viewBox="0 0 24 18" aria-label="German" {...common}>
        <rect width="24" height="6" fill="#1b1b1f" />
        <rect y="6" width="24" height="6" fill="#d6242b" />
        <rect y="12" width="24" height="6" fill="#f7c600" />
      </svg>
    );
  }
  if (lang === 'en') {
    return (
      <svg viewBox="0 0 24 18" aria-label="English" {...common}>
        <rect width="24" height="18" fill="#17307a" />
        <path d="M0 0l24 18M24 0L0 18" stroke="#fff" strokeWidth="3.6" />
        <path d="M0 0l24 18M24 0L0 18" stroke="#cf1f35" strokeWidth="1.4" />
        <path d="M12 0v18M0 9h24" stroke="#fff" strokeWidth="6" />
        <path d="M12 0v18M0 9h24" stroke="#cf1f35" strokeWidth="3.4" />
      </svg>
    );
  }
  return <span className="flag flag-text" style={{ width: size, height: h }}>{lang.toUpperCase()}</span>;
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className="progress-fill"
        style={color ? { background: color } : undefined}
        initial={false}
        animate={{ width: `${Math.max(value > 0 ? 4 : 0, value * 100)}%` }}
        transition={{ type: 'spring', stiffness: 160, damping: 20 }}
      />
    </div>
  );
}

export function SpeakerButton({
  text,
  lang,
  size = 'lg',
  withSlow = false,
  slowLabel,
}: {
  text: string;
  lang: LangCode;
  size?: 'sm' | 'lg';
  withSlow?: boolean;
  slowLabel?: string;
}) {
  const [playing, setPlaying] = useState<'normal' | 'slow' | null>(null);
  const play = (slow: boolean) => {
    setPlaying(slow ? 'slow' : 'normal');
    void speak(text, lang, slow).finally(() => setPlaying(null));
  };
  return (
    <div className="speakers">
      <button
        type="button"
        className={`speaker speaker-${size}${playing === 'normal' ? ' is-playing' : ''}`}
        onClick={() => play(false)}
        aria-label="Play audio"
      >
        <Volume2 strokeWidth={2.6} />
      </button>
      {withSlow && (
        <button
          type="button"
          className={`speaker speaker-slow${playing === 'slow' ? ' is-playing' : ''}`}
          onClick={() => play(true)}
          aria-label={slowLabel ?? 'Play slowly'}
          title={slowLabel}
        >
          <Snail strokeWidth={2.6} />
        </button>
      )}
    </div>
  );
}

/** A prompt whose words can be tapped for a meaning, shown with a dotted underline. */
export function HintText({
  text,
  gloss,
  speakLang,
}: {
  text: string;
  gloss: ReadonlyMap<string, string>;
  speakLang?: LangCode;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const parts = text.split(/(\s+)/);
  return (
    <span className="hint-text">
      {parts.map((part, i) => {
        if (/^\s+$/.test(part) || part === '') return part;
        const key = tokenize(part)[0]?.toLowerCase();
        const meaning = key ? gloss.get(key) : undefined;
        if (!meaning) return <span key={i}>{part}</span>;
        return (
          <span
            key={i}
            className="hint-word"
            tabIndex={0}
            role="button"
            onMouseEnter={() => setOpen(i)}
            onMouseLeave={() => setOpen(null)}
            onFocus={() => setOpen(i)}
            onBlur={() => setOpen(null)}
            onClick={() => {
              setOpen(i);
              if (speakLang && key) void speak(tokenize(part)[0]!, speakLang);
            }}
          >
            {part}
            <AnimatePresence>
              {open === i && (
                <motion.span
                  className="hint-pop"
                  initial={{ opacity: 0, y: 6, x: '-50%', scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
                  exit={{ opacity: 0, y: 6, x: '-50%', scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  {meaning}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
}

export function Modal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <motion.div
      className="modal-scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <motion.div
        className="modal"
        role="dialog"
        aria-modal="true"
        initial={{ y: 40, scale: 0.94, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 40, scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

const CONFETTI_COLORS = ['#5b3df5', '#ffc23d', '#23c07d', '#ff6b7a', '#2fb6ff', '#f5a35c'];

/** A short burst. Motion's reduced-motion setting removes the movement, leaving nothing. */
export function Confetti({ count = 46 }: { count?: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      dur: 1.4 + Math.random() * 1.1,
      rot: Math.random() * 720 - 360,
      drift: Math.random() * 120 - 60,
      w: 6 + Math.random() * 7,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
      round: Math.random() < 0.3,
    })),
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.round ? p.w : p.w * 1.6,
            background: p.color,
            borderRadius: p.round ? '50%' : 2,
          }}
          initial={{ y: -30, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '105vh', x: p.drift, rotate: p.rot, opacity: [1, 1, 0.8] }}
          transition={{ duration: p.dur, delay: p.delay, ease: [0.2, 0.6, 0.5, 1] }}
        />
      ))}
    </div>
  );
}
