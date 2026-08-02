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
import Scene from '@/components/gl/SceneClient';

/**
 * Everything the page *says* is server-rendered — the copy sits in the HTML
 * whether or not the canvas ever starts. The WebGL layer loads underneath it
 * on the client and adds the ride, never the meaning.
 */
export default function Page() {
  return (
    <>
      <a className="skip-link" href="#what-is">
        Skip to content
      </a>

      <Preloader />
      <ScrollRig />
      <Scene />
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
