import { motion, type TargetAndTransition } from 'motion/react';

export type FennMood = 'idle' | 'happy' | 'sad' | 'cheer' | 'think';

const bodyMotion: Record<FennMood, TargetAndTransition> = {
  idle: { y: [0, -3, 0], transition: { repeat: Infinity, duration: 2.8, ease: 'easeInOut' } },
  think: { rotate: [-2, 2, -2], transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' } },
  happy: { y: [0, -18, 0, -9, 0], transition: { duration: 0.8, ease: 'easeOut' } },
  cheer: {
    y: [0, -22, 0],
    rotate: [0, -5, 5, 0],
    transition: { repeat: Infinity, duration: 0.9, ease: 'easeInOut' },
  },
  sad: { y: [0, 4], rotate: [0, -3], transition: { duration: 0.4, ease: 'easeOut' } },
};

/** Fenn, the fennec fox. Drawn from scratch: those huge ears are the whole personality. */
export function Fenn({ mood = 'idle', size = 120 }: { mood?: FennMood; size?: number }) {
  const sad = mood === 'sad';
  const glad = mood === 'happy' || mood === 'cheer';
  return (
    <motion.svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      animate={bodyMotion[mood]}
      style={{ overflow: 'visible', transformOrigin: '50% 100%' }}
      role="img"
      aria-label="Fenn the fennec fox"
    >
      {/* tail */}
      <motion.g
        animate={{ rotate: glad ? [-14, 14, -14] : [-5, 5, -5] }}
        transition={{ repeat: Infinity, duration: glad ? 0.5 : 2.4, ease: 'easeInOut' }}
        style={{ transformOrigin: '128px 170px' }}
      >
        <path d="M128 172c22 6 46-4 50-30 2-12-2-20-8-24 0 18-12 26-28 28-10 1-18 4-22 10z" fill="#ec8f43" />
        <path d="M178 142c2-12-2-20-8-24-1 8-3 14-7 18 4 3 10 5 15 6z" fill="#fff5e6" />
      </motion.g>

      {/* body */}
      <path d="M62 196c-4-30 6-62 38-62s42 32 38 62z" fill="#f5a35c" />
      <path d="M78 196c-3-20 4-44 22-44s25 24 22 44z" fill="#fff5e6" />

      {/* left ear: a fennec's are huge and wide, set low and flared out, not tall like a rabbit's */}
      <motion.g
        animate={{ rotate: sad ? -18 : glad ? [-7, 4, -7] : [-2, 2, -2] }}
        transition={sad ? { duration: 0.3 } : { repeat: Infinity, duration: glad ? 0.5 : 3.2 }}
        style={{ transformOrigin: '70px 84px' }}
      >
        <path d="M92 66C70 74 46 84 30 92 14 66 6 34 6 12c0-6 5-8 10-5 34 16 62 32 76 59z" fill="#f5a35c" />
        <path d="M80 68C62 74 48 80 37 85 26 64 19 42 18 22c26 13 49 28 62 46z" fill="#ffd9c2" />
      </motion.g>

      {/* right ear */}
      <motion.g
        animate={{ rotate: sad ? 18 : glad ? [7, -4, 7] : [2, -2, 2] }}
        transition={sad ? { duration: 0.3 } : { repeat: Infinity, duration: glad ? 0.5 : 3.2 }}
        style={{ transformOrigin: '130px 84px' }}
      >
        <path d="M108 66c22 8 46 18 62 26 16-26 24-58 24-80 0-6-5-8-10-5-34 16-62 32-76 59z" fill="#f5a35c" />
        <path d="M120 68c18 6 32 12 43 17 11-21 18-43 19-63-26 13-49 28-62 46z" fill="#ffd9c2" />
      </motion.g>

      {/* head: tapered to the chin, with tufts of fur at the cheeks */}
      <path d="M100 60c32 0 54 16 60 42l18 12-24 8c-10 18-34 36-54 38-20-2-44-20-54-38l-24-8 18-12c6-26 28-42 60-42z" fill="#f5a35c" />
      <path d="M100 160c-17-2-37-16-47-34 15-10 34-8 47 6 13-14 32-16 47-6-10 18-30 32-47 34z" fill="#fff5e6" />

      {/* eyes */}
      {glad ? (
        <>
          <path d="M66 100c4-9 16-9 20 0" fill="none" stroke="#2b2140" strokeWidth="6" strokeLinecap="round" />
          <path d="M114 100c4-9 16-9 20 0" fill="none" stroke="#2b2140" strokeWidth="6" strokeLinecap="round" />
        </>
      ) : (
        <>
          <g className="fenn-blink">
            <ellipse cx="76" cy="98" rx="10" ry="12" fill="#2b2140" />
            <circle cx="79" cy="93" r="3.6" fill="#fff" />
          </g>
          <g className="fenn-blink">
            <ellipse cx="124" cy="98" rx="10" ry="12" fill="#2b2140" />
            <circle cx="127" cy="93" r="3.6" fill="#fff" />
          </g>
          {sad && (
            <>
              <path d="M62 82l22 6" stroke="#b86a2c" strokeWidth="5" strokeLinecap="round" />
              <path d="M138 82l-22 6" stroke="#b86a2c" strokeWidth="5" strokeLinecap="round" />
            </>
          )}
        </>
      )}

      {/* nose and mouth */}
      <ellipse cx="100" cy="126" rx="7" ry="5.5" fill="#2b2140" />
      {glad ? (
        <path d="M88 134c4 13 20 13 24 0z" fill="#d6455d" />
      ) : sad ? (
        <path d="M90 145c5-6 15-6 20 0" fill="none" stroke="#2b2140" strokeWidth="4" strokeLinecap="round" />
      ) : (
        <path d="M100 131v4m-9 1c4 5 6 4 9-1 3 5 5 6 9 1" fill="none" stroke="#2b2140" strokeWidth="4" strokeLinecap="round" />
      )}

      {/* cheeks */}
      <circle cx="62" cy="116" r="6" fill="#ffb7a8" opacity=".6" />
      <circle cx="138" cy="116" r="6" fill="#ffb7a8" opacity=".6" />
    </motion.svg>
  );
}
