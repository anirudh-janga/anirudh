# Anirudh Janga

A one-page site: a sunlit Pacific Northwest meadow at the edge of the woods,
grown in three.js, with who I am written over it.

**Live: [anirudh-janga.github.io/anirudh](https://anirudh-janga.github.io/anirudh/)**

![The meadow](docs/review/desktop-hero.jpg)

## What's in the meadow

Everything is procedural (no texture downloads):

- an analytic sky with a low golden sun, and light shafts through the firs
- ~110k grass blades and ~9k wildflowers of Rainier's subalpine meadows (lupine, paintbrush,
  avalanche lily, arnica, daisies) swaying in one shared wind
- Douglas fir and cedar woods, a hazy Mount Rainier, western tiger swallowtails, drifting pollen

Scrolling walks you into the meadow; the sun lowers toward golden hour by the end. The cursor
parts the grass. The words are plain HTML on frosted panels, readable before the meadow loads,
and without it.

## Layout

    index.html              the content: hero, work, making things, photography, contact
    src/main.js             tiny entry: grows the meadow after first paint, adapts quality
    src/walk.js             scroll-linked camera, section moments, pointer
    src/meadow/             sky, terrain, grass, flowers, woods, life, post-processing
    docs/STORIES.md         the plan, story by story
    docs/RESEARCH.md        where every fact on the page comes from
    docs/review/            screenshots and the content check

`?quality=0.1…1` overrides the automatic quality.

## Run it

    npm install
    npm run dev

Every push to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`.
