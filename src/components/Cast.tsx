import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { onSpeaking } from '../audio/speech';

/**
 * The people who say the sentences. Each is drawn from scratch in one simple style: round heads,
 * dot eyes, and a mouth that moves while their line is playing.
 */
export type CastId = 'mara' | 'leon' | 'ada' | 'juno';

interface Look {
  skin: string;
  hair: string;
  top: string;
  topEdge: string;
  /** Hair drawn behind the head, then in front of it. */
  back: React.ReactNode;
  front: React.ReactNode;
  extra?: React.ReactNode;
}

const LOOKS: Record<CastId, Look> = {
  // Big curls and a sunflower top.
  mara: {
    skin: '#b97a50',
    hair: '#2b1a12',
    top: '#ffc23d',
    topEdge: '#d99a12',
    back: (
      <g fill="#2b1a12">
        {[[34, 50], [86, 50], [28, 70], [92, 70], [32, 90], [88, 90], [42, 36], [78, 36], [60, 30]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="15" />
        ))}
      </g>
    ),
    front: (
      <g fill="#2b1a12">
        <circle cx="46" cy="44" r="11" />
        <circle cx="62" cy="40" r="11" />
        <circle cx="76" cy="46" r="10" />
      </g>
    ),
  },
  // A swept fringe and round glasses.
  leon: {
    skin: '#f1c7a1',
    hair: '#d9622b',
    top: '#0d9f9a',
    topEdge: '#08756f',
    back: <path d="M32 66c-4-30 14-44 30-44 20 0 32 14 28 42z" fill="#d9622b" />,
    front: <path d="M34 58c6-18 26-26 50-14-10-2-22 2-28 12-6-6-14-4-22 2z" fill="#d9622b" />,
    extra: (
      <g fill="none" stroke="#2b2140" strokeWidth="3">
        <circle cx="49" cy="72" r="9" />
        <circle cx="73" cy="72" r="9" />
        <path d="M58 72h6" />
      </g>
    ),
  },
  // Silver bun and a lilac cardigan.
  ada: {
    skin: '#f5d3b8',
    hair: '#c9c4d6',
    top: '#a58ce8',
    topEdge: '#7a5fd0',
    back: (
      <g fill="#c9c4d6">
        <circle cx="61" cy="26" r="14" />
        <path d="M30 70c-2-26 14-40 31-40s33 14 31 40z" />
      </g>
    ),
    front: <path d="M34 60c8-16 22-20 27-20s19 4 27 20c-8-8-18-10-27-10s-19 2-27 10z" fill="#c9c4d6" />,
  },
  // Short hair and a sporty headband.
  juno: {
    skin: '#7a4b2e',
    hair: '#1d1410',
    top: '#2f7de1',
    topEdge: '#1d5bb0',
    back: <path d="M34 62c-2-24 12-36 27-36s29 12 27 36z" fill="#1d1410" />,
    front: <rect x="33" y="50" width="56" height="9" rx="4.5" fill="#ff6b7a" />,
  },
};

export const CAST: CastId[] = ['mara', 'leon', 'ada', 'juno'];

/** The same sentence always gets the same speaker; a named speaker gets themselves. */
export function speakerFor(sentenceId: string, text: string): CastId {
  const lower = text.toLowerCase();
  for (const id of CAST) if (new RegExp(`\\b${id}\\b`).test(lower)) return CAST[(CAST.indexOf(id) + 1) % CAST.length]!;
  let h = 0;
  for (let i = 0; i < sentenceId.length; i++) h = (h * 31 + sentenceId.charCodeAt(i)) >>> 0;
  return CAST[h % CAST.length]!;
}

/** True while `text` is being spoken aloud. */
function useTalking(text: string | undefined): boolean {
  const [talking, setTalking] = useState(false);
  useEffect(() => onSpeaking((now) => setTalking(!!text && now === text)), [text]);
  return talking;
}

export function Character({ id, size = 110, line }: { id: CastId; size?: number; line?: string }) {
  const look = LOOKS[id];
  const talking = useTalking(line);
  return (
    <motion.svg
      viewBox="0 0 122 160"
      width={size}
      height={(size * 160) / 122}
      role="img"
      aria-label={id}
      className="character"
      animate={{ y: [0, -2, 0] }}
      transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
    >
      {/* body */}
      <path d="M18 160c0-34 18-52 43-52s43 18 43 52z" fill={look.top} />
      <path d="M18 160c0-34 18-52 43-52s43 18 43 52" fill="none" stroke={look.topEdge} strokeWidth="4" />
      <path d="M50 108c4 8 18 8 22 0" fill="none" stroke={look.topEdge} strokeWidth="4" strokeLinecap="round" />
      {look.back}
      {/* neck and head */}
      <rect x="53" y="94" width="16" height="18" rx="6" fill={look.skin} />
      <ellipse cx="61" cy="72" rx="28" ry="30" fill={look.skin} />
      <ellipse cx="33" cy="76" rx="5" ry="7" fill={look.skin} />
      <ellipse cx="89" cy="76" rx="5" ry="7" fill={look.skin} />
      {look.front}
      {/* face */}
      <g className="fenn-blink">
        <ellipse cx="49" cy="72" rx="3.6" ry="4.6" fill="#2b2140" />
      </g>
      <g className="fenn-blink">
        <ellipse cx="73" cy="72" rx="3.6" ry="4.6" fill="#2b2140" />
      </g>
      <circle cx="42" cy="84" r="4.5" fill="#ff8c8c" opacity=".35" />
      <circle cx="80" cy="84" r="4.5" fill="#ff8c8c" opacity=".35" />
      {look.extra}
      {talking ? (
        <motion.ellipse
          cx="61"
          cy="88"
          rx="7"
          fill="#7a2a3a"
          initial={{ ry: 2 }}
          animate={{ ry: [2, 5.5, 2.5, 5, 2] }}
          transition={{ repeat: Infinity, duration: 0.42 }}
        />
      ) : (
        // A friendly closed smile while listening.
        <path d="M53 86c4 5 12 5 16 0" fill="none" stroke="#7a2a3a" strokeWidth="3.2" strokeLinecap="round" />
      )}
    </motion.svg>
  );
}
