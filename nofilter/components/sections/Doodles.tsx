import s from './unfilter.module.css';

/**
 * Hand-drawn marks scattered around the unfilter lines.
 *
 * Stroked paths rather than filled shapes, with round caps and joins and a
 * deliberately uneven line — a doodle reads as drawn because the curve is
 * imperfect, and a geometrically clean squiggle just looks like a sine wave.
 *
 * Each is `vector-effect: non-scaling-stroke` so the weight stays constant
 * whatever size the mark is placed at; without it the small ones come out as
 * hairlines and the large ones as slabs.
 */

const DOODLES = {
  squiggle: 'M2 22c8-16 16 16 24 0s16-16 24 0 16 16 24 0',
  spiral:
    'M40 40c0-6-5-11-11-11s-11 5-11 11 5 11 11 11 14-5 14-13-7-16-16-16-19 8-19 19 10 21 22 21',
  zigzag: 'M2 34l12-24 12 24 12-24 12 24 12-24',
  burst: 'M28 2v52M2 28h52M9 9l38 38M47 9L9 47',
  arrow: 'M3 40c14-6 22-20 42-30M32 4l13 6-4 13',
  loop: 'M3 40c10 0 14-10 8-16s-16 2-10 12 22 8 34-4 6-24-6-26',
  arcs: 'M6 46a26 26 0 0142-20M16 48a18 18 0 0128-14M26 50a10 10 0 0110-8',
} as const;

type Mark = {
  d: keyof typeof DOODLES;
  tone: 'yellow' | 'teal' | 'white' | 'pink';
  style: React.CSSProperties;
};

/*
 * Placed by hand rather than generated. Random scatter kept dropping marks on
 * top of the words, and a layout that reshuffles on every reload cannot be
 * art-directed — these sit in the gaps the three lines leave.
 */
const MARKS: Mark[] = [
  { d: 'squiggle', tone: 'yellow', style: { top: '4%', left: '46%', width: 92, rotate: '-8deg' } },
  { d: 'burst', tone: 'white', style: { top: '14%', right: '9%', width: 46 } },
  { d: 'spiral', tone: 'teal', style: { top: '30%', left: '4%', width: 62, rotate: '12deg' } },
  { d: 'arrow', tone: 'yellow', style: { top: '38%', right: '16%', width: 74, rotate: '-14deg' } },
  { d: 'zigzag', tone: 'pink', style: { top: '54%', left: '10%', width: 78, rotate: '6deg' } },
  { d: 'arcs', tone: 'white', style: { top: '62%', right: '5%', width: 66, rotate: '-20deg' } },
  { d: 'loop', tone: 'teal', style: { bottom: '16%', left: '38%', width: 84, rotate: '10deg' } },
  { d: 'burst', tone: 'yellow', style: { bottom: '6%', left: '6%', width: 34 } },
  { d: 'squiggle', tone: 'white', style: { bottom: '2%', right: '22%', width: 96, rotate: '5deg' } },
];

export default function Doodles() {
  return (
    <div className={s.doodles} aria-hidden="true">
      {MARKS.map((m, i) => (
        <svg
          key={i}
          className={`${s.doodle} ${s[m.tone]}`}
          style={{ ...m.style, animationDelay: `${i * -1.7}s` }}
          viewBox="0 0 56 56"
          fill="none"
          focusable="false"
        >
          <path
            d={DOODLES[m.d]}
            stroke="currentColor"
            strokeWidth={4.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ))}
    </div>
  );
}
