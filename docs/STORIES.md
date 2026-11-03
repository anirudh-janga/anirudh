# Anirudh — A Meadow One-Pager

> One page. One scene. A sunlit clearing at the edge of the woods, a meadow
> full of wildflowers, and everything worth knowing about Anirudh, written so
> it reads well.

*This plan replaces the earlier variants (the terminal, the planetary system
and the man page). Their story map lives in git history. Content comes from
web research, not just the GitHub profile: see [RESEARCH.md](RESEARCH.md).*

## The idea

Anirudh lives in Seattle, two hours from Mount Rainier, whose subalpine
meadows are famous for their wildflowers. He builds gardens in code
(`garden-game`), simulates the sky (`solar-system`), and may well photograph
flowers, rivers and stars. So the page is a **Pacific Northwest meadow in
high summer**:

- warm late-afternoon sun low over the trees, with light shafts through the
  canopy
- a meadow of grass with **real PNW wildflowers**: lupine (violet-blue),
  Indian paintbrush (scarlet), avalanche lilies (white), arnica (yellow),
  magenta paintbrush and a scatter of daisies
- an edge of Douglas fir and western red cedar woods framing the clearing,
  with **Rainier**, snow-capped and hazy, far behind
- a breeze moving through everything, a few butterflies, pollen in the light

The content sits **over** the scene as a calm, readable column. The scene is
atmosphere; the words are the point.

### Ground rules
- **Readability first.** Text sits on a soft, solid-enough panel with high
  contrast (at least WCAG AA). The scene never sits behind body text without one.
- **One page, one scene.** No variants, no switcher, no routing.
- **Honest content.** Only facts from RESEARCH.md that Anirudh has
  confirmed. Team work is described as team work.
- **Light.** A small bundle, procedural (no large textures), 60fps on a laptop,
  smooth on a phone.

---

## Story M1 — Clear the Ground
**As** the maintainer, **I want** the repo reduced to a single page,
**so that** there's nothing left to maintain but the meadow.

Acceptance criteria
- Remove `space.html`, `text.html`, `src/cyber/`, `src/scene/`, `src/physics/`,
  the terminal modules, `scripts/stability.mjs`, the variant bar and their CSS.
- Remove the N-body step from CI. The workflow builds and deploys `dist/` to
  Pages on push to `main`, as before.
- Keep: Vite, three.js, the Pages workflow, the favicon (redrawn as a small
  flower or sun).
- Leave `index.html` as a clean shell with a single canvas and a content
  container; the build passes and the deploy works.
- The README says what the page is, links to the live site, and points to
  RESEARCH.md.

## Story M2 — The Meadow
**As** a visitor, **I want** to arrive in a sunlit meadow at the edge of the
woods, **so that** the page feels calm, warm and alive.

Acceptance criteria
- **Sky and sun:** an analytic sky (Rayleigh/Mie style, e.g. three's
  `Sky`) with the sun low in the west, about 12–18° up, giving warm golden
  light. Soft aerial-perspective fog so distance turns blue-grey.
- **Terrain:** a gently rolling meadow from procedural noise, a small rise in
  the foreground, opening onto a clearing.
- **Grass:** instanced blades (about 60–120k on desktop, scaled down on phones)
  with a wind shader using layered noise gusts, colour varying from green to
  straw, and a subtle sun-facing translucency.
- **Wildflowers:** instanced flower heads in natural drifts (clustered by
  noise, not uniform), with PNW species and their colours:
  - lupine: spikes of violet-blue
  - paintbrush: scarlet and magenta
  - avalanche lily: white with yellow centres
  - arnica: yellow daisy-like
  - a few oxeye daisies

  Flowers sway with the same wind field as the grass.
- **Woods:** a ring of conifers (Douglas fir and cedar silhouettes,
  instanced, two or three LODs) closing in on the sides and back, darker
  and cooler in shadow.
- **Rainier:** a distant snow-capped volcano on the horizon, softened by haze.
- **Light shafts:** god rays from the sun through the tree line
  (post-process), plus gentle bloom on the sun only.
- **Life:** five to eight butterflies on looping flight paths, pollen and dust
  motes drifting in the sunbeams.
- Colour grade: warm highlights, cool shadows, tasteful and not saturated.

