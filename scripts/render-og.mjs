// Render the Open Graph share card from `scripts/og-card.html` to
// `public/og-image.png` at the 1200x630 both Facebook and X expect.
//
// The card is HTML rather than a hand-drawn image so it stays honest: it
// pulls the day palette straight out of DESIGN.md, and re-rendering after a
// token or copy change is one command instead of an image edit nobody can
// diff. Run it with `npm run og` whenever either changes.
//
// Rendered at deviceScaleFactor 1 into a 1200x630 viewport, so the output is
// native — no downscale softening the hairlines the design leans on.
import { chromium } from '@playwright/test';

const SOURCE = new URL('./og-card.html', import.meta.url);
const OUT = new URL('../public/og-image.png', import.meta.url).pathname;
const WIDTH = 1200;
const HEIGHT = 630;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
  // The card is light-first, like the app. Forcing the scheme keeps the
  // output identical no matter what the machine running this prefers.
  colorScheme: 'light',
});

await page.goto(SOURCE.href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);

await page.screenshot({ path: OUT, type: 'png' });
await browser.close();

console.log(`wrote ${OUT} (${WIDTH}x${HEIGHT})`);
