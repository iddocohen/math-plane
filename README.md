# Mathe-Flieger

A geometry game in the browser for a child in grade 2, with a German user interface. A small red plane flies over a grass field. In "Treffer" the child picks the right solid, shape, building or view, and the plane drops a bomb on it. In "Bauen und Malen" the child writes building plans, colors views on a grid and fills outlines with color.

The specification is in [specs/001-math-plane/spec.md](specs/001-math-plane/spec.md).

## Development

```sh
pnpm install
pnpm dev        # local server
pnpm lint
pnpm typecheck
pnpm test       # Vitest unit tests
pnpm e2e        # Playwright tests against the production build
```

## Assets and licenses

The game bundles a few free asset files in `public/assets/`. They are reused from [math-soccer](https://iddocohen.github.io/math-soccer/), which checked the license of each file on its source page (FR-058). They ship with the build and the offline cache, so the game makes no request to other sites.

| Use | File | Asset | Author | License | Source |
|-----|------|-------|--------|---------|--------|
| Confetti pop | `pop.mp3` | partypopper (freesound 26349), mono | Streety | CC0 1.0 | [freesound.org/s/26349](https://freesound.org/s/26349) |
| Buying in the Hangar | `coin.mp3` | Coin Pickup (freesound 478647), trimmed to 0.8 s, mono | Phenala | CC0 1.0 | [freesound.org/s/478647](https://freesound.org/s/478647) |
| Celebration | `fanfare.mp3` | Success Fanfare Trumpets (freesound 456966), trimmed to 1.9 s with a fade, mono | FunWithSound | CC0 1.0 | [freesound.org/s/456966](https://freesound.org/s/456966) |
| Stars, sparkles and light | `star_04.png`, `star_06.png`, `star_07.png`, `flare_01.png`, `light_01.png` | Particle Pack, white versions scaled to 64 px and tinted in code | Kenney | CC0 1.0 | [kenney.nl/assets/particle-pack](https://kenney.nl/assets/particle-pack) |
| Text and headings | `Fredoka.ttf` | Fredoka (variable TTF) | The Fredoka Project Authors | SIL Open Font License 1.1 (text in `public/assets/OFL.txt`) | [fonts.google.com/specimen/Fredoka](https://fonts.google.com/specimen/Fredoka) |

The app icons in `public/icons/` are drawn for this game. The plane, the solids, the buildings, the field and the sky are drawn in code.
