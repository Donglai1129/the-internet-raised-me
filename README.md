# THE INTERNET RAISED ME

A Parsons Communication Design thesis prototype about repeated exposure, internet references, humor, and belonging. A visit records what actually appeared and what the visitor chose; it does not diagnose a personality or claim to measure a psychological change.

## Run

```sh
python3 -m http.server 4173 --directory dist
```

Open http://localhost:4173. No build or package installation is needed. To run the checks:

```sh
node --test test/*.test.mjs
```

## Current experience

- Plain white, Arial, blue links, irregular image compositions, and narrow borderless cycling edge strips.
- 53 user-collected Pinterest images: 13 retained images and 40 new downloads. Assistant-sourced images were withdrawn. Original supplied files are untouched.
- The shared opening has four images. Later photo scenes gradually grow to ten, with new seeded positions and sizes on desktop and mobile. A frame remains stable when redrawn.
- Two related references anchor each scene; the rest explore the wider collection. Opening one image adds at most 15% to its sampling weight rather than fixing a route.
- The actual edge tile widens inward on hover, compresses its neighbors, and holds its image. Independent cycling tempos range from 100–500 ms. Pause and reduced-motion support remain available.
- Occasional meme-choice questions, armed meme fights, and the three supplied videos appear inside the endless scroll. Each can be scrolled past. Fights and media pages do not occupy the same section.
- The media pool contains only the three user-supplied YouTube links: Italian brainrot, low-quality Roblox, and Second Date Update over Subway Surfers. A saved shuffled queue shows all three before repeating, without an immediate repeat across cycles. Shorts have inline portrait players. All assistant-found Instagram posts and Vine clips were removed from the source pool, credits, future queues, and resumed own/comparison pages. Existing Pinterest images, reactions, and photo history remain.
- Videos autoplay muted, inline, and loop while their page is visible. Offscreen or hidden-tab players are removed, stopping playback; they restart when revisited. Browser/platform autoplay restrictions can still apply. Original links remain available.
- “Your reaction?” offers three images from the visitor’s Pinterest collection. A choice is saved locally, gently nudges upcoming image selection for three scenes, and contributes to the personalized picture. It does not post a comment or reaction on Instagram or YouTube.
- Fighters come from the current photo scene. Clicking adds power; no round ends before a choice. Wins are recorded once per battle in this visitor’s IndexedDB, with localStorage fallback. Winners appear in the next shuffle and have a bounded higher weight later. There is no shared ranking. Restart retains this separate winner database.
- The personalized picture uses encountered and chosen images, sampled colors, repetition, opens, and dwell to form its layout. No added title or statistics are printed on the picture. Picture and history export as JPG.
- The footer remains reachable during infinite scrolling. Existing visits retain their photos and history when new features are added.

## Source map

| File | Purpose |
| --- | --- |
| `dist/index.html`, `world.css`, `app.js` | Main interface and scrolling |
| `dist/experience.js` | Visit state, sampling, questions, encounter scheduling |
| `dist/scene-layout.js` | Seeded irregular desktop/mobile image placement |
| `dist/catalog.js`, `threads.js`, `credits.html` | Pinterest collection and related-image groups |
| `dist/reaction-posts.js` | User-supplied video links, autoplay URLs, meme options, scheduling |
| `dist/reaction-ui.js`, `reaction.css` | Inline media playback and saved local reactions |
| `dist/fight-engine.js`, `battle-ui.js`, `battle.css` | Inline three-meme battles |
| `dist/winner-db.js` | Visitor-only winner storage |
| `dist/portrait.js`, `palettes.js`, `history.js` | Personalized picture and JPG export |
| `dist/engine.js`, `analytics.js` | Exposure events and descriptive measures |
| `test/` | Sampling, migration, layout, collage, fights, media reactions |

Archived generated culture fragments remain in the catalog for legacy helpers but are excluded from the active image library. External posts/videos are credited separately and are not counted among the 53 Pinterest images.

## Verification

55 automated checks pass. Browser verification covered inline autoplay for the supplied clips and the resumed feed after withdrawing assistant-selected sources. Tests verify that saved own/comparison pages and queued content no longer contain withdrawn posts, while keeping photo history and user-supplied clips. External media depends on its source remaining available.
