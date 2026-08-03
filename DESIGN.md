# Forkast design system

<!-- impeccable:design-schema 1 -->

## Direction

Forkast is a calm working kitchen pass: recipes arrive as clean prep tickets,
serving changes are measured adjustments, and ingredients travel to an explicit
store rail. The interface refuses both the lifestyle-recipe scrapbook and the
generic SaaS card dashboard. It should still read as an ordinary, dependable
tool within seconds.

The physical scene forces a light-first system: the app is most often used in a
bright grocery aisle, beside a stove, or on an iPhone outdoors. High contrast and
low glare come first, and the light theme is the one the system is designed in.

A dark theme exists alongside it, because the other half of the scene is a phone
held in a dim kitchen at night. It is the same pass with the lights down, not a
second design: every token keeps its meaning, so component rules are written
once. Appearance follows the device unless the reader chooses light or dark in
Settings, and the choice is per device rather than per household.

## Visual world

- **Material:** white and cool-paper surfaces, ink-dark type, graphite rules,
  and one food-safe green accent. A warm yellow marks pending/offline state;
  brick red is reserved for errors and destructive confirmation.
- **Composition:** a strong work surface with narrow perimeter rails. Content
  groups are separated by spacing and hairline rules, not floating card grids.
  Recipe and grocery rows resemble precise kitchen tickets without fake paper
  texture, torn edges, or nostalgia.
- **Geometry:** corners are clipped or gently squared (4–10px). Pills are only
  used for compact status, counts, and store choices. Touch targets are at least
  44px and primary actions remain reachable by one thumb on narrow screens.
- **Iconography:** simple, consistent outline icons with visible text labels for
  navigation and consequential actions. The fork mark is geometric and quiet,
  never mascot-like.

## Color tokens

Day:

- Canvas `#f4f3ee`; primary surface `#ffffff`; secondary rail `#e9ebe5`.
- Ink `#18201c`; muted ink `#58625d`; hairline `#c9cec8`.
- Action green `#176b4d`; action hover `#11543c`; soft selected `#dcebe3`.
- Pending `#8a5a00` on `#fff1c7`; danger `#a3382b` on `#fbe4df`.
- Focus uses a 3px outer ring derived from action green and never relies on a
  color change alone.

Night, stamped as `:root[data-theme="dark"]`:

- Canvas `#131714`; primary surface `#1c211d`; secondary rail `#0e110f`.
- Ink `#eaeee9`; muted ink `#9aa39d`; hairline `#333b36`.
- Action green `#4fbc91`; action hover `#6bd0a7`; soft selected `#1b3d30`.
- Pending `#f2c96b` on `#33290f`; danger `#f0938a` on `#3a1e1a`.

Under low light the food-safe green stops working as a dark fill and becomes a
light one, so type on a filled action control is the `--on-action` token rather
than a literal white: `#ffffff` by day, `#0b1a14` by night. The same rule covers
the inverted undo banner through `--inverse-surface` and `--on-inverse`. Never
write a color literal in a component rule; if a value has no token, add one to
both themes.

## Typography

Use the native system sans stack for instant, resilient rendering. UI labels,
body copy, and recipe instructions use the same workhorse family; quantities
and timings use tabular numerals. The fixed rem scale is compact and legible:
0.8125, 0.9375, 1, 1.125, 1.375, 1.75, and 2.25rem. Headings are sentence case,
not tracked uppercase. Reading measures stay near 68ch.

## Components and states

- The desktop shell uses a slim left work rail; mobile uses a safe-area-aware
  bottom rail ordered Recipes, Shopping, Import, Settings.
- Buttons share one clipped vocabulary: solid action, neutral outline, quiet
  text, and isolated danger. Loading preserves the label and adds state text.
- Fields use visible labels, generous hit areas, persistent helper/error copy,
  and no placeholder-only instructions.
- Lists are rows with check controls, quantities, secondary metadata, and a
  clearly separated trailing action. Checked groceries remain legible and move
  to an explicit completed section.
- Skeletons preserve layout. Empty states explain the first useful action.
  Offline, syncing, success, warning, and error states pair words with icons.
- Motion lasts 150–220ms and only explains a row moving, a panel opening, or a
  saved state settling. Reduced motion removes transforms and transitions.

## Responsive and accessibility rules

At narrow widths, one primary task fills the viewport and secondary controls
collapse behind labeled disclosures. Fixed action bars respect iOS safe areas
and never cover content. At desktop widths, recipe content may use a restrained
two-column mise-en-place layout; forms retain readable widths. All controls have
visible keyboard focus, semantic names, sufficient contrast, and resilient text
wrapping at 200% zoom. Store, sync, and checked states never rely on color alone.

## Content and imagery

Recipe photography comes only from the saved source URL and must fail into a
quiet, useful placeholder. Development examples are clearly synthetic. Copy is
direct and operational: name the problem, preserve the user's work, and offer
the next recovery action. Do not add hype, streaks, guilt, or invented proof.
