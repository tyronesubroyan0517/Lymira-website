# Lymira Creations website

Mobile-first site for lymiracollective.com, built with Astro, GSAP and Lenis.

## Run it

```bash
npm install
npm run dev        # local preview at http://localhost:4321
npm run build      # writes dist/
```

## Editing

| To change | Edit |
|---|---|
| Products, prices, Payhip links, reviews, contact links | `src/data/content.js` |
| Pages | `src/pages/` (one file per page; product pages come from `products/[slug].astro`) |
| Header, footer, page transitions | `src/layouts/Layout.astro` |
| Colours, fonts, spacing | `src/styles/global.css` |
| Animation | `src/scripts/motion.js` |

A product with `price: null` shows "See price in store". A product with `url: null`
sends the buy button to the main Payhip store page.

## Motion

- Page transitions between every page (Astro view transitions)
- Smooth scrolling (Lenis)
- Living hero: the artwork ripples under a finger or pointer, seeds drift and the lantern glows (`src/scripts/surface.js`)
- Scrolling zooms through the hero artwork into the page
- Featured creations sit on a 3D rail you drag, swipe or step through (`src/scripts/rail.js`)
- Headings that rise into place, and a statement that fills in word by word
- The four shop categories scroll sideways in a pinned section on desktop
- Invitation-website phones fan out from a stack
- Reviews drift past in a slow marquee that pauses on hover
- Everything switches off when a visitor's device is set to reduce motion

## Adding artwork

Every image area is a labelled placeholder until its file exists. Put a file with the
right name in `public/assets/` (webp, jpg, png or svg) and rebuild. The names are listed
in `public/assets/README.md`. A hero video can go in as `public/assets/brand/hero-banner.mp4`.

## Deploying

In Vercel, create a new project from this repository. `vercel.json` sets everything else.
The domain is added later, once the site is finished.

## Design skills

`.claude/skills/` holds two third-party skills (both MIT licensed) that guide design work in
Claude Code sessions on this repository: `ui-ux-pro-max` and `design-motion-principles`.
