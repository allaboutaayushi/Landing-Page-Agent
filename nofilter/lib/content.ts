import type { PaletteKey } from './palette';

export const BRAND = 'NO FILTER';

export const HERO = {
  wordmark: ['NO', 'FILTER'],
  lede: 'Imagine if everything you’re into happened in one place.',
  sub: 'Music, nightlife, creators, fashion, food, art and interactive experiences — without being divided into separate worlds.',
  cta: 'GET IN',
  scrollHint: 'SCROLL',
} as const;

export const WHAT_IS = {
  heading: 'WHAT IS NO FILTER?',
  lede: 'Imagine if everything you’re into happened in one place.',
  body: 'NO FILTER is a new-age pop culture experience where music, nightlife, creators, fashion, food, art and interactive experiences come together — without being divided into separate worlds.',
  /** Each statement lands as its own scroll beat, the way the reference isolates a line per camera move. */
  statements: [
    {
      key: 'MUSIC',
      accent: 'red' as PaletteKey,
      line: 'The artists, sounds and sets that change the direction of your night.',
    },
    {
      key: 'CULTURE',
      accent: 'cyan' as PaletteKey,
      line: 'The things shaping what people are watching, wearing, listening to and talking about.',
    },
    {
      key: 'ENERGY',
      accent: 'yellow' as PaletteKey,
      line: 'A place where the atmosphere keeps changing around you.',
    },
    {
      key: 'EXPERIENCES',
      accent: 'magenta' as PaletteKey,
      line: 'Things you discover by actually being there.',
    },
    {
      key: 'PEOPLE',
      accent: 'green' as PaletteKey,
      line: 'Different interests. Different scenes. One place.',
    },
  ],
  closer: {
    lead: 'NO FILTER is exactly what it sounds like.',
    kicker: ['No boxes.', 'No categories.', 'No version of yourself you need to edit.'],
  },
} as const;

export type Station = {
  index: string;
  title: string;
  line: string;
  accent: PaletteKey;
  /** Path under /public. Drop your photography in to replace the holding frame. */
  image: string;
  alt: string;
};

/**
 * The six stations the camera travels through. Order is the scroll order —
 * changing it changes the ride.
 */
export const STATIONS: Station[] = [
  {
    index: '01',
    title: 'LIVE MUSIC',
    line: 'Come for the artist. Stay when the room changes.',
    accent: 'red',
    image: '/images/experience/01-live-music.jpg',
    alt: 'A crowd lit from the stage during a live set at NO FILTER.',
  },
  {
    index: '02',
    title: 'POP CULTURE',
    line: 'Everything you’re into, finally in the same room.',
    accent: 'cyan',
    image: '/images/experience/02-pop-culture.jpg',
    alt: 'Pop culture installations and references across the NO FILTER floor.',
  },
  {
    index: '03',
    title: 'FOOD + DRINKS',
    line: 'You came for the night. Might as well eat well.',
    accent: 'yellow',
    image: '/images/experience/03-food-drinks.jpg',
    alt: 'Food and drinks being served at NO FILTER.',
  },
  {
    index: '04',
    title: 'CREATORS',
    line: 'The people behind what’s next.',
    accent: 'magenta',
    image: '/images/experience/04-creators.jpg',
    alt: 'Creators shooting and performing at NO FILTER.',
  },
  {
    index: '05',
    title: 'ART + EXPERIENCES',
    line: 'You’ll have to be there to get it.',
    accent: 'green',
    image: '/images/experience/05-art-experiences.jpg',
    alt: 'An interactive art installation at NO FILTER.',
  },
  {
    index: '06',
    title: 'THE CROWD',
    line: 'Your people might not be your people yet.',
    accent: 'orange',
    image: '/images/experience/06-the-crowd.jpg',
    alt: 'The NO FILTER crowd mid-night.',
  },
];

export const EXPECT = {
  heading: 'WHAT TO EXPECT',
  items: [
    { key: 'MUSIC', line: 'Live artists, DJs and sounds across the experience.', accent: 'red' as PaletteKey },
    { key: 'CULTURE', line: 'Creators, fashion, art and everything influencing what’s next.', accent: 'cyan' as PaletteKey },
    { key: 'FOOD + DRINKS', line: 'A reason to stay between everything else happening.', accent: 'yellow' as PaletteKey },
    { key: 'EXPERIENCES', line: 'Interactive moments, discoveries and things you won’t get from a screen.', accent: 'magenta' as PaletteKey },
    { key: 'PEOPLE', line: 'A crowd that doesn’t belong to just one scene.', accent: 'green' as PaletteKey },
  ],
} as const;

export const GET_IN = {
  eyebrow: 'THE DOORS ARE OPEN',
  heading: ['GET', 'IN'],
  line: 'Same night. Same room. Everything you’re into.',
  cta: 'GET IN',
} as const;

export const CAPTURE = {
  heading: 'WAIT. BEFORE YOU GO IN…',
  lede: 'Want the first drop before everyone else?',
  sub: 'Drop your number. We’ll keep you posted.',
  dial: '+91',
  placeholder: 'Enter your phone number',
  consent: 'Yes, message me on WhatsApp about NO FILTER. I can opt out anytime.',
  cta: 'KEEP ME IN THE LOOP →',
  pending: 'SENDING…',
  success: 'YOU’RE IN. WE’LL BE IN TOUCH.',
  dismiss: 'Not now',
} as const;

export const NAV = [
  { label: 'WHAT IS IT', target: '#what-is' },
  { label: 'THE NIGHT', target: '#experience' },
  { label: 'EXPECT', target: '#expect' },
] as const;

export const FOOTER = {
  wordmark: 'NO FILTER',
  line: 'No boxes. No categories.',
  year: new Date().getFullYear(),
} as const;