## Story M3 — The One-Pager
**As** a recruiter, colleague or friend, **I want** to read who Anirudh is
in under a minute, **so that** I leave knowing what he does and how to
reach him.

Acceptance criteria
- Content lives as semantic HTML in `index.html`, so it's readable
  instantly, without JavaScript, and by search engines. It's editable
  without touching the scene.
- Sections, top to bottom:
  1. **Hero:** "Anirudh Janga", "Senior Software Engineer at Slack ·
     Seattle", and one human sentence (e.g. builds AI tools for engineers
     by day, worlds and gardens in code by night).
  2. **Work:** Slack's internal AI developer tooling, described as team
     work: the escalation bot (25+ channels), the in-Slack assistant and
     web app (4,000+ monthly chat turns), and the unified LLM platform
     (16+ teams, an estimated 10,000+ engineering hours a year), linked to
     the Slack Engineering post.
  3. **Making things:** solar-system, chess-3d, garden-game, train-game,
     the Rust/Bevy experiment. One line each, linked.
  4. **Photography:** flowers, rivers, mountains and the Milky Way, with a
     link to Unsplash.
  5. **Contact:** GitHub, LinkedIn, Unsplash.
- **Readability:** a single centred column (max ~64ch) on a frosted panel
  (backdrop blur plus a warm off-white or deep forest tint) with WCAG AA
  contrast. Typography: a humanist serif for headings and a clean sans for
  body text, 17–18px, line-height 1.6.
- Semantic HTML (header, sections, headings, lists, links). Fully readable
  with the canvas absent.

## Story M4 — Walking Through
**As** a visitor, **I want** the scene to respond as I read, **so that**
scrolling feels like a slow walk into the meadow.

Acceptance criteria
- **Scroll-linked camera:** the hero frames the clearing and the sun;
  scrolling drifts the camera slowly forward and down into the flowers,
  ending near the tree line for Contact. Movement is eased and gentle.
- **Section moments,** each subtle and never in front of text:
  - the Work section brings a light breeze ripple across the grass
  - Making things lifts a butterfly into frame
  - Contact settles on the golden-hour light
- **Pointer:** a little parallax, and the grass bends softly away from the cursor.
- **`prefers-reduced-motion`:** a static camera, minimal wind, no butterflies
  flying through.

## Story M5 — Fast, Accessible, Everywhere
**As** any visitor on any device, **I want** the page to load quickly and
work for me, **so that** the scene never gets in the way.

Acceptance criteria
- **Adaptive quality:** grass and flower counts, shadow resolution and god
  rays scale with device class and a measured frame rate. Phones get a
  lighter meadow.
- **Fallbacks:** without WebGL, a CSS sky gradient with a meadow
  silhouette sits behind the same content. The content renders before the
  scene, so it's readable immediately.
- **Accessibility:**
  - the canvas is `aria-hidden`
  - visible focus styles and a skip link
  - all text AA or better
  - the page works by keyboard and screen reader alone
- **Performance:**
  - JS within a reasonable budget (three.js plus scene code, gzipped)
  - no layout shift from the canvas
  - Lighthouse performance ≥ 85 on mobile and accessibility ≥ 95
- **Meta:** title, description, an OG image rendered from the meadow, and a
  favicon.

## Story M6 — Review & Ship
**As** Anirudh, **I want** to confirm the content before it goes live,
**so that** the page is accurate and says what I want.

Acceptance criteria
- Every claim on the page maps to a confirmed line in RESEARCH.md (all items
  were confirmed on 2026-10-29).
- Screenshots at desktop and phone sizes, across hero, middle and end
  scroll positions, are attached to the PR for review.
- Merged to `main` and deployed to Pages via Actions.

---

## Order of work
M1 → M2 → M3 → M4 → M5 → M6, each merged to `main` when done.
Content questions are resolved (see RESEARCH.md).

---

# Part 2 — The Wind (Flower ambiance)

*Feedback: "I am going for the atmosphere and ambiance of the flower game", and
"I should be able to navigate from a starting point and learn about who I am
through boards in the meadow."*

Read as **Flower** (thatgamecompany, 2009): you are the wind, carrying a stream
of petals over endless rolling hills of grass, and colour floods back into the
land behind you. The page stops being a column you scroll. It becomes **a
place you explore**: you arrive at a starting point and drift through the
meadow, and Anirudh's story is written on **wooden boards** standing in the
grass. Walk up to one and read it.

