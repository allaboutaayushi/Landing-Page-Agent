# Brand fonts

The `@font-face` rules in `app/globals.css` already point here. Drop the files
in with these names and the whole site picks them up — no code change needed.

| File | Used for |
| --- | --- |
| `nf-display.woff2` | Headlines, the wordmark, station titles |
| `nf-text.woff2` | Body copy, captions |

Both are declared as variable fonts (`font-weight: 100 900`). If yours are
static, either ship the weight you want as a single file or add one
`@font-face` block per weight in `app/globals.css`.

Until the files exist the site falls back to a tight system grotesque
(Helvetica Neue → Arial). The layout is built on that fallback's metrics, so
dropping in a much wider or narrower typeface will change line breaks —
worth a look at the hero and the statement list afterwards.

The WebGL wordmark in the finale is drawn to a canvas at runtime using the
same stack, and waits on `document.fonts.ready`, so it picks up the real
typeface automatically rather than needing a separate 3D font file.

Self-host only. There is no external stylesheet or font CDN anywhere in this
project, which is what keeps the page free of third-party requests.
