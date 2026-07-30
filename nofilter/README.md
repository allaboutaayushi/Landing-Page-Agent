# NO FILTER

A scroll-driven WebGL landing experience. One continuous camera flight from the
wordmark, through six experience stations, to a glass finale — plus a
consent-first phone capture that writes to a spreadsheet.

```bash
npm install
cp .env.example .env.local   # see "Phone capture" before filling this in
npm run dev                  # http://localhost:3000
```

`npm run build && npm start` for production. `npm run typecheck` for types.

## Before it's finished

Two things are scaffolded and waiting on assets:

- **`public/images/experience/`** — the six experience photographs. Until they
  exist each station shows a marked holding frame. See the README in that
  folder for filenames, crops and composition notes.
- **`public/fonts/`** — the brand typefaces. Until they exist the site runs on
  a system grotesque fallback. See the README in that folder.

Neither blocks anything. Drop the files in and they are picked up with no code
change.

## How it's put together

The page is one journey, not a stack of sections. Scroll position drives a
single camera path, and everything else positions itself against that.

```
app/page.tsx           the whole page, server-rendered
components/gl/         the WebGL layer (client only)
  path.ts              the camera flight — the file to read first
  CameraRig.tsx        drives the camera from scroll
  Lens.tsx             the glass lens you follow
  Shards.tsx           the shattered shell that trails it
  Stations.tsx         the six rings and their imagery
  LogoReveal.tsx       the finale
components/sections/   the type layer over the canvas
lib/content.ts         every word on the page
lib/palette.ts         the colour system
lib/server/            phone capture: validation, rate limit, storage
```

Three ideas are worth knowing before changing anything:

**Scroll is one clock.** Lenis drives the scroll, GSAP's ticker drives Lenis,
and ScrollTrigger reads from Lenis. The DOM and the canvas can't drift apart
mid-scroll because they're on the same tick.

**Act boundaries are measured, not hardcoded.** Sections declare `data-act`,
and `ScrollRig` measures where they actually land, then rebuilds the camera
keyframes. Change a section's height, add copy, add a breakpoint — the flight
follows. Nothing needs retuning by hand.

**Per-frame state bypasses React.** Scroll progress and pointer position live
in `lib/rig.ts`, a plain mutable object. Routing them through a store would
re-render the tree sixty times a second. `lib/store.ts` (Zustand) holds only
discrete state — has the preloader finished, is the capture panel open.

The lens shrinking to nothing before the last section is deliberate, not a
bug. You follow a lens for the whole page and by the finale it isn't there any
more.

## Phone capture

`POST /api/subscribe` validates a number, then appends a row to your store.

**Storage.** Google Sheets when configured, otherwise a local CSV. The CSV is
refused in production unless `CAPTURE_ALLOW_CSV=true`, because serverless
filesystems are wiped on redeploy and losing signups quietly is worse than
failing loudly at boot.

To use Sheets: create a service account, enable the Google Sheets API, and
**share the spreadsheet with the service account's email as an Editor** — the
usual cause of a 403 here is a valid key on an unshared sheet. Then fill in
`GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY`.

Credentials are server-only. Nothing is exposed as `NEXT_PUBLIC_*`, and
`lib/server/` is imported solely from the route handler.

**What's stored,** and why each field is there:

| Column | Purpose |
| --- | --- |
| `timestamp` | ISO 8601 UTC |
| `phone` | E.164, normalised server-side |
| `consent` | Only ever `TRUE`; the request is rejected otherwise |
| `source` | Landing query string, so UTMs survive |
| `referrer` | Where they came from |
| `country` | Resolved from the number |
| `consentVersion` | Bump when the wording changes, so old rows stay attributable |
| `consentText` | The exact wording agreed to |
| `ipHash` | Salted hash — proves origin without holding raw IPs |
| `userAgent` | Corroborates the record |

The last four exist so the opt-in is defensible later. A list of bare phone
numbers is not a compliant basis for messaging anyone; a list where each row
carries the exact wording consented to, when, and from where, is.

**Before messaging anyone,** confirm the opt-in meets WhatsApp's Business
Messaging Policy and your local rules (in India, TRAI/DLT registration for the
sender and template approval). This app collects and evidences consent; it
does not send anything, and nothing here is legal advice.

**Abuse handling.** Per-IP rate limit (6/hour, in-process — swap for Redis if
you run several always-on instances), a honeypot field, a minimum
time-to-submit, a 4 KB body cap, and E.164 validation that rejects fixed
lines. Bot submissions get `200 OK` and are silently dropped, so a script
learns nothing about which check caught it.

## Accessibility and degradation

Every word is in the server-rendered HTML — the canvas adds the ride, never the
meaning. The WebGL layer is `aria-hidden`; station photographs carry their alt
text in the type layer. `prefers-reduced-motion` disables smooth scrolling, the
custom cursor and all reveal animations. The capture panel traps focus, closes
on Escape, and the consent checkbox is keyboard-operable with a visible focus
ring. Quality (sample counts, particle counts, DPR) steps down automatically on
coarse pointers, narrow viewports, and low core/memory devices.

## Deploying

Any Node host. On Vercel it's zero-config — push, set the environment
variables, deploy. Set `CAPTURE_HASH_SALT` to a long random string once and
leave it alone; changing it breaks correlation with existing rows.