### What changes from Part 1
| Part 1 | Part 2 |
|---|---|
| Rainier and fir woods closing in | open, endless rolling hills, a few lone trees on far crests |
| physically based sky, white glare | a painted warm gradient sky, a soft sun, gentle bloom we control |
| knee-high grass, flower specks | a deep, lush sea of grass with large visible wind waves |
| scrolling drives a fixed camera | **free navigation** from a starting point: glide where you like |
| frosted panels over the scene | **boards in the meadow**; reaching one opens its story |
| butterflies | **a petal stream** that guides you from board to board |
| static flowers | **buds bloom** around each board you visit, and colour returns |
| silent | optional ambient sound (opt-in) |

### Ground rules
- **Readability first.** Long text is never read off a 3D texture at an angle.
  Boards carry big painted titles in the world; their full text opens in a
  crisp, accessible card (AA contrast) when you arrive.
- **One page, one scene.** No routes, no reloads.
- **Nobody gets lost.** There's always a visible way to the next board and
  back to the start.
- **Works for everyone.** Keyboard and screen readers get the whole story.
  Without WebGL, the boards render as an ordinary readable page (today's layout).
- Content stays as confirmed in RESEARCH.md; it moves from panels onto boards.

## Story F1 — Rolling Hills
**As** a visitor, **I want** wide, soft, endless hills under a warm sky,
**so that** the world feels open and dreamy rather than enclosed.

Acceptance criteria
- Terrain becomes broad, smooth swells stretching to the horizon, with no
  forest ring and no Rainier. A gentle valley is the explorable area,
  roughly 200 × 200 m, with soft rises that hide some boards until you
  crest them.
- Distant hills fade into warm haze, layered like a painting.
- Three to five lone deciduous trees on crests act as landmarks, with round
  soft canopies silhouetted against the light. Boards stand near some of them.
- **Painted sky:** our own gradient shader (apricot horizon, rose mid-sky, soft
  blue zenith), a large soft sun with a halo, and slow painterly cloud bands.
  Values stay in a controlled range, so bloom is safe again.
- **Grade:** warm and gently saturated, lifted shadows, soft bloom on the sun,
  highlights and petals only, and a light vignette.

## Story F2 — A Sea of Grass
**As** a visitor, **I want** the grass to move like water, **so that** I can
see the wind.

Acceptance criteria
- Dense, lush grass around wherever you are, which follows you as you move:
  a chunked near field plus a cheap far field (a shader on the terrain) to the
  horizon. No visible edge where the grass ends.
- **Wind waves:** broad gust bands roll across the hills so the sheen visibly
  travels, and the tips brighten as they bow towards the light.
- Colour runs from deep green roots to sunlit yellow-green tips, with backlit
  glow towards the sun.
- The grass parts around you as you glide, leaving a soft wake.

## Story F3 — The Starting Point & Getting Around
**As** a visitor, **I want** to arrive somewhere and move freely through the
meadow, **so that** I explore rather than scroll.

Acceptance criteria
- **The start:** you arrive on a low rise looking over the valley. The first
  board ("Hello") stands just in front of you, and the others are visible as
  small signs dotted across the meadow, some near the lone trees.
- **Moving** (you are the wind: a smooth glide a little above the grass,
  never a stiff first-person walk):
  - *Mouse/trackpad:* click anywhere on the ground or on a board to glide
    there; drag to look around.
  - *Keyboard:* W/A/S/D or arrow keys to glide and turn; Tab / Shift+Tab to
    travel board to board; Enter opens the board you're at; Esc closes it.
  - *Touch:* tap the ground or a board to glide there; drag to look.
- **Gentle physics:** easing in and out, following the terrain, and soft
  bounds at the valley edge (the wind turns you back, no walls).
- **Way-finding:**
  - a small compass strip at the top showing each board's direction, with visited ones filled
  - a "Back to start" control
  - a faint trodden path through the grass connecting the boards in their suggested order
- Reduced motion: travel becomes quick fades between boards instead of glides.

## Story F4 — Boards in the Meadow
**As** a visitor, **I want** to learn who Anirudh is from boards standing in
the meadow, **so that** his story is part of the place.

Acceptance criteria
- **Five boards,** in suggested order:
  1. **Hello**, at the start: name, role, Seattle, the one-line lede
  2. **At Slack**: the AI tooling and the published figures, with the write-up link
  3. **Making things**: the projects, each linked
  4. **Photography**: flowers, rivers, mountains, the Milky Way, with the Unsplash link
  5. **Say hello**: LinkedIn, GitHub, Unsplash

  Plus a small **About this meadow** marker for the credits.
- **In the world:** hand-built wooden signboards (posts, a weathered plank
  face, a little moss, wildflowers at the foot). Each shows its title in large
  hand-painted lettering, readable from a distance, with a simple icon
  (a Slack-style hash, a hammer, a camera, a wave).
- **Reading:** when you reach a board (glide close, click it, or press Enter)
  the camera settles in front of it and a **reading card** opens beside it.
  The card holds the full section text as real HTML (crisp, selectable,
  with working links, AA contrast), styled like paper pinned to the wood.
  Next and Previous buttons on the card glide you onward.
- **Single source of truth:** the card content *is* the existing semantic
  HTML in `index.html`, so it stays readable without JavaScript and to
  screen readers in reading order.
- A board remembers being visited (its flowers have bloomed, F6) and is
  filled in on the compass.

## Story F5 — The Petal Stream
**As** a visitor, **I want** a ribbon of petals that flows with me and shows
the way, **so that** I feel like the wind and never feel lost.

Acceptance criteria
- 150–400 petals (instanced, curved, two-sided, lit, slightly translucent)
  flutter and tumble along a smooth flowing path around the camera.
- When you're idle, the stream drifts ahead towards the **next unvisited
  board**, then circles back, like a gentle "this way".
- While you glide, it streams alongside you and curls around blooms. On
  desktop it leans towards the cursor.
- It starts with a handful of petals and grows with every bloom (F6).
- Reduced motion: the stream rests near the next board as a soft marker.

## Story F6 — Bring Back the Colour
**As** a visitor, **I want** the meadow to come alive as I learn about
Anirudh, **so that** reading his story literally makes the valley bloom.

Acceptance criteria
- Clusters of closed buds surround each board: violet at At Slack, scarlet
  and gold at Making things, white at Photography, everything at Say hello.
  Opening a board makes its buds bloom over about a second, with a small burst
  of light, and their petals join the stream.
- **Colour returns:** the valley starts softly desaturated and dusky. A
  "life" field (painted into a small texture as blooms happen) saturates and
  warms the grass and terrain around each visited board, spreading slowly.
  When all five boards are read, the whole valley is in colour and the sun
  settles into golden hour.
- Blooms persist for the visit.

## Story F7 — Sound (opt-in)
**As** a visitor who wants the full feeling, **I want** soft ambient sound,
**so that** the meadow feels alive. It's never on by default.

Acceptance criteria
- A small, quiet sound toggle, off by default, keyboard accessible, and
  remembered for the visit.
- Web Audio only, with no audio files:
  - a filtered-noise wind bed that swells with gusts and with your glide speed
  - a pentatonic chime for each bloom, pitched by colour and panned by position
  - a low warm pad
- The volume stays modest, and sound pauses when the tab is hidden.

## Story F8 — Polish, Performance & Review
**As** Anirudh, **I want** the explorable meadow to stay fast, readable and
accessible, **so that** nothing from Part 1 regresses.

Acceptance criteria
- Adaptive quality scales the grass chunks, petals, bloom and far field on
  phones and weaker machines, with the frame-rate watcher kept.
- **Accessibility:**
  - axe-core reports 0 violations
  - the reading cards pass AA
  - every board is reachable and readable by keyboard alone, with a visible focus
  - screen readers get the five sections in order
  - the no-WebGL fallback is today's readable page with a warm gradient
- A first-visit hint (e.g. "click the grass to drift · Tab to visit boards")
  fades after the first move.
- A new OG image comes from the bloomed valley with the Hello board.
- Review screenshots go in `docs/review/`:
  - the start
  - gliding between boards
  - a board open
  - a phone view
  - the fully bloomed valley

## Order of work
F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8, each merged to `main` when done.
F3 and F4 together make the first explorable version; F5–F6 bring the Flower feeling.
