# Grant Circuit design

Single-hue teal palette, sampled from the Initiative on Islam and Medicine logo emblem. No gradient, no cyan.

## Color

- Logo green: `#00a0a0` (`oklch(0.639 0.109 194.8)`) — exposed as `--brand-teal`, used for decorative accents.
- `--primary`: same hue darkened to `oklch(0.52 0.095 195)` (`#00797a`) so white text clears WCAG AA (5.2:1). Dark mode uses `oklch(0.75 0.115 196)` (`#38c4c6`, 8.3:1).
- Everything else (background, border, accent, chart, sidebar) sits on the same 195 hue.
- `--destructive` stays red — functional signal, not brand.

## Logo

Source art has a white wordmark and white detail lines inside the teal emblem, which disappear on light surfaces. Two files, both 660x378:

| File | Wordmark | Use |
| --- | --- | --- |
| `public/images/logo.png` | white (untouched original) | dark surfaces |
| `public/images/logo-on-light.png` | recolored to `#111111` (alpha preserved for antialiasing) | light surfaces |

`Header` renders both and swaps with `dark:hidden` / `dark:block`. Constants live in `constant/assets.constant.ts` as `LOGO_ON_LIGHT` / `LOGO_ON_DARK`.

## Components

- Cards: `rounded-2xl`, light border, teal left rail for grant context
- Footer links: same teal as submit