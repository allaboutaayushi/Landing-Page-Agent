import Hero from '@/components/sections/Hero';
import WhatIs from '@/components/sections/WhatIs';
import Experience from '@/components/sections/Experience';
import Expect from '@/components/sections/Expect';
import GetIn from '@/components/sections/GetIn';
import Nav from '@/components/Nav';
import Cursor from '@/components/Cursor';
import Grain from '@/components/Grain';
import Preloader from '@/components/Preloader';
import ScrollRig from '@/components/ScrollRig';
import Capture from '@/components/Capture';

/**
 * Everything the page says is server-rendered.
 *
 * The WebGL tunnel that used to sit under this is unmounted for the flat
 * rebrand: the brand's colourways are opaque grounds, so the canvas was
 * covered edge to edge and paying for a renderer nobody could see. The layer
 * is still in components/gl — re-adding `<Scene />` here brings it back.
 */
export default function Page() {
  return (
    <>
      <a className="skip-link" href="#what-is">
        Skip to content
      </a>

      <Preloader />
      <ScrollRig />
      <Cursor />
      <Nav />

      <main className="shell">
        <Hero />
        <WhatIs />
        <Experience />
        <Expect />
        <GetIn />
      </main>

      <Capture />
      <Grain />
    </>
  );
}
