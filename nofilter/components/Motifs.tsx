import s from './Motifs.module.css';

/**
 * The deck's four-point sparkle.
 *
 * Drawn rather than shipped as an asset: it is four concave curves and scales
 * to any size without a file, which matters on a page that uses it at half a
 * dozen sizes. Purely decorative, so it never enters the a11y tree.
 */
export function Sparkle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M50 0c4 34 12 46 50 50-38 4-46 16-50 50-4-34-12-46-50-50 38-4 46-16 50-50Z"
        fill="currentColor"
      />
    </svg>
  );
}

type FieldProps = {
  /** Which scatter to use. Each is hand-placed, not random, so the composition
      is stable between renders and never lands a sparkle on the type. */
  variant?: 'hero' | 'corner';
};

/**
 * A scatter of sparkles behind a section.
 *
 * Positions are authored rather than generated: random placement kept dropping
 * marks straight onto the wordmark, and a layout that changes every reload is
 * impossible to art-direct.
 */
export function SparkleField({ variant = 'hero' }: FieldProps) {
  const marks =
    variant === 'hero'
      ? [
          { top: '8%', left: '6%', size: 92, tone: 'cream', delay: 0 },
          { top: '18%', left: '13%', size: 34, tone: 'teal', delay: 1.4 },
          { top: '12%', right: '9%', size: 56, tone: 'cream', delay: 2.1 },
          { top: '28%', right: '22%', size: 22, tone: 'yellow', delay: 3.2 },
          { top: '46%', left: '3%', size: 44, tone: 'yellow', delay: 0.7 },
          { top: '58%', right: '4%', size: 68, tone: 'cream', delay: 1.9 },
          { top: '38%', left: '21%', size: 18, tone: 'cream', delay: 2.9 },
          { bottom: '9%', right: '6%', size: 104, tone: 'cream', delay: 1.1 },
          { bottom: '20%', right: '15%', size: 30, tone: 'teal', delay: 2.6 },
          { bottom: '28%', left: '11%', size: 26, tone: 'yellow', delay: 3.6 },
          { bottom: '6%', left: '28%', size: 40, tone: 'teal', delay: 0.3 },
        ]
      : [
          { top: '14%', right: '8%', size: 62, tone: 'cream', delay: 0.4 },
          { top: '30%', left: '12%', size: 26, tone: 'yellow', delay: 2.4 },
          { top: '62%', right: '18%', size: 34, tone: 'teal', delay: 1.2 },
          { bottom: '16%', left: '7%', size: 40, tone: 'cream', delay: 1.8 },
          { bottom: '30%', right: '9%', size: 20, tone: 'yellow', delay: 3.1 },
        ];

  return (
    <div className={s.field} aria-hidden="true">
      {marks.map((m, i) => (
        <Sparkle
          key={i}
          className={`${s.mark} ${s[m.tone as 'cream' | 'teal' | 'yellow']}`}
          style={{
            top: m.top,
            left: m.left,
            right: m.right,
            bottom: m.bottom,
            width: m.size,
            animationDelay: `${m.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
