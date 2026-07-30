# Experience photography

Drop the six NO FILTER experience images in this folder using **exactly** these
filenames. They are wired up already — no code change is needed.

| File | Station | Caption |
| --- | --- | --- |
| `01-live-music.jpg` | 01 — LIVE MUSIC | Come for the artist. Stay when the room changes. |
| `02-pop-culture.jpg` | 02 — POP CULTURE | Everything you’re into, finally in the same room. |
| `03-food-drinks.jpg` | 03 — FOOD + DRINKS | You came for the night. Might as well eat well. |
| `04-creators.jpg` | 04 — CREATORS | The people behind what’s next. |
| `05-art-experiences.jpg` | 05 — ART + EXPERIENCES | You’ll have to be there to get it. |
| `06-the-crowd.jpg` | 06 — THE CROWD | Your people might not be your people yet. |

Until a file exists, that station renders a clearly-marked holding frame in its
accent colour. Nothing breaks and no stand-in photography is shipped — the
station simply shows it is waiting for its image.

## Specs

- **Aspect ratio** — 1.6:1 landscape. The plane is 8.6 × 5.4 world units.
- **Size** — 2048 × 1280 is plenty. Anything larger is wasted; the texture is
  never shown larger than the viewport.
- **Format** — `.jpg` for photographs. If you would rather use `.webp` or
  `.avif`, change the `image` paths in `lib/content.ts` to match.
- **Colour** — sRGB. The loader tags textures as sRGB, so a Display-P3 export
  will look desaturated.

## Composition

The camera flies *through* a ring and the image sits inside it, so the frame is
cropped hard by a circular vignette and the edges are never seen.

- Keep the subject in the **middle 60%**. Anything near an edge is lost.
- Favour high contrast and a dark ground — these sit on near-black and are
  seen through refracting glass.
- Avoid text or logos in the image; the type layer handles all wording, and
  the shader applies a chromatic split that will make baked-in text look
  broken.

## Changing the stations

The order, copy, accent colours and filenames all live in one place —
`STATIONS` in `lib/content.ts`. Adding or removing an entry also needs
`STATION_COUNT` in `components/gl/path.ts` updated to match, since that governs
how many rings the tunnel builds.
