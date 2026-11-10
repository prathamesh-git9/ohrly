/**
 * Desert scenery beside each unit's stretch of path: a dune, a cactus, a palm or a lantern, and a few
 * twinkling stars. Placement is decided by the unit number, so it never jumps around between visits.
 */
const PIECES = ['cactus', 'dune', 'palm', 'lantern', 'rock'] as const;

function Piece({ kind }: { kind: (typeof PIECES)[number] }) {
  switch (kind) {
    case 'cactus':
      return (
        <svg viewBox="0 0 80 110" width="70" aria-hidden="true">
          <ellipse cx="40" cy="104" rx="34" ry="6" fill="#e8c79a" opacity=".55" />
          <rect x="31" y="20" width="18" height="84" rx="9" fill="#3bb37a" />
          <path d="M31 62H20a8 8 0 0 1-8-8V38a6 6 0 0 1 12 0v12h7" fill="#3bb37a" />
          <path d="M49 50h10a7 7 0 0 0 7-7V30a6 6 0 0 0-12 0v8h-5" fill="#3bb37a" />
          <path d="M40 28v70" stroke="#2c8d5f" strokeWidth="3" strokeLinecap="round" />
          <circle cx="40" cy="18" r="7" fill="#ff7a9a" />
        </svg>
      );
    case 'dune':
      return (
        <svg viewBox="0 0 140 60" width="130" aria-hidden="true">
          <path d="M0 60C24 28 52 14 80 26s48 22 60 34z" fill="#f2c27d" />
          <path d="M40 60C64 38 92 32 140 52v8z" fill="#e7ab5c" />
        </svg>
      );
    case 'palm':
      return (
        <svg viewBox="0 0 100 130" width="80" aria-hidden="true">
          <ellipse cx="50" cy="124" rx="34" ry="6" fill="#e8c79a" opacity=".55" />
          <path d="M48 124c-2-30 0-56 8-82" stroke="#a46a3a" strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M56 42C40 26 20 28 8 40c16-6 30-4 48 2zM56 42c14-18 34-20 46-10-16-2-30 2-46 10zM56 42c-4-20 6-34 18-38-6 12-10 24-18 38zM56 42C46 52 34 66 32 80c8-14 16-26 24-38z" fill="#2fa36b" />
          <circle cx="58" cy="46" r="5" fill="#8a5a2b" />
        </svg>
      );
    case 'lantern':
      return (
        <svg viewBox="0 0 60 120" width="46" aria-hidden="true">
          <path d="M30 0v26" stroke="#8a6d4f" strokeWidth="3" />
          <path d="M16 30h28l-4 46H20z" fill="#ffc23d" />
          <path d="M16 30h28l-4 46H20z" fill="none" stroke="#c28a0c" strokeWidth="3" />
          <rect x="12" y="24" width="36" height="8" rx="3" fill="#c28a0c" />
          <rect x="16" y="74" width="28" height="8" rx="3" fill="#c28a0c" />
          <circle cx="30" cy="54" r="7" fill="#fff4c2" />
        </svg>
      );
    case 'rock':
      return (
        <svg viewBox="0 0 110 60" width="96" aria-hidden="true">
          <path d="M6 56c4-24 18-40 40-44 26-4 50 14 58 44z" fill="#d79b6a" />
          <path d="M40 22c12-6 26-4 34 6" stroke="#f0bf93" strokeWidth="5" fill="none" strokeLinecap="round" />
        </svg>
      );
  }
}

function Star({ x, y, delay }: { x: string; y: string; delay: number }) {
  return (
    <svg viewBox="0 0 20 20" width="16" style={{ left: x, top: y, animationDelay: `${delay}s` }} className="twinkle far" aria-hidden="true">
      <path d="M10 0l2.6 7.4L20 10l-7.4 2.6L10 20l-2.6-7.4L0 10l7.4-2.6z" fill="#ffc23d" />
    </svg>
  );
}

export function Scenery({ seed }: { seed: number }) {
  const kind = PIECES[seed % PIECES.length]!;
  const second = PIECES[(seed + 2) % PIECES.length]!;
  const leftFirst = seed % 2 === 0;
  return (
    <div className="scenery" aria-hidden="true">
      <div style={{ position: 'absolute', top: '58%', [leftFirst ? 'left' : 'right']: 'max(0px, calc(50% - 250px))' }}>
        <Piece kind={kind} />
      </div>
      <div className="far" style={{ position: 'absolute', top: '12%', [leftFirst ? 'right' : 'left']: 'max(0px, calc(50% - 270px))' }}>
        <Piece kind={second} />
      </div>
      <Star x={leftFirst ? '18%' : '76%'} y="6%" delay={seed * 0.37} />
      <Star x={leftFirst ? '80%' : '14%'} y="70%" delay={seed * 0.53} />
    </div>
  );
}
