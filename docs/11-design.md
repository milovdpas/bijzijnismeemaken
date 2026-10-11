# 11 — Design system

Brief (2026-10-10): **playful, but minimal**. Yellow as the brand, a deep blue as the ink. Every screen built from task 10 onwards follows this; the tokens live in `apps/web/app/globals.css`.

## Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| `--brand` / `bg-brand` | yellow `oklch(0.86 0.17 90)` ≈ #FFC72C | slightly deeper yellow | Tiles behind icons, the logo, selected pills, the primary button. Never as text on a light surface (fails AA). |
| `--brand-foreground` | ink | dark ink | Whatever sits on yellow. |
| `--ink` / `text-ink` | deep blue `oklch(0.32 0.09 262)` ≈ #223074 | off-white | Headings, logo figures, the active nav pill. |
| `--primary` | = brand (yellow button, ink text) | = brand | The one action per screen. |
| `--secondary` | ink as a surface | off-white as a surface | Inverted chips, rarely. |
| `--background` | warm off-white `oklch(0.985 0.012 90)` | deep blue `oklch(0.21 0.045 262)` | Page. |
| `--card` | white | lighter deep blue | Cards sit slightly above the page. |
| `--accent` | pale yellow | lighter blue | Hover states. |
| `--muted-foreground` | greyed blue | greyed off-white | Secondary text. |
| `--free` / `--busy` / `--unknown` | green / red / grey | same, adjusted | Availability cells only. |

Rules: text is always ink or off-white, never yellow. Yellow is a surface. One yellow primary button per screen; everything else is `outline` or `ghost`. The viewport theme colour and the manifest use the literal `#ffc72c` and must stay in step with `--brand`.

## Type and shape

- **Nunito** for everything (`next/font`), weights 400/600/700/800. Headings are bold, tight and ink (`h1`–`h3` get this from `globals.css`). Body 14–16px.
- **Radius 1rem** base (`--radius`): cards `rounded-2xl`, inputs and small controls `rounded-xl`, pills and nav items `rounded-full`.
- Spacing on a 4px grid; page gutters 16px on phones, 24px from `md`.
- Icons: lucide, `size-4` inline with text, `size-5` in nav, `size-7` on empty-state tiles. Icon-only buttons always get a translated `aria-label`.

## Themes

Two independent axes, both per device:

- **Colour scheme**: system / light / dark, via next-themes (`dark` class on `<html>`, persisted by next-themes itself).
- **Palette** (the style): which colours fill the tokens. `data-palette` on `<html>`, set by `components/layout/palette-applier.tsx` from the preferences store. Registry in `lib/themes.ts` (`PALETTES`); the first and default is `sunny` (yellow + deep blue).

Adding a style: one `PALETTES` entry (id, label key, two swatches) plus one CSS block per scheme in `globals.css` (`[data-palette='x'] { ... }` and `.dark[data-palette='x'] { ... }`) overriding only the tokens that change. Components never reference a palette; they use tokens, so every screen picks the new style up for free. The appearance card shows the style row automatically once a second palette exists.

## Shell

- `components/layout/app-shell.tsx`: one sticky top bar on every width (logo tile + name, section links from `md`, theme toggle). On phones the sections move to a fixed bottom bar (`--h-bottomnav` keeps content clear of it; the active section is a filled ink pill).
- Sections come from `lib/navigation.ts` (`NAV_ITEMS`); group-level tabs are rendered inside the group page, not in the shell.
- The logo (`components/layout/app-logo.tsx`) and `app/icon.svg` are the same drawing: two friends on a yellow tile.

## Patterns

- `PageHeader` (title, subtitle, optional action slot on the right).
- `EmptyState` (icon on a yellow tile, title, description, optional action). Every list has one.
- Cards: `Card` with `CardHeader` (title + description) and `CardContent`. Settings are a 2-column grid of cards from `md`.
- Choices with 2–3 options are pill radios (see `appearance-card.tsx`), not selects.
- Forms: `Field` (label, help, error, `aria-describedby` wired), `FormMessage` (inline error or success under the form; no toasts yet), controlled `FormState` + derived `canSave`. See `components/auth/*` and `components/settings/*`.
- People: `Avatar` (an icon on a coloured tile, 32 keys in `lib/avatars.ts`: Lucide plus four drawn in `components/icons/avatar-extras.tsx`; or a generated face on a tile of the same colours, picked by its seed) and `AvatarPicker` (a style row: the icons as pages of sixteen that swipe, or twelve faces of one DiceBear style with a button for others). Generated faces come from the app's own route `app/avatars/[style]/[seed]` as cached SVGs, so no artwork ships in the bundle. Never an image upload.
- Signed-out pages use `PublicShell` (one centred card under the logo); signed-in pages sit in `AppShell` behind `AuthGate`.
- Toasts (task 42) sit above everything via `--z-toast`.

## Do / don't

- Do keep most of a screen neutral so the yellow means something.
- Do use `text-ink` for headings and `text-muted-foreground` for help text; nothing else.
- Don't use yellow text, gradients, shadows heavier than `shadow-sm`, or more than one filled button per view.
- Don't hand-edit `components/ui/*`; wrap in `components/common/*` instead.
